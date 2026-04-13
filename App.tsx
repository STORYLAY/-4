"use client";
import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import OnboardingTour from './components/OnboardingTour';
import { streamChatResponse } from './services/geminiService';
import { fetchConversations, fetchConversationDetail, runThinkingMode, runPlanningMode, fetchModelTypes, fetchAppsUsage, fetchExploreApps, fetchSkills, ApiError, deleteConversation, renameConversation, uploadFile } from './services/apiService';
import { Message, Role, HistoryItem, AppShortcut } from './types';
import { Icons, INPUT_CHIPS } from './constants';

const AppContent: React.FC = () => {
  // History State
  const [pinnedHistory, setPinnedHistory] = useState<HistoryItem[]>([]);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const isLoadingHistoryRef = useRef(false);
  const [recentApps, setRecentApps] = useState<AppShortcut[]>([]);

  // Token Management
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);

  // Chat Management State
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatStore, setChatStore] = useState<Record<string, Message[]>>({});

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [agentMode, setAgentMode] = useState<'single' | 'multi'>('single');
  const [uploadedFiles, setUploadedFiles] = useState<{id: string, name: string}[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('知识库专家');
  const [modelTypes, setModelTypes] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // App Mention State
  const [showAppMention, setShowAppMention] = useState(false);
  const [showAgentMention, setShowAgentMention] = useState(false);
  const [showSkillMention, setShowSkillMention] = useState(false);
  const [exploreApps, setExploreApps] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<any[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const isLoadingSkillsRef = useRef(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [agentMentionFilter, setAgentMentionFilter] = useState('');
  const [skillMentionFilter, setSkillMentionFilter] = useState('');
  const [hoveredSkill, setHoveredSkill] = useState<any | null>(null);
  const skillHoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [mentionPosition, setMentionPosition] = useState<'top' | 'bottom'>('top');
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  
  // Abort Controller for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevMessagesLengthRef = useRef(0);

  useEffect(() => {
    const loadModelTypes = async () => {
      try {
        const data = await fetchModelTypes('chat');
        setModelTypes(data.data);
        if (data.data.length > 0 && data.data[0].models.length > 0) {
          setSelectedModel(data.data[0].models[0].model);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          alert('请配置 console_token');
        } else {
          console.error(error);
        }
      }
    };
    loadModelTypes();
  }, []);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);
  const baseTextRef = useRef(''); // Text before the current session started
  const currentInputTextRef = useRef(inputText);

  useEffect(() => {
    currentInputTextRef.current = inputText;
  }, [inputText]);

  // Features State (Style & Templates)
  const [activePopup, setActivePopup] = useState<'style' | 'template' | 'model' | 'agent' | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('默认风格');

  // Constants for Features
  const STYLES = ['默认风格', '专业严谨', '幽默风趣', '简洁明了'];
  const TEMPLATES = [
      { title: '周报生成', content: '请根据以下工作内容帮我写一份周报：\n1. ', icon: <Icons.FileText /> },
      { title: '邮件润色', content: '请帮我用专业的语气润色这封邮件：\n', icon: <Icons.Mail /> },
      { title: '代码解释', content: '请解释这段代码的运行逻辑：\n', icon: <Icons.Code /> },
  ];

  // Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const agentMentionDropdownRef = useRef<HTMLDivElement>(null);
  const skillMentionDropdownRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Click outside to close mention dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showAppMention &&
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAppMention(false);
      }
      if (
        showAgentMention &&
        agentMentionDropdownRef.current &&
        !agentMentionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAgentMention(false);
      }
      if (
        showSkillMention &&
        skillMentionDropdownRef.current &&
        !skillMentionDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSkillMention(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAppMention, showAgentMention, showSkillMention]);

  const isWelcomeMode = messages.length === 0;

  const loadConversations = async (page = 1) => {
    if (isLoadingHistoryRef.current || (!hasMoreHistory && page > 1)) return;
    setIsLoadingHistory(true);
    isLoadingHistoryRef.current = true;
    try {
      const data = await fetchConversations(page, 20);
      if (page === 1) {
        setRecentHistory(data.items);
      } else {
        setRecentHistory(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = data.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
      setHistoryPage(page);
      setHasMoreHistory(data.items.length === 20);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error("Failed to load conversations:", error);
      }
    } finally {
      setIsLoadingHistory(false);
      isLoadingHistoryRef.current = false;
    }
  };

  const handleLoadMoreHistory = () => {
    if (hasMoreHistory && !isLoadingHistoryRef.current) {
      loadConversations(historyPage + 1);
    }
  };

  const loadSkills = async () => {
    if (isLoadingSkillsRef.current) return;
    
    setIsLoadingSkills(true);
    isLoadingSkillsRef.current = true;
    try {
      const response: any = await fetchSkills();
      const items = response.data || [];
      
      setSkills(items);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error("Failed to load skills:", error);
      }
    } finally {
      setIsLoadingSkills(false);
      isLoadingSkillsRef.current = false;
    }
  };

  // Fetch Conversations on Mount
  useEffect(() => {
    const loadRecentApps = async () => {
      try {
        const response: any = await fetchAppsUsage();
        // Handle both array response, object with items property, and object with data property
        const items = Array.isArray(response) ? response : (response.data || response.items || []);

        if (items.length > 0) {
          const filteredItems = items.filter((item: any) => {
            const name = (item.app?.name || item.name || '').toLowerCase();
            return !name.includes('知识图谱') && !name.includes('会议纪要');
          });

          const mappedApps: AppShortcut[] = filteredItems.map((item: any, index: number) => {
             const appData = item.app || item; // Fallback to item if app property doesn't exist
             
             // Map icon string to component if possible, otherwise default
             let IconComponent = Icons.Layout;
             if (appData.icon && (Icons as any)[appData.icon]) {
                IconComponent = (Icons as any)[appData.icon];
             }
             
             // Generate a deterministic color based on index
             const colors = [
               'bg-blue-50 text-blue-600',
               'bg-green-50 text-green-600',
               'bg-purple-50 text-purple-600',
               'bg-orange-50 text-orange-600',
               'bg-pink-50 text-pink-600',
               'bg-indigo-50 text-indigo-600'
             ];
             const color = appData.color || colors[index % colors.length];

             return {
               id: appData.id || item.id,
               name: appData.name || item.name || '未命名应用',
               description: appData.description || item.description || '智能辅助应用',
               icon: <IconComponent />,
               iconUrl: item.icon_url || appData.icon_url || item.iconUrl || appData.iconUrl,
               url: item.url || appData.url,
               color: color,
               raw: item
             };
          });
          setRecentApps(mappedApps);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setShowTokenPrompt(true);
        } else {
          console.error("Failed to load recent apps:", error);
        }
      }
    };

    const loadExploreApps = async () => {
      try {
        const response: any = await fetchExploreApps();
        const items = Array.isArray(response) ? response : (response.data || response.items || []);
        setExploreApps(items);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setShowTokenPrompt(true);
        } else {
          console.error("Failed to load explore apps:", error);
        }
      }
    };

    loadConversations();
    loadRecentApps();
    loadExploreApps();
    loadSkills();
  }, []);

  const handleTokenSubmit = (token: string) => {
    if (token.trim()) {
      localStorage.setItem('console_token', token.trim());
      setShowTokenPrompt(false);
      // Reload page or re-fetch
      window.location.reload();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    // If we are more than 200px from the bottom, show the button
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const lastMessage = messages[messages.length - 1];
    
    // 1. Always scroll when a new message is added (User sent or Model started)
    if (isNewMessage) {
      scrollToBottom();
    } 
    // 2. Only auto-scroll during streaming if we have actual response text
    // This satisfies the request: "Thinking process don't move, don't auto scroll down"
    else if (lastMessage && lastMessage.role === Role.MODEL && lastMessage.isStreaming && lastMessage.text) {
      scrollToBottom();
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  // Sync current messages to store whenever they change, if we have a valid chat ID
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      setChatStore(prev => ({
        ...prev,
        [currentChatId]: messages
      }));
    }
  }, [messages, currentChatId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  // Calculate mention dropdown position
  useEffect(() => {
    if ((showAppMention || showAgentMention) && textareaRef.current) {
      const rect = textareaRef.current.getBoundingClientRect();
      // If there's less than 300px below the textarea, show it on top
      if (window.innerHeight - rect.bottom < 300) {
        setMentionPosition('top');
      } else {
        setMentionPosition('bottom');
      }
    }
  }, [showAppMention, showAgentMention, inputText]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;
      
      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let sessionTranscript = '';
        
        for (let i = 0; i < event.results.length; ++i) {
          sessionTranscript += event.results[i][0].transcript;
        }
        
        // Update UI: Base (previous sessions) + Current Session Transcript
        const newText = baseTextRef.current + sessionTranscript;
        setInputText(newText);
        currentInputTextRef.current = newText;
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        
        // Ignore 'no-speech' as it's common during pauses and we want to keep listening
        if (event.error === 'no-speech') return;
        
        if (['not-allowed', 'service-not-allowed', 'network', 'audio-capture'].includes(event.error)) {
          shouldListenRef.current = false;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (shouldListenRef.current) {
          // CRITICAL: When restarting, commit whatever we had so far as the new base
          // This prevents losing interim results if the session ends prematurely
          baseTextRef.current = currentInputTextRef.current;
          
          // Use a small timeout to allow the browser to fully clean up the previous session
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
              } catch(e: any) {
                // If it's already started or in a transition state, we can ignore the error
                if (e.name !== 'InvalidStateError') {
                  console.error("Failed to restart speech recognition:", e);
                  setIsListening(false);
                  shouldListenRef.current = false;
                }
              }
            }
          }, 100);
        } else {
          setIsListening(false);
          baseTextRef.current = '';
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleVoiceInput = () => {
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      return;
    }

    if (!recognitionRef.current) {
      alert("您的浏览器不支持语音输入，请使用 Chrome, Edge 或 Safari 浏览器。");
      return;
    }

    try {
      shouldListenRef.current = true;
      baseTextRef.current = inputText;
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        // If it's already running, we don't need to do anything
        console.warn("Speech recognition already running");
      } else {
        console.error("Failed to start speech recognition:", e);
        shouldListenRef.current = false;
        setIsListening(false);
      }
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const executeStream = async (prompt: string, history: Message[], modelMsgId: string, activeChatId: string) => {
    abortControllerRef.current = new AbortController();
    let currentActiveChatId = activeChatId;
    let isLocalId = currentActiveChatId.startsWith('local-');
    try {
      // Create history for API (exclude the last placeholder model message)
      const apiHistory = history.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Append style instruction if not default
      let finalPrompt = prompt;
      if (selectedStyle !== '默认风格') {
        finalPrompt = `[系统指令：请使用${selectedStyle}的语气回答] ${prompt}`;
      }

      // Find provider for selected model
      const selectedProvider = modelTypes.find(p => p.models.some(m => m.model === selectedModel))?.provider || "tongyi";

      const modelConfig = {
        api_type: selectedProvider,
        model: selectedModel,
        max_tokens: 90000,
        temperature: 0.7
      };

      let response;
      const fileIds = uploadedFiles.map(f => f.id);
      const skillIds = selectedSkills.map(s => s.id);
      const apiConversationId = isLocalId ? undefined : currentActiveChatId;
      if (agentMode === 'single') {
        response = await runThinkingMode(finalPrompt, selectedAgent, modelConfig, abortControllerRef.current.signal, fileIds, apiConversationId, skillIds);
      } else {
        response = await runPlanningMode(finalPrompt, ["综合专家", "知识库专家", "数据库专家"], modelConfig, abortControllerRef.current.signal, fileIds, apiConversationId, skillIds);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || abortControllerRef.current?.signal.aborted) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
            if (abortControllerRef.current?.signal.aborted) break;
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith(':')) continue;
            
            if (trimmedLine.startsWith('data: ')) {
                const jsonStr = trimmedLine.slice(6);
                if (jsonStr === '[DONE]') continue;
                
                try {
                    const event = JSON.parse(jsonStr);
                    
                    const newConvId = event.data?.conversation_id || event.conversation_id;
                    if (newConvId && isLocalId) {
                        const oldChatId = currentActiveChatId;
                        setCurrentChatId(prevId => {
                            if (prevId === oldChatId) {
                                return newConvId;
                            }
                            return prevId;
                        });
                        setRecentHistory(prevHistory => prevHistory.map(item => 
                            item.id === oldChatId ? { ...item, id: newConvId } : item
                        ));
                        setChatStore(prevStore => {
                            const storeCopy = { ...prevStore };
                            if (storeCopy[oldChatId]) {
                                storeCopy[newConvId] = storeCopy[oldChatId];
                                delete storeCopy[oldChatId];
                            }
                            return storeCopy;
                        });
                        currentActiveChatId = newConvId;
                        isLocalId = false;
                    }

                    setMessages(prev => {
                        return prev.map(msg => {
                            if (msg.id !== modelMsgId) return msg;
                            
                            const newMsg = { ...msg };
                            if (!newMsg.logs) newMsg.logs = [];
                            if (!newMsg.thought) newMsg.thought = "";

                            if (event.type === 'thought' && event.data?.content) {
                                newMsg.thought += event.data.content;
                            } else if (event.type === 'tool_call') {
                                newMsg.logs = [...newMsg.logs, {
                                    type: 'tool_call',
                                    message: event.data?.tool_name || 'Unknown Tool',
                                    status: 'success',
                                    args: event.data?.arguments
                                }];
                            } else if (event.type === 'tool_result') {
                                newMsg.logs = [...newMsg.logs, {
                                    type: 'tool_output',
                                    message: event.data?.result || 'No result',
                                    status: 'success'
                                }];
                            } else if (event.type === 'plan_creating') {
                                newMsg.plan = {
                                    plan_id: event.data.plan_id,
                                    title: '正在制定计划...',
                                    steps: []
                                };
                            } else if (event.type === 'plan_created') {
                                newMsg.plan = {
                                    plan_id: event.data.plan_id,
                                    title: event.data.title,
                                    steps: event.data.steps.map((stepText: string, index: number) => ({
                                        index,
                                        text: stepText,
                                        status: 'pending'
                                    }))
                                };
                            } else if (event.type === 'step_start') {
                                if (newMsg.plan) {
                                    newMsg.plan = {
                                        ...newMsg.plan,
                                        steps: newMsg.plan.steps.map(step => 
                                            step.index === event.data.step_index 
                                                ? { ...step, status: 'in_progress', agent_name: event.data.agent_name, text: event.data.step_text || step.text } 
                                                : step
                                        )
                                    };
                                }
                            } else if (event.type === 'step_status') {
                                if (newMsg.plan) {
                                    const statusMap: any = {
                                        'in_progress': 'in_progress',
                                        'completed': 'completed',
                                        'failed': 'failed'
                                    };
                                    newMsg.plan = {
                                        ...newMsg.plan,
                                        steps: newMsg.plan.steps.map(step => 
                                            step.index === event.data.step_index 
                                                ? { ...step, status: statusMap[event.data.status] || step.status } 
                                                : step
                                        )
                                    };
                                }
                            } else if ((event.type === 'response' || event.type === 'delta' || event.type === 'final') && event.data?.content) {
                                newMsg.text += event.data.content;
                            } else if (event.type === 'files' && event.data?.files) {
                                newMsg.files = [...(newMsg.files || []), ...event.data.files];
                            } else if (event.type === 'error') {
                                newMsg.logs = [...newMsg.logs, {
                                    type: 'tool_output',
                                    message: event.data?.content || 'Error',
                                    status: 'error'
                                }];
                            }
                            return newMsg;
                        });
                    });
                } catch (e) {
                    console.error('Error parsing SSE:', e);
                }
            }
        }
      }
    } catch (error) {
       if (error instanceof ApiError && error.status === 401) {
         setShowTokenPrompt(true);
         setMessages(prev => prev.filter(msg => msg.id !== modelMsgId));
       } else if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setMessages(prev => prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, text: "Sorry, I encountered an error. Please check your API Key or Network." } 
              : msg
          ));
       }
    } finally {
      const wasAborted = abortControllerRef.current?.signal.aborted;
      setIsStreaming(false);
      abortControllerRef.current = null;
      setMessages(prev => prev.map(msg => 
        msg.id === modelMsgId 
          ? { 
              ...msg, 
              isStreaming: false,
              text: wasAborted ? msg.text + (msg.text ? "\n\n" : "") + "[回答已停止]" : msg.text
            } 
          : msg
      ));
    }
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && uploadedFiles.length === 0) || isStreaming) return;
    
    // Stop listening if sending
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // Determine Chat ID
    let activeChatId = currentChatId;
    if (!activeChatId) {
      activeChatId = `local-${Date.now()}`;
      setCurrentChatId(activeChatId);
      
      const title = inputText.trim().length > 20 
          ? inputText.trim().substring(0, 20) + '...' 
          : inputText.trim();
      
      const newHistoryItem: HistoryItem = { id: activeChatId, title: title };
      setRecentHistory(prev => [newHistoryItem, ...prev]);
    }

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      role: Role.USER,
      text: inputText.trim()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setUploadedFiles([]);
    setSelectedSkills([]);
    setShowAppMention(false);
    setIsStreaming(true);

    const modelMsgId = (Date.now() + 1).toString();
    const initialModelMessage: Message = {
      id: modelMsgId,
      role: Role.MODEL,
      text: '',
      isStreaming: true
    };
    setMessages(prev => [...prev, initialModelMessage]);

    await executeStream(userMessage.text, newMessages, modelMsgId, activeChatId);
  };

  const handleRegenerate = async (modelMessageId: string) => {
    if (isStreaming) return;

    // Find the index of the model message to regenerate
    const msgIndex = messages.findIndex(m => m.id === modelMessageId);
    if (msgIndex === -1) return;

    // The prompt is the message immediately before the model message
    const previousMsg = messages[msgIndex - 1];
    if (!previousMsg || previousMsg.role !== Role.USER) return;

    // Slice history up to the previous user message (keep user message, remove model message and anything after)
    const newHistory = messages.slice(0, msgIndex);
    
    setMessages(newHistory);
    setIsStreaming(true);

    // Create new model message placeholder
    const newModelMsgId = Date.now().toString();
    const initialModelMessage: Message = {
        id: newModelMsgId,
        role: Role.MODEL,
        text: '',
        isStreaming: true
    };
    setMessages(prev => [...prev, initialModelMessage]);
    
    let activeChatId = currentChatId;
    if (!activeChatId) return; // Should not happen
    
    // Execute stream again using the previous user message text
    await executeStream(previousMsg.text, newHistory, newModelMsgId, activeChatId);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const response = await uploadFile(file);
      if (response && response.id) {
        setUploadedFiles(prev => [...prev, { id: response.id, name: file.name }]);
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error('File upload failed:', error);
        alert('文件上传失败，请重试');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (idToRemove: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== idToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isListening || shouldListenRef.current) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setInputText(value);

    const textBeforeCursor = value.slice(0, cursorPosition);

    // Check for / mention for skills
    const slashMatch = textBeforeCursor.match(/\/([^\/\s]*)$/);
    if (slashMatch) {
      const filterText = slashMatch[1];
      setSkillMentionFilter(filterText);
      setShowSkillMention(true);
      setShowAppMention(false);
      setShowAgentMention(false);
      setMentionCursorPos(cursorPosition);
      return;
    }

    // Check for # mention
    const hashMatch = textBeforeCursor.match(/#([^#\s]*)$/);
    if (hashMatch) {
      const filterText = hashMatch[1];
      setMentionFilter(filterText);
      setShowAppMention(true);
      setShowAgentMention(false);
      setMentionCursorPos(cursorPosition);
      return;
    }

    // Check for @ mention
    if (agentMode !== 'single') {
      const atMatch = textBeforeCursor.match(/@([^@\s]*)$/);
      if (atMatch) {
        const filterText = atMatch[1];
        setAgentMentionFilter(filterText);
        setShowAgentMention(true);
        setShowAppMention(false);
        setMentionCursorPos(cursorPosition);
        return;
      }
    }

    setShowAppMention(false);
    setShowAgentMention(false);
    setShowSkillMention(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showAppMention && e.key === 'Escape') {
      setShowAppMention(false);
    }
    if (showAgentMention && e.key === 'Escape') {
      setShowAgentMention(false);
    }
    if (showSkillMention && e.key === 'Escape') {
      setShowSkillMention(false);
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAppClick = (appOrShortcut: any) => {
    const rawApp = appOrShortcut.raw || appOrShortcut;
    const appData = rawApp.app || rawApp;
    const isCustom = appData.mode === 'custom';
    const resolvedAppId =
      rawApp.recommended_applications_id ||
      rawApp.recommendedApplicationsId ||
      appData.recommended_applications_id ||
      appData.recommendedApplicationsId ||
      appData.id ||
      rawApp.id;
    const isMenu = Boolean(rawApp.is_menu ?? appData.is_menu);
    const menus = rawApp.menus ?? appData.menus;

    if (isCustom && isMenu) {
      if (menus) {
        localStorage.setItem(
          'client_menuInter_tino',
          JSON.stringify({
            menus,
            appId: resolvedAppId,
            appName: appData.name,
          })
        );
        window.location.href = '/client/menuInterTino';
      }
      return;
    }

    if (isCustom) {
      localStorage.setItem('client_url', window.location.pathname);
      const customApp = JSON.parse(JSON.stringify(rawApp));
      customApp.id = resolvedAppId;
      if (!customApp.app) customApp.app = JSON.parse(JSON.stringify(appData));
      localStorage.setItem('current_customApp', JSON.stringify(customApp));
      window.location.href = `/client/custom/${resolvedAppId}`;
      return;
    }
    
    if (appData.url) {
      const new_url = appData.url.split("/");
      
      if (appData.url.includes("calendar")) {
        window.location.href = '/client/calendar';
        return;
      }
      
      const path = `/client/`;
      const url =
        new_url.length > 4
          ? `${new_url[new_url.length - 2]}/${new_url[new_url.length - 1]}`
          : new_url[new_url.length - 1];
      window.location.href = path + url;
    } else {
      const title = appData.name || appData.title || '未命名应用';
      handleSuggestionClick(title);
    }
  };

  const handleAppMentionSelect = (app: any) => {
    setShowAppMention(false);
    
    const textBeforeCursor = inputText.slice(0, mentionCursorPos);
    const textAfterCursor = inputText.slice(mentionCursorPos);
    
    // Remove the #... from input
    const lastHashSymbol = textBeforeCursor.lastIndexOf('#');
    if (lastHashSymbol !== -1) {
      const newInputText = textBeforeCursor.slice(0, lastHashSymbol) + textAfterCursor;
      setInputText(newInputText);
    }

    handleAppClick(app);
  };

  const handleAgentMentionSelect = (agent: any) => {
    setShowAgentMention(false);
    setSelectedAgent(agent.id);
    
    const textBeforeCursor = inputText.slice(0, mentionCursorPos);
    const textAfterCursor = inputText.slice(mentionCursorPos);
    
    // Replace the @... from input with @AgentName
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    if (lastAtSymbol !== -1) {
      const newInputText = textBeforeCursor.slice(0, lastAtSymbol) + `@${agent.name} ` + textAfterCursor;
      setInputText(newInputText);
    }
  };

  const handleSkillMentionSelect = (skill: any) => {
    setShowSkillMention(false);
    
    if (!selectedSkills.find(s => s.id === skill.id)) {
      setSelectedSkills(prev => [...prev, skill]);
    }
    
    const textBeforeCursor = inputText.slice(0, mentionCursorPos);
    const textAfterCursor = inputText.slice(mentionCursorPos);
    
    // Remove the /... from input
    const lastSlashSymbol = textBeforeCursor.lastIndexOf('/');
    if (lastSlashSymbol !== -1) {
      const newInputText = textBeforeCursor.slice(0, lastSlashSymbol) + textAfterCursor;
      setInputText(newInputText);
    }
  };

  const handleRemoveSkill = (idToRemove: string) => {
    setSelectedSkills(prev => prev.filter(s => s.id !== idToRemove));
  };

  const handleSuggestionClick = (text: string) => {
    setInputText(text);
    setShowAppMention(false);
  };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInputText('');
    setIsStreaming(false);
    setSelectedStyle('默认风格');
    setShowAppMention(false);
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSelectHistory = async (id: string) => {
    if (id === currentChatId) return;

    // If already in store, just switch
    if (chatStore[id]) {
      setCurrentChatId(id);
      setMessages(chatStore[id]);
      setIsStreaming(false);
      return;
    }

    // Otherwise fetch details
    try {
      const detail = await fetchConversationDetail(id);
      const mappedMessages: Message[] = detail.messages.map(m => ({
        id: m.id,
        role: m.role === 'user' ? Role.USER : Role.MODEL,
        text: m.content,
        created_at: m.created_at
      }));

      setChatStore(prev => ({ ...prev, [id]: mappedMessages }));
      setCurrentChatId(id);
      setMessages(mappedMessages);
      setIsStreaming(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error("Failed to fetch conversation details:", error);
        alert("无法加载对话详情，请检查网络或 Token。");
      }
    }
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空所有历史记录吗？')) {
      setPinnedHistory([]);
      setRecentHistory([]);
      setChatStore({});
      startNewChat();
    }
  };

  const handleTogglePin = (itemId: string) => {
    // Check if it is currently pinned
    const pinnedItemIndex = pinnedHistory.findIndex(i => i.id === itemId);
    if (pinnedItemIndex !== -1) {
      // It is pinned, move to recent
      const item = pinnedHistory[pinnedItemIndex];
      const newPinned = [...pinnedHistory];
      newPinned.splice(pinnedItemIndex, 1);
      setPinnedHistory(newPinned);
      setRecentHistory(prev => [item, ...prev]);
      return;
    }

    // Check if it is currently recent
    const recentItemIndex = recentHistory.findIndex(i => i.id === itemId);
    if (recentItemIndex !== -1) {
      // It is recent, move to pinned
      const item = recentHistory[recentItemIndex];
      const newRecent = [...recentHistory];
      newRecent.splice(recentItemIndex, 1);
      setRecentHistory(newRecent);
      setPinnedHistory(prev => [item, ...prev]);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await deleteConversation(id);
      
      setPinnedHistory(prev => prev.filter(item => item.id !== id));
      setRecentHistory(prev => prev.filter(item => item.id !== id));
      
      // Also remove from store
      const newStore = { ...chatStore };
      delete newStore[id];
      setChatStore(newStore);

      if (currentChatId === id) {
        startNewChat();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error('Failed to delete conversation:', error);
        alert('删除会话失败，请重试');
      }
    }
  };

  const handleRenameHistoryItem = async (id: string, newTitle: string) => {
    try {
      await renameConversation(id, newTitle);
      setPinnedHistory(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
      setRecentHistory(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setShowTokenPrompt(true);
      } else {
        console.error('Failed to rename conversation:', error);
        alert('重命名会话失败，请重试');
      }
    }
  };

  const handleStartTour = () => {
    setIsSidebarOpen(true); 
    setIsTourOpen(true);
  };

  const handleTemplateSelect = (content: string) => {
    setInputText(content);
    setActivePopup(null);
    textareaRef.current?.focus();
  };

  const handleStyleSelect = (style: string) => {
    setSelectedStyle(style);
    setActivePopup(null);
  };

  const TOUR_STEPS = [
    {
      targetId: 'tour-new-chat',
      title: '开启新对话',
      description: '点击这里可以随时开启一个新的聊天会话。系统会自动为您保存当前会话。'
    },
    {
      targetId: 'tour-history',
      title: '管理历史记录',
      description: '这里保存了您的所有对话历史。您可以点击查看，使用图钉图标置顶重要对话，或者进行重命名和删除操作。'
    },
    {
      targetId: 'tour-agent-model',
      title: '智能体与模型选择',
      description: '在这里切换单/多智能体模式，并选择适合您的 AI 模型，以获得最佳的回答效果。'
    },
    {
      targetId: 'tour-input',
      title: '智能交互中心',
      description: '在此输入您的问题或指令。支持语音输入。输入“@”选择智能体，输入“/”快速调用技能，输入“#”选择应用。'
    },
    {
      targetId: 'tour-cards',
      title: '快捷入口',
      description: '点击下方的卡片，即可直接跳转到对应应用或快速发起常用对话。'
    }
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans relative" onClick={() => setActivePopup(null)}>
      
      {/* Token Prompt Modal */}
      {showTokenPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 border border-gray-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 ring-8 ring-blue-50/50">
                <Icons.Key />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">配置访问令牌</h3>
              <p className="text-sm text-gray-500">
                检测到您的 Token 已过期或未配置。请输入有效的 <b>console_token</b> 以继续使用 Yanfu 智能助手。
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="在此输入 Token..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTokenSubmit((e.target as HTMLInputElement).value);
                  }
                }}
                autoFocus
              />
              <button
                onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement).value;
                  handleTokenSubmit(input);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
              >
                保存并连接
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Tour */}
      <OnboardingTour 
        isOpen={isTourOpen} 
        onClose={() => setIsTourOpen(false)} 
        steps={TOUR_STEPS}
      />

      {/* Help Button - Fixed Top Right */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={(e) => { e.stopPropagation(); handleStartTour(); }}
          className="group relative w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center text-gray-500 hover:text-blue-600 hover:shadow-lg transition-all duration-200 border border-gray-100"
        >
          <Icons.HelpCircle />
          <div className="absolute top-full right-0 mt-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            新手指引
          </div>
        </button>
      </div>

      {/* Sidebar Container with Transition */}
      <div 
        className={`h-full transition-all duration-300 ease-in-out flex-shrink-0 ${isSidebarOpen ? 'w-[260px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}
      >
        <div className="w-[260px] h-full bg-[#f9fafb]">
          <Sidebar 
            onNewChat={startNewChat} 
            onCollapse={() => setIsSidebarOpen(false)} 
            pinnedHistory={pinnedHistory}
            recentHistory={recentHistory}
            recentApps={recentApps}
            onClearHistory={clearHistory}
            onTogglePin={handleTogglePin}
            onDeleteHistory={handleDeleteHistoryItem}
            onRenameHistory={handleRenameHistoryItem}
            onSelectHistory={handleSelectHistory}
            onLoadMore={handleLoadMoreHistory}
            isLoadingMore={isLoadingHistory}
            currentChatId={currentChatId}
          />
        </div>
      </div>
      
      {/* Main Chat Area - Changed bg-white to bg-[#ffffff] */}
      <main className="flex-1 flex flex-col relative bg-[#ffffff] h-full overflow-hidden">
        
        {/* Expand Sidebar Button (Visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-50 animate-fade-in flex items-center space-x-3">
             <div className="flex items-center justify-center bg-white/80 backdrop-blur-md p-2 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100">
               <div className="w-5 h-5 flex items-center justify-center">
                 <Icons.YanfuLogo />
               </div>
             </div>
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-700 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-gray-100 transition-all"
               title="展开侧边栏"
             >
               <Icons.Layout />
             </button>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto px-4 ${isWelcomeMode ? 'flex flex-col' : 'pt-6'}`}
        >
          {isWelcomeMode ? (
            <WelcomeScreen
              onSuggestionClick={handleSuggestionClick}
              onAppClick={handleAppClick}
              apps={recentApps.slice(0, 4)}
            />
          ) : (
            <div className="max-w-3xl mx-auto w-full pb-44">
              {messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onRegenerate={handleRegenerate}
                  onImageClick={setPreviewImage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollButton && !isWelcomeMode && (
          <div className="absolute bottom-[228px] left-1/2 -translate-x-1/2 z-30 animate-bounce-in">
            <button
              onClick={scrollToBottom}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-200 transition-all group"
              title="回到最新位置"
            >
              <Icons.ArrowDown className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}

        {/* Input Area Container */}
        <div 
          className={`
          z-20 w-full flex justify-center px-4 sm:px-6 lg:px-8 transition-all duration-500 ease-in-out
          ${isWelcomeMode 
            ? 'absolute top-[48%] left-1/2 transform -translate-x-1/2 -translate-y-1/2' 
            : 'absolute bottom-0 left-0 pb-6 pt-12 bg-gradient-to-t from-[#ffffff] via-[#ffffff] to-transparent'
          }
        `}>
            {/* Input Box Card */}
          <div 
            id="tour-input"
            className={`
            w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.08)] 
            transition-all duration-300 flex flex-col overflow-visible relative
            ${isWelcomeMode ? 'p-1' : 'p-1'}
            ${isListening ? 'ring-2 ring-red-400 border-red-400' : ''}
          `}>
            
            {/* Textarea Section */}
            <div className="relative px-4 pt-3 pb-1">
               {showAppMention && (
                 <div ref={mentionDropdownRef} className={`absolute left-4 bg-white rounded-xl shadow-2xl border border-gray-100 w-64 max-h-64 flex flex-col z-50 ${mentionPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                   <div className="flex-shrink-0 text-xs font-semibold text-gray-400 px-4 py-2 border-b border-gray-50 bg-white rounded-t-xl">选择应用</div>
                   <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
                     {exploreApps
                       .filter(app => {
                         const name = app.app?.name || app.name || '';
                         return name.toLowerCase().includes(mentionFilter.toLowerCase());
                       })
                       .map((app, index) => {
                         const appData = app.app || app;
                         let IconComponent = Icons.Layout;
                         if (appData.icon && (Icons as any)[appData.icon]) {
                           IconComponent = (Icons as any)[appData.icon];
                         }
                         const iconUrl = app.icon_url || appData.icon_url || app.iconUrl || appData.iconUrl;
                         return (
                           <button
                             key={appData.id || index}
                             onClick={() => handleAppMentionSelect(app)}
                             className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center space-x-3 transition-all hover:bg-gray-50 text-gray-700"
                           >
                             <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-blue-500">
                               {iconUrl ? (
                                 <img src={iconUrl} alt={appData.name} className="w-5 h-5 rounded object-contain" referrerPolicy="no-referrer" />
                               ) : (
                                 <IconComponent />
                               )}
                             </span>
                             <span className="flex-1 text-left truncate">{appData.name || '未命名应用'}</span>
                           </button>
                         );
                       })}
                     {exploreApps.filter(app => {
                       const name = app.app?.name || app.name || '';
                       return name.toLowerCase().includes(mentionFilter.toLowerCase());
                     }).length === 0 && (
                       <div className="px-3 py-2 text-sm text-gray-400 text-center">没有找到匹配的应用</div>
                     )}
                   </div>
                 </div>
               )}
               {showAgentMention && (
                 <div ref={agentMentionDropdownRef} className={`absolute left-4 bg-white rounded-xl shadow-2xl border border-gray-100 w-48 max-h-64 flex flex-col z-50 ${mentionPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                   <div className="flex-shrink-0 text-xs font-semibold text-gray-400 px-4 py-2 border-b border-gray-50 bg-white rounded-t-xl">选择智能体</div>
                   <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
                     {[
                       { id: '知识库专家', name: '知识库专家', icon: <Icons.FileText /> },
                       { id: '综合专家', name: '综合专家', icon: <Icons.Sparkles /> },
                       { id: '数据库专家', name: '数据库专家', icon: <Icons.Database /> }
                     ]
                       .filter(agent => agent.name.toLowerCase().includes(agentMentionFilter.toLowerCase()))
                       .map((agent) => (
                         <button
                           key={agent.id}
                           onClick={() => handleAgentMentionSelect(agent)}
                           className="w-full text-left px-3 py-2 text-sm rounded-lg flex items-center space-x-3 transition-all hover:bg-gray-50 text-gray-700"
                         >
                           <span className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-blue-500">
                             {agent.icon}
                           </span>
                           <span className="flex-1 text-left truncate">{agent.name}</span>
                         </button>
                       ))}
                     {[
                       { id: '知识库专家', name: '知识库专家', icon: <Icons.FileText /> },
                       { id: '综合专家', name: '综合专家', icon: <Icons.Sparkles /> },
                       { id: '数据库专家', name: '数据库专家', icon: <Icons.Database /> }
                     ].filter(agent => agent.name.toLowerCase().includes(agentMentionFilter.toLowerCase())).length === 0 && (
                       <div className="px-3 py-2 text-sm text-gray-400 text-center">没有找到匹配的智能体</div>
                     )}
                   </div>
                 </div>
               )}
                {showSkillMention && (
                  <div ref={skillMentionDropdownRef} className={`absolute left-4 bg-white rounded-xl shadow-2xl border border-gray-100 w-64 max-h-64 flex flex-col z-50 ${mentionPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                    <div className="flex-shrink-0 text-xs font-semibold text-gray-400 px-4 py-2 border-b border-gray-50 bg-white rounded-t-xl flex justify-between items-center">
                      <span>选择技能</span>
                      {isLoadingSkills && <Icons.Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                    </div>
                    <div 
                      className="overflow-y-auto custom-scrollbar p-1 flex-1 relative"
                    >
                      {skills
                        .filter(skill => skill.name.toLowerCase().includes(skillMentionFilter.toLowerCase()))
                        .map((skill) => (
                          <button
                            key={skill.id}
                            onClick={() => handleSkillMentionSelect(skill)}
                            onMouseEnter={() => {
                              if (skillHoverTimerRef.current) clearTimeout(skillHoverTimerRef.current);
                              setHoveredSkill(skill);
                            }}
                            onMouseLeave={() => {
                              skillHoverTimerRef.current = setTimeout(() => {
                                setHoveredSkill(null);
                              }, 150);
                            }}
                            className="w-full text-left px-3 py-2 text-sm rounded-lg flex flex-col transition-all hover:bg-gray-50 text-gray-700 group relative"
                          >
                            <div className="flex items-center space-x-2 w-full">
                              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-green-500">
                                <Icons.Code />
                              </span>
                              <span className="font-medium truncate">{skill.name}</span>
                            </div>
                            {skill.description && (
                              <span className="text-xs text-gray-400 mt-1 truncate w-full pl-6">{skill.description}</span>
                            )}
                          </button>
                        ))}
                      {skills.filter(skill => skill.name.toLowerCase().includes(skillMentionFilter.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400 text-center">没有找到匹配的技能</div>
                      )}
                    </div>
                    
                    {/* Modern Custom Tooltip */}
                    {hoveredSkill && hoveredSkill.description && (
                      <div 
                        className="absolute left-full ml-3 top-0 w-72 bg-gray-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 z-[60] animate-in fade-in slide-in-from-left-2 duration-200 ring-1 ring-black/5"
                        onMouseEnter={() => {
                          if (skillHoverTimerRef.current) clearTimeout(skillHoverTimerRef.current);
                        }}
                        onMouseLeave={() => {
                          skillHoverTimerRef.current = setTimeout(() => {
                            setHoveredSkill(null);
                          }, 150);
                        }}
                      >
                        <div className="flex items-center space-x-2.5 mb-3 pb-2.5 border-b border-white/10">
                          <div className="w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center ring-1 ring-green-500/30">
                            <Icons.Code className="w-4 h-4 text-green-400" />
                          </div>
                          <span className="font-bold text-sm tracking-tight text-white/95">{hoveredSkill.name}</span>
                        </div>
                        <div className="text-xs leading-relaxed text-gray-300 font-normal">
                          {hoveredSkill.description}
                        </div>
                        {/* Arrow */}
                        <div className="absolute left-0 top-6 -ml-1.5 w-3 h-3 bg-gray-900/95 border-l border-b border-white/10 rotate-45"></div>
                      </div>
                    )}
                  </div>
                )}
                {(uploadedFiles.length > 0 || selectedSkills.length > 0) && (
                 <div className="flex flex-wrap gap-2 mb-2">
                   {uploadedFiles.map(file => (
                     <div key={file.id} className="flex items-center space-x-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-xs border border-blue-100">
                       <Icons.Paperclip className="w-3 h-3" />
                       <span className="truncate max-w-[150px]">{file.name}</span>
                       <button onClick={() => handleRemoveFile(file.id)} className="hover:text-blue-900 ml-1">
                         <Icons.X className="w-3 h-3" />
                       </button>
                     </div>
                   ))}
                   {selectedSkills.map(skill => (
                     <div key={skill.id} className="flex items-center space-x-1 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs border border-green-100">
                       <Icons.Code className="w-3 h-3" />
                       <span className="truncate max-w-[150px]">{skill.name}</span>
                       <button onClick={() => handleRemoveSkill(skill.id)} className="hover:text-green-900 ml-1">
                         <Icons.X className="w-3 h-3" />
                       </button>
                     </div>
                   ))}
                 </div>
               )}
               <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "正在聆听..." : (agentMode === 'single' ? "输入您的问题，或输入/选择技能，#选择应用..." : "输入您的问题，或输入@选择智能体，/选择技能，#选择应用...")}
                  className={`
                     w-full focus:outline-none resize-none bg-transparent custom-scrollbar text-gray-700
                     ${isWelcomeMode ? 'text-base min-h-[56px]' : 'text-sm min-h-[44px] max-h-32'}
                     ${isListening ? 'placeholder-red-400' : 'placeholder-gray-400'}
                  `}
                  rows={1}
               />
            </div>

            {/* Agent Mode Selection */}
            <div id="tour-agent-model" className="px-4 pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pb-2">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1 bg-gray-50/50 p-0.5 rounded-lg border border-gray-100">
                        <button 
                            onClick={() => setAgentMode('single')}
                            className={`px-3 py-1 rounded-md transition-all ${agentMode === 'single' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'hover:text-gray-700'}`}
                        >
                            单智能体
                        </button>
                        <button 
                            onClick={() => setAgentMode('multi')}
                            className={`px-3 py-1 rounded-md transition-all ${agentMode === 'multi' ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'hover:text-gray-700'}`}
                        >
                            多智能体
                        </button>
                    </div>
                    
                    <div className="h-4 w-[1px] bg-gray-200"></div>

                    <div className="flex items-center space-x-1">
                        <span className="text-gray-400">模型:</span>
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setActivePopup(activePopup === 'model' ? null : 'model'); }}
                                className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all hover:bg-gray-50 group ${activePopup === 'model' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                            >
                                {(() => {
                                    const provider = modelTypes.find(p => p.models.some((m: any) => m.model === selectedModel));
                                    if (provider?.icon_small?.zh_Hans) {
                                        return <img src={provider.icon_small.zh_Hans} alt={provider.label.zh_Hans} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />;
                                    }
                                    return null;
                                })()}
                                <span className="font-semibold truncate max-w-[120px]">{selectedModel || '选择模型'}</span>
                                <Icons.ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activePopup === 'model' ? 'rotate-180 text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            </button>

                            {activePopup === 'model' && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className={`absolute ${isWelcomeMode ? 'top-full mt-2' : 'bottom-full mb-2'} left-0 bg-white rounded-xl shadow-2xl border border-gray-100 w-72 animate-fade-in z-30 flex flex-col max-h-[400px]`}
                                >
                                    <div className="flex-shrink-0 text-xs font-semibold text-gray-400 px-4 py-2 border-b border-gray-50 bg-white rounded-t-xl">选择 AI 模型</div>
                                    <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
                                        {modelTypes.map(provider => (
                                            <div key={provider.provider} className="mb-2 last:mb-0">
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 rounded-md mx-1 mb-1 flex items-center space-x-2">
                                                    {provider.icon_small?.zh_Hans && (
                                                        <img src={provider.icon_small.zh_Hans} alt={provider.label.zh_Hans} className="w-4 h-4 object-contain" referrerPolicy="no-referrer" />
                                                    )}
                                                    <span>{provider.label.zh_Hans}</span>
                                                </div>
                                                {provider.models.map(m => (
                                                    <button
                                                        key={m.model}
                                                        onClick={() => { setSelectedModel(m.model); setActivePopup(null); }}
                                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition-all group ${
                                                            selectedModel === m.model 
                                                            ? 'bg-blue-50 text-blue-600 font-medium' 
                                                            : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="truncate">{m.model}</span>
                                                            {m.description && <span className="text-[10px] text-gray-400 group-hover:text-blue-400 truncate max-w-[200px]">{m.description}</span>}
                                                        </div>
                                                        {selectedModel === m.model && <Icons.Check className="text-blue-600 flex-shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {agentMode === 'single' && (
                        <>
                            <div className="h-4 w-[1px] bg-gray-200"></div>
                            <div className="flex items-center space-x-1">
                                <span className="text-gray-400">智能体:</span>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActivePopup(activePopup === 'agent' ? null : 'agent'); }}
                                        className={`flex items-center space-x-1 px-2 py-1 rounded-lg transition-all hover:bg-gray-50 group ${activePopup === 'agent' ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'}`}
                                    >
                                        <span className="font-semibold">
                                            {selectedAgent}
                                        </span>
                                        <Icons.ChevronDown className={`w-3 h-3 transition-transform duration-200 ${activePopup === 'agent' ? 'rotate-180 text-blue-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                    </button>

                                    {activePopup === 'agent' && (
                                        <div 
                                          onClick={(e) => e.stopPropagation()}
                                          className={`absolute ${isWelcomeMode ? 'top-full mt-2' : 'bottom-full mb-2'} left-0 bg-white rounded-xl shadow-2xl border border-gray-100 p-1 w-48 animate-fade-in z-30 overflow-hidden`}
                                        >
                                            <div className="text-xs font-semibold text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">选择智能体</div>
                                            {[
                                                { id: '知识库专家', name: '知识库专家', icon: <Icons.FileText /> },
                                                { id: '综合专家', name: '综合专家', icon: <Icons.Sparkles /> },
                                                { id: '数据库专家', name: '数据库专家', icon: <Icons.Database /> }
                                            ].map(agent => (
                                                <button
                                                    key={agent.id}
                                                    onClick={() => { setSelectedAgent(agent.id); setActivePopup(null); }}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center space-x-3 transition-all ${
                                                        selectedAgent === agent.id 
                                                        ? 'bg-blue-50 text-blue-600 font-medium' 
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className={`w-5 h-5 flex items-center justify-center flex-shrink-0 ${selectedAgent === agent.id ? 'text-blue-500' : 'text-gray-400'}`}>
                                                        {agent.icon}
                                                    </span>
                                                    <span className="flex-1 text-left">{agent.name}</span>
                                                    {selectedAgent === agent.id && <Icons.Check className="text-blue-600 flex-shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right side icons (Mic & Send) moved here */}
                <div className="flex items-center space-x-1">
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        multiple={false}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isStreaming}
                        className={`
                            p-1.5 rounded-lg transition-all duration-300 relative
                            ${isUploading ? 'text-blue-500 animate-pulse' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}
                        `}
                        title="上传文件"
                    >
                        <Icons.Paperclip className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={handleVoiceInput}
                        className={`
                            p-1.5 rounded-lg transition-all duration-300 relative
                            ${isListening ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}
                        `}
                        title={isListening ? "点击停止录音" : "点击开始录音"}
                    >
                        {isListening ? (
                            <>
                                <span className="absolute inset-0 rounded-lg border border-red-400 animate-ping opacity-75"></span>
                                <Icons.MicOff className="w-4 h-4" />
                            </>
                        ) : (
                            <Icons.Mic className="w-4 h-4" />
                        )}
                    </button>
                    
                    <button 
                        onClick={isStreaming ? handleStopGeneration : handleSendMessage}
                        disabled={(!inputText.trim() && uploadedFiles.length === 0) && !isStreaming}
                        className={`p-1.5 rounded-lg transition-colors ${
                            isStreaming 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : ((inputText.trim() || uploadedFiles.length > 0) ? 'text-blue-600 bg-blue-50' : 'hover:bg-gray-100 text-gray-300')
                        }`}
                        title={isStreaming ? "停止回答" : "发送"}
                    >
                        {isStreaming ? <Icons.Stop className="w-4 h-4" /> : <Icons.Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Bottom Toolbar Area (Chips / Tools) */}
            <div className="flex items-center justify-between px-3 pb-2 pt-1">
               
               {/* Left: Chips or Tools */}
               <div className="flex items-center flex-wrap gap-2">
                  {isWelcomeMode ? (
                     // Welcome Mode: Suggestion Chips
                     INPUT_CHIPS.map(chip => (
                        <button 
                           key={chip}
                           onClick={() => handleSuggestionClick(chip)}
                           className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs rounded-full border border-transparent hover:border-gray-200 transition-all"
                        >
                           {chip}
                        </button>
                     ))
                  ) : (
                     // Chat Mode: Tools
                     <div className="flex space-x-1 relative">
                        {/* Tools can be added here in the future */}
                     </div>
                  )}
               </div>

               {/* Right: Empty space for alignment */}
               <div className="w-10"></div>
            </div>
          </div>
        </div>
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors p-2 bg-white/10 rounded-full hover:bg-white/20"
            onClick={() => setPreviewImage(null)}
          >
            <Icons.X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
            <div className="mt-4 flex space-x-4">
              <a 
                href={previewImage} 
                download="image.png"
                className="flex items-center space-x-2 px-6 py-2.5 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 transition-all shadow-lg"
              >
                <Icons.Download className="w-4 h-4" />
                <span>下载原图</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function AgentPage() {
  return <AppContent />;
}
