import React, { useState } from 'react';
import { Icons } from '../constants';
import { LogEntry, Plan } from '../types';

interface ThoughtProcessProps {
  logs: LogEntry[];
  duration: number;
  plan?: Plan;
  isStreaming?: boolean;
}

const CompactEventItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  if (log.type === 'thought') {
    const cleanMessage = log.message.replace(/<\/?think>/g, '').trim();
    if (!cleanMessage) return null;
    
    return (
      <div className="px-3 py-2 hover:bg-gray-50/50">
        <div 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Icons.Lightbulb className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
          <span className="text-gray-500 text-xs font-medium">思考</span>
          <span className="text-gray-400 text-xs truncate flex-1">{cleanMessage.substring(0, 50)}{cleanMessage.length > 50 ? '...' : ''}</span>
          {expanded ? <Icons.ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <Icons.ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        </div>
        {expanded && (
          <div className="mt-2 ml-5 p-2 bg-gray-50 rounded text-xs max-h-60 overflow-y-auto custom-scrollbar">
            <div className="text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
              {cleanMessage}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (log.type === 'tool_call') {
    return (
      <div className="px-3 py-2 hover:bg-gray-50/50">
        <div 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Icons.Wrench className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-gray-500 text-xs">调用工具</span>
          <span className="text-blue-600 text-xs font-medium truncate flex-1">{log.message}</span>
          {expanded ? <Icons.ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <Icons.ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        </div>
        {expanded && (
          <div className="mt-2 ml-5 p-2 bg-gray-50 rounded text-xs">
            {log.args ? (
              <div>
                <span className="text-gray-400 font-semibold">参数:</span>
                <pre className="text-gray-500 font-mono whitespace-pre-wrap overflow-x-auto mt-1">
                  {typeof log.args === 'string' ? log.args : JSON.stringify(log.args, null, 2)}
                </pre>
              </div>
            ) : (
              <span className="text-gray-400 italic">无参数</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (log.type === 'tool_output') {
    const resultPreview = log.message.length > 80 ? log.message.substring(0, 80) + '...' : log.message;
    return (
      <div className="px-3 py-2 hover:bg-gray-50/50">
        <div 
          onClick={() => setExpanded(!expanded)} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <Icons.CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          <span className="text-gray-500 text-xs">工具返回</span>
          <span className="text-green-600 text-xs truncate flex-1">{resultPreview}</span>
          {expanded ? <Icons.ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" /> : <Icons.ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />}
        </div>
        {expanded && (
          <div className="mt-2 ml-5 p-2 bg-gray-50 rounded text-xs max-h-48 overflow-y-auto custom-scrollbar">
            <pre className="text-gray-500 font-mono whitespace-pre-wrap overflow-x-auto">
              {log.message}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-2 hover:bg-gray-50/50">
      <div className="flex items-center gap-2">
        {log.status === 'error' ? (
          <Icons.AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
        ) : (
          <Icons.CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
        )}
        <span className={`text-xs truncate ${log.status === 'error' ? 'text-red-500' : 'text-gray-600'}`}>
          {log.message}
        </span>
      </div>
    </div>
  );
};

const ThoughtProcess: React.FC<ThoughtProcessProps> = ({ logs, duration, plan, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isPlanExpanded, setIsPlanExpanded] = useState(true);
  const hasLogs = (logs && logs.length > 0) || (plan && plan.plan_id);

  if (!hasLogs) return null;

  // Calculate total count for execution records
  // We count: logs + 1 (for plan creation) + 1 (for the "Execution Steps" group)
  const totalLogsCount = (logs?.length || 0) + (plan ? 2 : 0);

  return (
    <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden bg-gray-50/30 w-full">
      {/* Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-100/50 transition-colors bg-white border-b border-gray-100"
      >
        <div className="flex items-center gap-2 text-gray-600 font-medium text-sm">
          <div className="p-1 rounded bg-gray-50 text-gray-500">
            <Icons.Brain className="w-4 h-4" />
          </div>
          <span>思考过程</span>
          {duration > 0 && <span className="text-xs text-gray-400 font-normal">({(duration / 1000).toFixed(1)}s)</span>}
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && !isOpen && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          )}
          {isOpen ? <Icons.ChevronUp className="w-4 h-4 text-gray-400" /> : <Icons.ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-2 space-y-2 bg-gray-50/30">
          {/* Execution Record */}
          {hasLogs && (
            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden text-sm">
              <div className="px-3 py-2 flex items-center gap-2 bg-gray-50/50 border-b border-gray-100">
                <Icons.List className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-600 font-medium text-xs uppercase tracking-wider">执行记录</span>
                <span className="text-xs text-gray-400">({totalLogsCount})</span>
              </div>
              <div className="divide-y divide-gray-100">
                {/* Plan Creation Entry */}
                {plan && (
                  <div className="px-3 py-2 hover:bg-gray-50/50 flex items-center gap-2">
                    <Icons.Clipboard className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-600 text-xs">创建计划</span>
                    <span className="text-blue-600 text-xs font-medium truncate flex-1">{plan.title || '正在制定计划...'}</span>
                  </div>
                )}

                {/* Plan Steps Group */}
                {plan && (
                  <div>
                    <div 
                      onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                      className="px-3 py-2 hover:bg-gray-50/50 flex items-center gap-2 cursor-pointer group"
                    >
                      <Icons.Play className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      <span className="text-gray-600 text-xs">执行步骤</span>
                      <span className="text-purple-600 text-xs font-medium flex-1">
                        {isPlanExpanded ? '收起详情' : `查看详情 (${plan.steps.length} 步)`}
                      </span>
                      {isPlanExpanded ? (
                        <Icons.ChevronUp className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                      ) : (
                        <Icons.ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                      )}
                    </div>
                    
                    {isPlanExpanded && (
                      <div className="bg-gray-50/30 border-t border-gray-100/50 py-1">
                        {plan.steps.map((step, idx) => (
                          <div key={idx} className="px-3 py-1.5 pl-8 flex items-start gap-3 hover:bg-gray-100/30 transition-colors">
                            <div className="flex flex-col items-center mt-1">
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                step.status === 'completed' ? 'bg-green-100 text-green-600' : 
                                step.status === 'in_progress' ? 'bg-purple-100 text-purple-600 animate-pulse' : 
                                'bg-gray-100 text-gray-400'
                              }`}>
                                {step.status === 'completed' ? <Icons.Check className="w-2.5 h-2.5" /> : idx + 1}
                              </div>
                              {idx < plan.steps.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-100 mt-1 min-h-[8px]"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-2">
                                <p className={`text-xs leading-relaxed ${
                                  step.status === 'completed' ? 'text-gray-400' : 
                                  step.status === 'in_progress' ? 'text-gray-700 font-medium' : 
                                  'text-gray-500'
                                }`}>
                                  {step.text}
                                </p>
                                {step.status === 'in_progress' && (
                                  <span className="flex h-1.5 w-1.5 relative flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Other Logs */}
                {logs.map((log, index) => (
                  <CompactEventItem key={index} log={log} />
                ))}

                {/* Loading Indicator */}
                {isStreaming && (
                  <div className="px-3 py-2 flex items-center gap-2 animate-pulse">
                    <Icons.Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span className="text-gray-400 text-xs italic">正在处理中...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThoughtProcess;
