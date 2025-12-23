
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
  const [isPlannerExpanded, setIsPlannerExpanded] = useState(true);
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
  const totalSteps = steps.length || 2;

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
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
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
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                                        </div>
                                        <span className="font-bold text-[16px] text-gray-900">axon</span>
                                        <span className="bg-[#f4f4f5] text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded border border-gray-100">Lite</span>
                                    </div>

                                    {msg.content && (
                                        <div className="text-[16px] font-medium text-[#2d3748] leading-relaxed max-w-[95%] space-y-4">
                                            {msg.content.split('```').map((part, i) => {
                                                if (i % 2 === 1) return <CodeBlock key={i} code={part.trim()} />;
                                                return <p key={i}>{part}</p>;
                                            })}
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

                                    {/* Task Completed Indicator */}
                                    <div className="flex items-center gap-2 py-4 text-green-500 font-bold text-[14px]">
                                        <ICONS.CheckCircle />
                                        Task completed
                                    </div>

                                    {/* Feedback Card */}
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative group max-w-sm">
                                        <button className="absolute top-4 right-4 text-gray-300 hover:text-gray-500">
                                            <ICONS.X />
                                        </button>
                                        <h5 className="text-[16px] font-bold text-gray-900 mb-4">How was this result?</h5>
                                        <div className="flex items-center gap-2 text-gray-200">
                                            {[...Array(5)].map((_, i) => (
                                                <button key={i} className="hover:text-yellow-400 transition-colors">
                                                    <ICONS.Star />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

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
        <div className="max-w-2xl w-full flex flex-col gap-2">
            
            {/* Active Floating Agent Card */}
            {isProcessing && (
                <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-500 mb-2 overflow-hidden">
                   <div className="flex items-start gap-4 mb-4">
                       <div 
                         onClick={onExpandWorkspace}
                         className="relative w-16 h-12 bg-[#f8f9fa] rounded-xl border border-gray-100 overflow-hidden cursor-pointer group shrink-0"
                       >
                           <div className="p-1 space-y-1 opacity-20 h-full w-full">
                             <div className="h-1 w-full bg-gray-400 rounded"></div>
                             <div className="h-1 w-3/4 bg-gray-400 rounded"></div>
                             <div className="h-1 w-5/6 bg-gray-400 rounded"></div>
                           </div>
                           <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 flex items-center justify-center transition-all">
                              <div className="bg-white/95 p-1 rounded-md shadow-sm opacity-80 scale-90">
                                <ICONS.Maximize />
                              </div>
                           </div>
                       </div>
                       <div className="flex-1 min-w-0">
                          <h4 className="text-[16px] font-bold text-gray-900 leading-none mb-1.5">Axon's computer</h4>
                          <p className="text-[14px] font-medium text-gray-400 leading-tight">Axon is using the browser</p>
                          <p className="text-[12px] font-bold text-gray-300 mt-1">{formatTime(elapsedSeconds)}</p>
                       </div>
                       <button onClick={() => setIsPlannerExpanded(!isPlannerExpanded)} className="text-gray-300 hover:text-gray-600 transition-colors pt-1">
                          {isPlannerExpanded ? <ICONS.ChevronUp /> : <ICONS.ChevronDown />}
                       </button>
                   </div>
                   {isPlannerExpanded && (
                      <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[16px] font-bold text-gray-900">Planner</h5>
                           <span className="text-[14px] font-bold text-gray-300">{completedStepsCount}/{totalSteps}</span>
                        </div>
                        <div className="space-y-4">
                           {steps.map((step, idx) => (
                             <div key={idx} className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${step.status === 'completed' ? 'text-green-500 bg-green-50 border-transparent' : 'border-gray-200'}`}>
                                   {step.status === 'completed' && <ICONS.Check />}
                                </div>
                                <span className={`text-[15px] font-bold tracking-tight ${step.status === 'pending' ? 'text-gray-300' : 'text-gray-700'}`}>{step.title}</span>
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
