import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Role, Plan } from '../types';
import { Icons } from '../constants';
import ThoughtProcess from './ThoughtProcess';
import { getFileUrl, ApiError, createAnalyProject } from '../services/apiService';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: (id: string) => void;
  onImageClick?: (url: string) => void;
}

const FileAttachment: React.FC<{ filePath: string; onImageClick?: (url: string) => void }> = ({ filePath, onImageClick }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  let pathStr = typeof filePath === 'string' ? filePath : JSON.stringify(filePath);
  
  // Try to parse if it's a JSON string object that slipped through
  if (pathStr.startsWith('{')) {
    try {
      const obj = JSON.parse(pathStr);
      pathStr = obj.path || obj.url || obj.file || pathStr;
    } catch (e) {}
  }

  const fileName = pathStr.split('/').pop() || pathStr;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isDataFile = /\.(csv|xlsx|xls)$/i.test(fileName);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        setLoading(true);
        const objectUrl = await getFileUrl(pathStr);
        setUrl(objectUrl);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
           window.dispatchEvent(new CustomEvent('open-token-modal'));
        }
        setError("Failed to load file");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pathStr]);

  const handleImport = async () => {
    if (!url) return;
    try {
      setImporting(true);
      const res = await fetch(url);
      const blob = await res.blob();
      
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (fileName.endsWith('.csv')) mimeType = 'text/csv';
        else if (fileName.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (fileName.endsWith('.xls')) mimeType = 'application/vnd.ms-excel';
        else mimeType = 'application/octet-stream';
      }
      
      const fileObj = new File([blob], fileName, { type: mimeType });
      
      const projectName = fileName.replace(/\.[^/.]+$/, "");
      
      await createAnalyProject(projectName, fileObj);
      toast.success('导入分析项目成功！');
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 401) {
        window.dispatchEvent(new CustomEvent('open-token-modal'));
      } else {
        console.error(err);
        toast.error('导入分析项目失败: ' + err.message);
      }
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500 animate-pulse">
        <Icons.File className="w-4 h-4" />
        <span>Loading {fileName}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-100 text-sm text-red-500">
        <Icons.AlertCircle className="w-4 h-4" />
        <span>Error loading {fileName}</span>
      </div>
    );
  }

  if (isImage && url) {
    return (
      <div className="mt-2 mb-2">
        <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-sm cursor-zoom-in">
           <img 
             src={url} 
             alt={fileName} 
             className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105" 
             onClick={() => onImageClick?.(url)}
           />
           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <div className="p-2 bg-white/90 rounded-full shadow-lg text-gray-700 flex items-center space-x-1 px-3">
                <Icons.Maximize className="w-4 h-4" />
                <span className="text-xs font-medium">点击预览</span>
              </div>
           </div>
           
           {/* Download Overlay Button */}
           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a 
                href={url} 
                download={fileName}
                onClick={e => e.stopPropagation()}
                className="p-2 bg-white/90 rounded-lg shadow-md hover:bg-white text-gray-700 transition-all hover:scale-110 pointer-events-auto"
                title="下载图片"
              >
                <Icons.Download className="w-4 h-4" />
              </a>
           </div>
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate max-w-sm">{fileName}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group max-w-sm mt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
            <Icons.File className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
            <span className="text-xs text-gray-400">点击右侧下载</span>
          </div>
        </div>
        {url && (
          <a 
            href={url} 
            download={fileName}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Icons.Download className="w-4 h-4" />
          </a>
        )}
      </div>
      
      {isDataFile && url && (
        <button 
          onClick={handleImport}
          disabled={importing}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {importing ? (
            <>
              <Icons.Sparkles className="w-4 h-4 animate-spin hidden" /> {/* Placeholder if no spinner icon exists */}
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              导入中...
            </>
          ) : (
            <>
              <Icons.Database className="w-4 h-4" />
              导入数据分析
            </>
          )}
        </button>
      )}
    </div>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onRegenerate, onImageClick }) => {
  const isUser = message.role === Role.USER;
  const showThinking = !isUser && message.isStreaming && !message.text;
  
  const [isCopied, setIsCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(prev => prev === type ? null : type);
  };

  // Parse thought process
  let logs: any[] = message.logs ? [...message.logs] : [];
  let cleanText = message.text;
  let duration = null;

  // Extract <thought> or <think> tags from cleanText to prevent them from rendering in the main bubble
  const thoughtMatch = cleanText.match(/<(?:thought|think)(?: duration="(\d+)")?>([\s\S]*?)(?:<\/(?:thought|think)>|$)/);
  if (thoughtMatch) {
      if (logs.length === 0) {
          const rawThoughtContent = thoughtMatch[2];
          duration = thoughtMatch[1] ? parseInt(thoughtMatch[1]) : 0;
          
          // Split by <log ... /> tags
          const logRegex = /<log type="(tool_call|tool_output)" message="([^"]*)"(?: status="(success|error)")? \/>/g;
          let lastIndex = 0;
          let match;
          
          while ((match = logRegex.exec(rawThoughtContent)) !== null) {
              // Add preceding thought text if any
              const textBefore = rawThoughtContent.substring(lastIndex, match.index).trim();
              if (textBefore) {
                  logs.push({ type: 'thought', message: textBefore });
              }
              
              // Add the log entry
              logs.push({
                  type: match[1],
                  message: match[2],
                  status: match[3]
              });
              
              lastIndex = logRegex.lastIndex;
          }
          
          // Add remaining thought text if any
          const textAfter = rawThoughtContent.substring(lastIndex).trim();
          if (textAfter) {
              logs.push({ type: 'thought', message: textAfter });
          }
      }
  }
  
  // Always remove the thought/think tag from cleanText so it doesn't render at the bottom
  cleanText = cleanText.replace(/<(?:thought|think)(?: duration="\d+")?>[\s\S]*?(?:<\/(?:thought|think)>|$)/g, '');
  // Also remove any stray <think> tags that might be returned by the API directly
  cleanText = cleanText.replace(/<\/?think>/g, '');

  // If we have an answer, filter out thoughts that are duplicates of the answer
  let shouldShowAnswer = !!message.answer;
  if (message.answer) {
      const answerText = message.answer.replace(/<\/?think>/g, '').trim();
      if (answerText.length > 0) {
          const normalize = (s: string) => s.replace(/\s+/g, '');
          const normAnswer = normalize(answerText);
          
          for (let i = logs.length - 1; i >= 0; i--) {
              if (logs[i].type === 'thought') {
                  const thoughtText = logs[i].message.replace(/<\/?think>/g, '').trim();
                  const normThought = normalize(thoughtText);
                  
                  if (normThought && (
                      normThought === normAnswer || 
                      normAnswer.includes(normThought) || 
                      normThought.includes(normAnswer)
                  )) {
                      if (message.isStreaming) {
                          // During streaming, keep the thought and hide the answer to avoid duplication
                          shouldShowAnswer = false;
                      } else {
                          // When finished, remove the duplicate thought
                          logs.splice(i, 1);
                      }
                  }
              }
          }
      }
  }

  return (
    <div className={`flex w-full mb-8 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex ${isUser ? 'max-w-[85%] sm:max-w-[80%] flex-row-reverse' : 'w-full flex-col items-start'}`}>
        
        {/* AI Header (Avatar + Name) */}
        {!isUser && (
          <div className="flex items-center space-x-2 mb-3 ml-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm bg-white border border-gray-100 ring-2 ring-gray-50">
              <div className="w-4 h-4 flex items-center justify-center">
                 <Icons.YanfuLogo />
              </div>
            </div>
            <span className="text-sm font-medium text-gray-700">言复智能</span>
          </div>
        )}

        {/* User Avatar */}
        {isUser && (
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm transition-transform hover:scale-105 ml-3 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <Icons.User />
          </div>
        )}

        {/* Content Column */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1 w-full`}>
          
          {/* Thinking Indicator (Only when empty and streaming) */}
          {showThinking && (
            <div className="flex items-center space-x-2 mb-2 px-1 animate-pulse">
               <div className="text-blue-500">
                  <Icons.Sparkles />
               </div>
               <span className="text-xs font-medium text-blue-500">思考中...</span>
            </div>
          )}

          {/* Thought Process (Includes Planning & Logs) */}
          {!isUser && (logs.length > 0 || message.plan) && (
            <ThoughtProcess 
              logs={logs} 
              duration={duration!} 
              plan={message.plan} 
              isStreaming={message.isStreaming}
            />
          )}

          {/* Message Bubble */}
          <div className={`px-5 py-4 rounded-2xl shadow-sm overflow-hidden ${
            isUser 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm' // Gradient for user
              : 'bg-white border border-gray-100 rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.02)] w-full' // Clean white look for model
          }`}>
            {isUser ? (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed tracking-wide">
                {message.text}
              </div>
            ) : (
              <div className="markdown-body">
                {/* Main Text Content (if any, excluding answer) */}
                {cleanText && cleanText !== message.answer && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanText}
                  </ReactMarkdown>
                )}
                
                {/* File Attachments */}
                {message.files && message.files.length > 0 && (
                  <div className={(cleanText && cleanText !== message.answer) ? "mt-4 space-y-2 border-t border-gray-100 pt-3" : "space-y-2"}>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">生成的文件</div>
                    <div className="grid grid-cols-1 gap-2">
                      {message.files.map((file, index) => (
                        <FileAttachment key={index} filePath={file} onImageClick={onImageClick} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Content */}
                {shouldShowAnswer && (
                  <div className={((cleanText && cleanText !== message.answer) || (message.files && message.files.length > 0)) ? "mt-4 border-t border-gray-100 pt-3" : ""}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.answer!.replace(/<\/?think>/g, '')}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Blinking Cursor for streaming */}
                {message.isStreaming && (
                   <span className="cursor-blink"></span>
                )}
              </div>
            )}
            
            {/* Fallback height for empty bubble */}
            {!message.text && !shouldShowAnswer && (!message.files || message.files.length === 0) && !showThinking && <div className="h-4"></div>}
          </div>

          {/* Action Bar (Only for Model, Not Streaming) */}
          {!isUser && !message.isStreaming && (
             <div className="flex items-center space-x-1 mt-2 ml-1 select-none animate-fade-in opacity-0 hover:opacity-100 transition-opacity duration-200">
                
                {/* Copy Button */}
                <button 
                  onClick={handleCopy}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1 group"
                  title="复制内容"
                >
                  {isCopied ? <span className="text-green-500"><Icons.Check /></span> : <Icons.Copy />}
                </button>

                {/* Regenerate Button */}
                {onRegenerate && (
                  <button 
                    onClick={() => onRegenerate(message.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                    title="重新回答"
                  >
                    <Icons.Refresh />
                  </button>
                )}

                <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>

                {/* Thumbs Up */}
                <button 
                  onClick={() => handleFeedback('up')}
                  className={`p-1.5 rounded-lg transition-colors ${
                     feedback === 'up' 
                     ? 'text-orange-500 bg-orange-50' 
                     : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="赞同"
                >
                  <Icons.ThumbsUp />
                </button>

                {/* Thumbs Down */}
                <button 
                  onClick={() => handleFeedback('down')}
                  className={`p-1.5 rounded-lg transition-colors ${
                     feedback === 'down' 
                     ? 'text-gray-700 bg-gray-100' 
                     : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                  title="反对"
                >
                  <Icons.ThumbsDown />
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;