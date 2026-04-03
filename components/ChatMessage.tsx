import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, Role, Plan } from '../types';
import { Icons } from '../constants';
import ThoughtProcess from './ThoughtProcess';
import { getFileUrl, ApiError } from '../services/apiService';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: (id: string) => void;
  onImageClick?: (url: string) => void;
}

const FileAttachment: React.FC<{ filePath: string; onImageClick?: (url: string) => void }> = ({ filePath, onImageClick }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fileName = filePath.split('/').pop() || filePath;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        setLoading(true);
        const objectUrl = await getFileUrl(filePath);
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
  }, [filePath]);

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
    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group max-w-sm mt-2">
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0">
          <Icons.File className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
          <span className="text-xs text-gray-400">点击下载</span>
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
  let thought = message.thought || null;
  let logs: any[] = message.logs || [];
  let cleanText = message.text;
  let duration = null;

  // Fallback to parsing from text if structured data is missing
  if (!thought) {
    const thoughtMatch = message.text.match(/<thought duration="(\d+)">([\s\S]*?)<\/thought>/);
    if (thoughtMatch) {
      thought = thoughtMatch[2];
      duration = parseInt(thoughtMatch[1]);
      
      // Parse logs from thought content
      const logRegex = /<log type="(tool_call|tool_output)" message="([^"]*)"(?: status="(success|error)")? \/>/g;
      let match;
      while ((match = logRegex.exec(thought)) !== null) {
          logs.push({
              type: match[1],
              message: match[2],
              status: match[3]
          });
      }
      cleanText = message.text.replace(/<thought duration="\d+">[\s\S]*?<\/thought>/, '');
      thought = thought.replace(/<log[^>]*\/>/g, '').trim();
    }
  }
  
  const cleanThought = thought || '';

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
          {!isUser && (thought || logs.length > 0 || message.plan) && (
            <ThoughtProcess 
              thought={cleanThought} 
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {cleanText}
                </ReactMarkdown>
                {/* File Attachments */}
                {message.files && message.files.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">生成的文件</div>
                    <div className="grid grid-cols-1 gap-2">
                      {message.files.map((file, index) => (
                        <FileAttachment key={index} filePath={file} onImageClick={onImageClick} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Blinking Cursor for streaming */}
                {message.isStreaming && (
                   <span className="cursor-blink"></span>
                )}
              </div>
            )}
            
            {/* Fallback height for empty bubble */}
            {!message.text && (!message.files || message.files.length === 0) && !showThinking && <div className="h-4"></div>}
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