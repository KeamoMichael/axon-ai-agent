
import React, { useState, useRef, useEffect } from 'react';
import { ICONS } from '../constants';
import { ChatMessage, PlanStep, GeneratedFile } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  isProcessing: boolean;
  onOpenSidebar: () => void;
  onExpandWorkspace: () => void;
  activeStep?: PlanStep;
  steps?: PlanStep[];
}

const MODELS = [
  { id: 'gemini-3-pro-preview', name: 'Axon 1.6 Lite', description: 'high speed & efficiency' },
  { id: 'gemini-2.5-flash-lite-latest', name: 'Axon 1.6 Pro', description: 'complex reasoning' },
];

const Waveform = () => (
  <div className="flex items-center gap-[3px] h-8 px-2">
    {[...Array(16)].map((_, i) => (
      <div
        key={i}
        className="w-[4px] bg-[#9ca3af] rounded-full animate-waveform"
        style={{
          height: `${20 + Math.random() * 80}%`,
          animationDelay: `${i * 0.05}s`,
          animationDuration: '0.8s'
        }}
      />
    ))}
  </div>
);

const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#fdfdfd] border border-gray-100 rounded-xl my-4 overflow-hidden relative group">
      <div className="flex items-center justify-end px-4 py-2 bg-gray-50/50 border-b border-gray-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-black transition-colors"
        >
          <ICONS.Copy />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-6 text-[14px] leading-relaxed overflow-x-auto scrollbar-hide">
        <code className="mono text-[#333]">
          {code.split('\n').map((line, i) => (
            <div key={i} className="flex gap-4">
              <span className="text-gray-200 select-none text-[12px] pt-0.5">{i + 1}</span>
              <span>{line}</span>
            </div>
          ))}
        </code>
      </pre>
      <div className="absolute right-4 bottom-1/2 translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-8 h-8 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-gray-400">
          <ICONS.ArrowDown />
        </button>
      </div>
    </div>
  );
};

const FileAttachment: React.FC<{ file: GeneratedFile }> = ({ file }) => (
  <div className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl my-2 hover:bg-gray-50 transition-colors cursor-pointer group shadow-sm">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${file.type === 'zip' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
      {file.type === 'zip' ? <ICONS.Zip /> : <ICONS.Code />}
    </div>
    <div className="flex-1 min-w-0">
      <h5 className="text-[14px] font-bold text-gray-900 truncate">{file.name}</h5>
      <p className="text-[12px] text-gray-400 font-medium">
        {file.type === 'zip' ? 'Archive' : 'Code'} · {file.size || '384 B'}
      </p>
    </div>
    <div className="text-gray-200 group-hover:text-gray-400 transition-colors">
      <ICONS.Download />
    </div>
  </div>
);

// Markdown Renderer Component
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ol' | 'ul'; items: React.ReactNode[] } | null = null;
    let listKey = 0;

    const parseInline = (line: string): React.ReactNode => {
      // Parse bold text (**text** or __text__)
      const parts: React.ReactNode[] = [];
      let remaining = line;
      let key = 0;

      while (remaining.length > 0) {
        // Match bold patterns
        const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
        if (boldMatch) {
          const index = boldMatch.index!;
          if (index > 0) {
            parts.push(<span key={key++}>{remaining.slice(0, index)}</span>);
          }
          parts.push(
            <strong key={key++} className="font-bold text-gray-900">
              {boldMatch[1] || boldMatch[2]}
            </strong>
          );
          remaining = remaining.slice(index + boldMatch[0].length);
        } else {
          parts.push(<span key={key++}>{remaining}</span>);
          break;
        }
      }
      return parts.length === 1 ? parts[0] : <>{parts}</>;
    };

    const flushList = () => {
      if (currentList) {
        if (currentList.type === 'ol') {
          elements.push(
            <ol key={`list-${listKey++}`} className="list-decimal list-outside ml-6 space-y-2 my-4">
              {currentList.items.map((item, i) => (
                <li key={i} className="text-[16px] text-[#2d3748] leading-relaxed pl-1">
                  {item}
                </li>
              ))}
            </ol>
          );
        } else {
          elements.push(
            <ul key={`list-${listKey++}`} className="list-disc list-outside ml-6 space-y-2 my-4">
              {currentList.items.map((item, i) => (
                <li key={i} className="text-[16px] text-[#2d3748] leading-relaxed pl-1">
                  {item}
                </li>
              ))}
            </ul>
          );
        }
        currentList = null;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Skip empty lines but flush list
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Headings
      if (trimmedLine.startsWith('### ')) {
        flushList();
        elements.push(
          <h4 key={index} className="text-[17px] font-bold text-gray-900 mt-6 mb-3">
            {parseInline(trimmedLine.slice(4))}
          </h4>
        );
        return;
      }
      if (trimmedLine.startsWith('## ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-[18px] font-bold text-gray-900 mt-6 mb-3">
            {parseInline(trimmedLine.slice(3))}
          </h3>
        );
        return;
      }
      if (trimmedLine.startsWith('# ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-[20px] font-bold text-gray-900 mt-6 mb-3">
            {parseInline(trimmedLine.slice(2))}
          </h2>
        );
        return;
      }

      // Ordered list items (1. 2. 3. etc.)
      const olMatch = trimmedLine.match(/^(\d+)\.\s+(.+)/);
      if (olMatch) {
        if (!currentList || currentList.type !== 'ol') {
          flushList();
          currentList = { type: 'ol', items: [] };
        }
        currentList.items.push(parseInline(olMatch[2]));
        return;
      }

      // Unordered list items (- or *)
      const ulMatch = trimmedLine.match(/^[-*]\s+(.+)/);
      if (ulMatch) {
        if (!currentList || currentList.type !== 'ul') {
          flushList();
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(parseInline(ulMatch[1]));
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={index} className="text-[16px] text-[#2d3748] leading-relaxed my-3">
          {parseInline(trimmedLine)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  // Handle code blocks separately
  const parts = content.split(/(```[\s\S]*?```)/);

  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w+\n/, '').trim();
          return <CodeBlock key={i} code={code} />;
        }
        return <div key={i}>{parseMarkdown(part)}</div>;
      })}
    </div>
  );
};

// Inline Planning Step Component (Manus-style)
const InlinePlanningStep: React.FC<{
  step: PlanStep;
  isExpanded: boolean;
  onToggle: () => void;
  elapsedTime?: string;
}> = ({ step, isExpanded, onToggle, elapsedTime }) => {
  const getToolIcon = () => {
    switch (step.toolUsed) {
      case 'search':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        );
      case 'browse':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
          </svg>
        );
      case 'terminal':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" x2="20" y1="19" y2="19" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
        );
    }
  };

  const getToolLabel = () => {
    switch (step.toolUsed) {
      case 'search': return 'Searching';
      case 'browse': return 'Using browser';
      case 'terminal': return 'Running command';
      case 'thinking': return 'Thinking';
      default: return 'Processing';
    }
  };

  return (
    <div className="my-4">
      {/* Step Header - Expandable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 text-left group"
      >
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${step.status === 'completed' ? 'border-green-500 bg-green-500' :
          step.status === 'active' ? 'border-blue-500 bg-blue-500' :
            'border-gray-300'
          }`}>
          {step.status === 'completed' && (
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <span className={`text-[15px] font-semibold flex-1 ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'
          }`}>
          {step.title}
        </span>
        <div className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="ml-6 mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Description */}
          {step.description && (
            <p className="text-[14px] text-gray-500 leading-relaxed">
              {step.description}
            </p>
          )}

          {/* Search/Tool Query Indicator */}
          {step.searchQuery && (
            <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-lg px-3 py-2 border border-gray-100">
              <div className="text-gray-400">{getToolIcon()}</div>
              <code className="text-[13px] text-gray-600 font-mono truncate flex-1">
                {step.searchQuery}
              </code>
            </div>
          )}

          {/* Active Status Indicator */}
          {step.status === 'active' && (
            <div className="flex items-center gap-2 text-[14px] text-gray-500">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span>{getToolLabel()}</span>
              {elapsedTime && <span className="text-gray-400">· {elapsedTime}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};


const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  onOpenSidebar,
  onExpandWorkspace,
  activeStep,
  steps = []
}) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlannerExpanded, setIsPlannerExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Dictation states
  const [isRecording, setIsRecording] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Speech Recognition Refs
  const recognitionRef = useRef<any>(null);
  const transcriptionBuffer = useRef<string>('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing, activeStep]);

  useEffect(() => {
    if (isProcessing) {
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isProcessing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      const scrollHeight = textareaRef.current.scrollHeight;
      if (input.length > 0) {
        textareaRef.current.style.height = Math.min(scrollHeight, 120) + 'px';
      }
    }
  }, [input]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || files.length > 0) && !isProcessing) {
      onSendMessage(input);
      setInput('');
      setFiles([]);
      setPreviews([]);
      setIsRecording(false);
      if (textareaRef.current) textareaRef.current.style.height = '24px';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    setFiles(prev => [...prev, ...selectedFiles]);

    selectedFiles.forEach((file: File) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreviews(prev => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      transcriptionBuffer.current = '';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) transcriptionBuffer.current += (transcriptionBuffer.current ? ' ' : '') + finalTranscript.trim();
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => isRecording && setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    transcriptionBuffer.current = '';
  };

  const finishRecording = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsRecording(false);
    setTimeout(() => {
      const finalResult = transcriptionBuffer.current.trim();
      if (finalResult) setInput(prev => (prev ? prev + ' ' : '') + finalResult);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }, 200);
  };

  const completedStepsCount = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length || 0;
  // Only show floating card for agentic tasks (when there are actual steps with tool usage)
  const hasAgenticTask = isProcessing && steps.length > 0 && steps.some(s => s.toolUsed);
  const activeAgenticStep = steps.find(s => s.status === 'active');


  return (
    <div className="flex flex-col h-full bg-white w-full relative">
      <style>{`
        @keyframes waveform {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.3); }
        }
        .animate-waveform {
          animation: waveform 0.6s ease-in-out infinite;
        }
      `}</style>

      {/* Header - Styled to match screenshot */}
      <header className="h-16 flex items-center justify-between px-6 bg-white sticky top-0 z-30">
        <div className="flex items-center">
          <button onClick={onOpenSidebar} className="text-gray-400 hover:text-black transition-all p-2 -ml-2">
            <ICONS.ChevronLeft />
          </button>
          <div className="relative ml-1" ref={modelSelectorRef}>
            <button
              onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
              className="flex items-center gap-2 text-[#222] font-bold text-[18px] hover:text-black py-2 px-2 rounded-lg transition-all tracking-tight"
            >
              {selectedModel.name}
              <div className="text-gray-300 scale-90"><ICONS.ChevronDown /></div>
            </button>
            {isModelSelectorOpen && (
              <div className="absolute top-full left-[-4px] mt-2 w-64 bg-white border border-gray-100/50 rounded-[1.5rem] shadow-[0_12px_40px_rgba(0,0,0,0.08)] z-50 p-1.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-0.5">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => { setSelectedModel(model); setIsModelSelectorOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-[1rem] transition-colors flex flex-col ${selectedModel.id === model.id ? 'bg-[#f8f9fa]' : 'hover:bg-gray-50/80'}`}
                    >
                      <span className="text-[16px] font-bold text-[#111] leading-none">{model.name}</span>
                      <span className="text-[12px] text-gray-400 font-medium lowercase tracking-tight leading-none mt-1.5">{model.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative" ref={settingsRef}>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="text-gray-300 hover:text-black p-2 transition-all">
              <ICONS.MoreHorizontal />
            </button>
            {isSettingsOpen && (
              <div className="absolute top-full right-[-4px] mt-3 w-60 bg-white border border-gray-100/50 rounded-[1.8rem] shadow-[0_12px_40px_rgba(0,0,0,0.08)] z-50 p-2.5 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-1">
                  <button className="w-full text-left px-4 py-3.5 rounded-[1.2rem] flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                    <div className="text-gray-400 group-hover:text-black"><ICONS.Heart /></div>
                    <span className="text-[16px] font-medium text-gray-800">Favourite</span>
                  </button>
                  <button className="w-full text-left px-4 py-3.5 rounded-[1.2rem] flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                    <div className="text-gray-400 group-hover:text-black"><ICONS.Edit /></div>
                    <span className="text-[16px] font-medium text-gray-800">Rename</span>
                  </button>
                  <div className="h-[1px] bg-gray-50 my-1.5 mx-2"></div>
                  <button className="w-full text-left px-4 py-3.5 rounded-[1.2rem] flex items-center gap-4 hover:bg-red-50/50 transition-colors group">
                    <div className="text-gray-400 group-hover:text-red-500"><ICONS.Trash /></div>
                    <span className="text-[16px] font-medium text-gray-800 group-hover:text-red-600">Delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth flex flex-col items-center">
        <div className="max-w-2xl w-full flex-1 flex flex-col">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 pt-12 pb-20">
              <div className="w-12 h-12 flex items-center justify-center bg-black rounded-2xl mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" /></svg>
              </div>
              <h2 className="display-font text-[28px] font-bold text-[#111b2d]">axon</h2>
              <p className="text-[#9ca3af] text-[15px] max-w-[280px] mx-auto font-medium leading-[1.4]">
                Define your objective and let the autonomous engine lead the way.
              </p>
            </div>
          ) : (
            <div className="space-y-12 py-6">
              {messages.map((msg) => (
                <div key={msg.id} className="w-full animate-in fade-in slide-in-from-bottom-2">
                  {msg.role === 'user' ? (
                    <div className="flex flex-col items-end mb-8">
                      <div className="bg-[#f4f4f5] px-6 py-3.5 rounded-[1.5rem] rounded-tr-[0.2rem] text-[16px] font-medium text-gray-900 max-w-[85%] leading-relaxed shadow-sm border border-gray-100/50">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 flex items-center justify-center bg-black rounded-lg">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                        </div>
                        <span className="font-bold text-[16px] text-gray-900">axon</span>
                        <span className="bg-[#f4f4f5] text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded border border-gray-100">Lite</span>
                      </div>

                      {/* Inline Planning Steps - show before content if there are steps */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="my-4 border-l-2 border-gray-100 pl-4">
                          {msg.steps.map((step, idx) => (
                            <div key={step.id} className="mb-3 last:mb-0">
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${step.status === 'completed' ? 'border-green-500 bg-green-500' :
                                  step.status === 'active' ? 'border-blue-500 bg-blue-500' :
                                    'border-gray-300'
                                  }`}>
                                  {step.status === 'completed' && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <span className={`text-[14px] font-semibold ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-700'
                                  }`}>
                                  {step.title}
                                </span>
                                {step.status === 'active' && (
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse ml-1" />
                                )}
                              </div>
                              {step.description && step.status !== 'pending' && (
                                <p className="text-[13px] text-gray-500 mt-1 ml-6">
                                  {step.description}
                                </p>
                              )}
                              {step.searchQuery && (
                                <div className="flex items-center gap-2 bg-[#f8f9fa] rounded-lg px-3 py-1.5 mt-2 ml-6 border border-gray-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                                  </svg>
                                  <code className="text-[12px] text-gray-600 font-mono truncate">
                                    {step.searchQuery}
                                  </code>
                                </div>
                              )}
                              {step.status === 'active' && step.toolUsed && (
                                <div className="flex items-center gap-2 text-[13px] text-gray-500 mt-1 ml-6">
                                  <span>{step.toolUsed === 'search' ? 'Searching' : step.toolUsed === 'browse' ? 'Using browser' : step.toolUsed === 'thinking' ? 'Thinking' : 'Processing'}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {msg.content && (
                        <div className="text-[16px] font-medium text-[#2d3748] leading-relaxed max-w-[95%]">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}

                      {msg.generatedFiles && msg.generatedFiles.length > 0 && (
                        <div className="space-y-2">
                          {msg.generatedFiles.map((f, i) => (
                            <FileAttachment key={i} file={f} />
                          ))}
                          <button className="flex items-center gap-2 text-[14px] font-bold text-gray-400 hover:text-black mt-4 border border-gray-100 px-4 py-2 rounded-xl">
                            <ICONS.Zip />
                            View all files in this task
                          </button>
                        </div>
                      )}

                      {/* Task Completed Indicator - only show if there were agentic steps */}
                      {msg.steps && msg.steps.length > 0 && msg.steps.every(s => s.status === 'completed') && (
                        <div className="flex items-center gap-2 py-4 text-green-500 font-bold text-[14px]">
                          <ICONS.CheckCircle />
                          Task completed
                        </div>
                      )}

                      {/* Process Footer inside message */}
                      {msg.steps && msg.steps.length > 0 && (
                        <div className="bg-[#f8f9fa] rounded-2xl p-4 flex items-center justify-between border border-gray-100/50 group cursor-pointer hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center p-1 opacity-60">
                              <ICONS.Code />
                            </div>
                            <div className="min-w-0">
                              <h6 className="text-[15px] font-bold text-gray-900 truncate">
                                {msg.steps.find(s => s.status === 'active')?.title || "Deliver the code to the user"}
                              </h6>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="text-[14px] font-bold text-gray-300">
                              {msg.steps.filter(s => s.status === 'completed').length}/{msg.steps.length}
                            </span>
                            <div className="text-gray-300 group-hover:text-gray-600 transition-colors">
                              <ICONS.ChevronUp />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="px-4 pb-12 flex flex-col items-center">
        <div className="max-w-2xl w-full flex flex-col gap-1">

          {/* Floating Agent Card - Manus Style - directly above chatbar */}
          {hasAgenticTask && (
            <div className="bg-white border border-gray-100/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Collapsed View - Always Visible */}
              <div
                className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setIsPlannerExpanded(!isPlannerExpanded)}
              >
                {/* Preview Thumbnail */}
                <div
                  onClick={(e) => { e.stopPropagation(); onExpandWorkspace(); }}
                  className="relative w-14 h-10 bg-gray-100 rounded-lg border border-gray-200/50 overflow-hidden cursor-pointer group shrink-0"
                >
                  <div className="p-1.5 space-y-1 opacity-30 h-full w-full">
                    <div className="h-0.5 w-full bg-gray-500 rounded"></div>
                    <div className="h-0.5 w-3/4 bg-gray-500 rounded"></div>
                    <div className="h-0.5 w-5/6 bg-gray-500 rounded"></div>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                    <ICONS.Maximize />
                  </div>
                </div>

                {/* Current Step Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Active indicator dot */}
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></div>
                    <span className="text-[14px] font-semibold text-gray-900 truncate">
                      {activeAgenticStep?.title || steps[0]?.title || 'Processing...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-gray-400">{formatTime(elapsedSeconds)}</span>
                    <span className="text-[12px] text-gray-400">
                      {activeAgenticStep?.toolUsed === 'browse' ? 'Using browser' :
                        activeAgenticStep?.toolUsed === 'search' ? 'Searching' :
                          activeAgenticStep?.toolUsed === 'terminal' ? 'Running command' :
                            'Thinking'}
                    </span>
                  </div>
                </div>

                {/* Step Counter and Expand */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-semibold text-gray-400">
                    {completedStepsCount + 1}/{totalSteps}
                  </span>
                  <div className="text-gray-300 hover:text-gray-500 transition-colors">
                    {isPlannerExpanded ? <ICONS.ChevronUp /> : <ICONS.ChevronDown />}
                  </div>
                </div>
              </div>

              {/* Expanded View - Task Progress Section */}
              {isPlannerExpanded && (
                <div className="border-t border-gray-100 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[14px] font-bold text-gray-700">Task progress</h5>
                    <span className="text-[13px] font-semibold text-gray-400">{completedStepsCount}/{totalSteps}</span>
                  </div>

                  {/* Steps List */}
                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5
                          ${step.status === 'completed' ? 'text-green-500' :
                            step.status === 'active' ? 'text-blue-500' : 'text-gray-300'}`}>
                          {step.status === 'completed' ? (
                            <ICONS.CheckCircle />
                          ) : step.status === 'active' ? (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                          ) : (
                            <ICONS.Clock />
                          )}
                        </div>

                        {/* Step Content */}
                        <div className="flex-1 min-w-0">
                          <span className={`text-[14px] font-medium block truncate
                            ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                            {step.title}
                          </span>
                          {step.status === 'active' && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[12px] text-gray-400">{formatTime(elapsedSeconds)}</span>
                              <span className="text-[12px] text-gray-400">
                                {step.toolUsed === 'browse' ? 'Using browser' :
                                  step.toolUsed === 'search' ? 'Searching' :
                                    step.toolUsed === 'terminal' ? 'Running command' :
                                      'Thinking'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Chat Box */}
          <div className="bg-[#f8f9fa] border border-gray-100/60 rounded-[1.8rem] px-6 py-4 flex flex-col min-h-[80px] justify-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all relative">
            {isRecording ? (
              <div className="flex-1 w-full flex items-center justify-between animate-in fade-in duration-300 px-2">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={cancelRecording} className="w-10 h-10 rounded-full border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-black transition-all shadow-sm">
                    <ICONS.X />
                  </button>
                  <button type="button" onClick={finishRecording} className="w-10 h-10 rounded-full border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-black transition-all shadow-sm">
                    <ICONS.Check />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-end px-4 overflow-hidden">
                  <div className="text-gray-300 tracking-widest text-[14px] pr-8 shrink-0 font-light opacity-50 select-none">...........................</div>
                  <Waveform />
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 w-full flex items-start">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Axon"
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none outline-none text-[16px] text-gray-800 font-medium py-0 placeholder-[#9ca3af] resize-none overflow-y-auto scrollbar-hide"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                  />
                </div>
                <div className="flex items-center justify-between mt-auto w-full pt-3">
                  <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileChange} accept="image/*,application/pdf" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 text-gray-400 hover:text-black transition-colors shrink-0"><ICONS.Plus /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={startRecording} className="p-1 text-gray-400 hover:text-black transition-colors shrink-0"><ICONS.Mic /></button>
                    <button onClick={() => handleSubmit()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() || files.length > 0 ? 'bg-black text-white' : 'bg-transparent text-gray-300'}`}>
                      {isProcessing ? <div className="w-3.5 h-3.5 bg-white rounded-sm"></div> : <ICONS.Send />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-2 text-center">
            <p className="text-[12px] text-[#e5e7eb] font-semibold tracking-tight">Axon can make mistakes. Double check responses</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
