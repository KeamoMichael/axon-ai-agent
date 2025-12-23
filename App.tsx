
import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import HistoryInterface from './components/HistoryInterface';
import AgentWorkspace from './components/AgentWorkspace';
import { ChatMessage, PlanStep, GroundingMetadata, AgentStatus, AgentLog, WorkspaceState, GeneratedFile, ChatSession } from './types';
import { GeminiAgent } from './services/geminiService';
import { GenerateContentResponse } from '@google/genai';

const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for fade-out animation
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${!isVisible ? 'opacity-0 scale-110 pointer-events-none' : 'opacity-100 scale-100'}`}>
      <div className="relative flex flex-col items-center">
        <div className="absolute inset-0 bg-black/5 blur-[80px] rounded-full scale-150 animate-pulse duration-[3000ms]"></div>

        <div className="relative w-24 h-24 bg-black rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-reveal">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-fade stagger-1">
            <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 8v8" /><path d="M8 12h8" />
          </svg>
        </div>

        <div className="mt-8 overflow-hidden">
          <h1 className="logo-font text-[32px] text-black tracking-tighter lowercase animate-reveal stagger-2">
            axon
          </h1>
        </div>

        <div className="mt-4 flex gap-1.5 animate-fade stagger-3">
          <div className="w-1 h-1 bg-gray-200 rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-gray-200 rounded-full animate-bounce [animation-delay:0.2s]"></div>
          <div className="w-1 h-1 bg-gray-200 rounded-full animate-bounce [animation-delay:0.4s]"></div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'history' | 'chat'>('chat'); // Startup to chat
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [isWorkspaceExpanded, setIsWorkspaceExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<PlanStep[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceState>({ view: 'browser' });
  const [isApiConfigured, setIsApiConfigured] = useState(true);

  const agentRef = useRef<GeminiAgent | null>(null);

  useEffect(() => {
    agentRef.current = new GeminiAgent();
    setIsApiConfigured(agentRef.current.isApiConfigured());
  }, [currentSessionId]); // Re-init agent for new sessions to clear context


  const addLog = (message: string, type: AgentLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: new Date(), message, type }]);
  };

  const updateLastAssistantMessage = (updates: Partial<ChatMessage>) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      const lastMsg = newMsgs[newMsgs.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        newMsgs[newMsgs.length - 1] = { ...lastMsg, ...updates };
      }
      return newMsgs;
    });
  };

  const processResponse = async (response: GenerateContentResponse) => {
    const text = response.text || '';
    const functionCalls = response.functionCalls || [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata | undefined;

    if (functionCalls.length > 0) {
      for (const call of functionCalls) {
        switch (call.name) {
          case 'create_plan':
            const newSteps = (call.args as any).steps.map((s: any) => ({ ...s, status: 'pending' }));
            setCurrentSteps(newSteps);
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === 'assistant') return [...prev.slice(0, -1), { ...last, steps: newSteps }];
              return [...prev, { id: Date.now().toString(), role: 'assistant', content: '', timestamp: new Date(), steps: newSteps }];
            });
            const planResponse = await agentRef.current?.sendToolResponse(call.id, call.name, { success: true });
            if (planResponse) await processResponse(planResponse);
            break;

          case 'update_status':
            const { message, activeStepId, toolUsed } = call.args as any;
            if (activeStepId) {
              setCurrentSteps(prevSteps => {
                const updatedSteps = prevSteps.map(s => {
                  if (s.id === activeStepId) {
                    const newLog: AgentLog = {
                      id: Date.now().toString(),
                      timestamp: new Date(),
                      type: toolUsed === 'thinking' ? 'info' : 'tool',
                      message: message,
                      toolData: { tool: toolUsed }
                    };
                    return {
                      ...s,
                      status: 'active' as const,
                      description: message,
                      toolUsed: toolUsed || 'thinking',
                      logs: [...(s.logs || []), newLog]
                    };
                  }
                  if (s.status === 'active') return { ...s, status: 'completed' as const };
                  return s;
                });
                updateLastAssistantMessage({ steps: updatedSteps });
                return updatedSteps;
              });
              addLog(`${message}`, 'success');
            }
            const statusResponse = await agentRef.current?.sendToolResponse(call.id, call.name, { status: "updated" });
            if (statusResponse) await processResponse(statusResponse);
            break;

          case 'browse_url':
            const { url } = call.args as any;
            setWorkspace(prev => ({ ...prev, view: 'browser', url }));
            addLog(`Browsing: ${url}`, 'tool');
            setCurrentSteps(prev => {
              let targetIndex = prev.findIndex(s => s.status === 'active');
              if (targetIndex === -1) targetIndex = prev.findIndex(s => s.status === 'pending');

              if (targetIndex !== -1) {
                const updated = [...prev];
                const s = updated[targetIndex];
                const newLog: AgentLog = {
                  id: Date.now().toString(),
                  timestamp: new Date(),
                  type: 'tool',
                  message: `Browsing ${url}`,
                  toolData: { tool: 'browse', url }
                };
                updated[targetIndex] = {
                  ...s,
                  status: 'active',
                  toolInput: { type: 'browsing', value: url },
                  logs: [...(s.logs || []), newLog]
                } as PlanStep;
                updateLastAssistantMessage({ steps: updated });
                return updated;
              }
              return prev;
            });
            setTimeout(async () => {
              const nextResp = await agentRef.current?.sendToolResponse(call.id, call.name, { content: `Successfully parsed data from ${url}. Found relevant details for task.` });
              if (nextResp) await processResponse(nextResp);
            }, 2000);
            return;

          case 'web_search':
            const { query } = call.args as any;
            addLog(`Searching: ${query}`, 'tool');
            setCurrentSteps(prev => {
              let targetIndex = prev.findIndex(s => s.status === 'active');
              if (targetIndex === -1) targetIndex = prev.findIndex(s => s.status === 'pending');

              if (targetIndex !== -1) {
                const updated = [...prev];
                const s = updated[targetIndex];
                const newLog: AgentLog = {
                  id: Date.now().toString(),
                  timestamp: new Date(),
                  type: 'tool',
                  message: `Searching for ${query}`,
                  toolData: { tool: 'search', query }
                };
                updated[targetIndex] = {
                  ...s,
                  status: 'active',
                  searchQuery: query,
                  toolInput: { type: 'typing', value: query },
                  logs: [...(s.logs || []), newLog]
                } as PlanStep;
                updateLastAssistantMessage({ steps: updated });
                return updated;
              }
              return prev;
            });
            setTimeout(async () => {
              const searchResp = await agentRef.current?.sendToolResponse(call.id, call.name, {
                results: `Search results for "${query}": Found multiple relevant sources including recent articles and official documentation.`
              });
              if (searchResp) await processResponse(searchResp);
            }, 1500);
            return;

          case 'execute_terminal':
            const { command } = call.args as any;
            setWorkspace(prev => ({ ...prev, view: 'terminal' }));
            addLog(`Executing command: ${command}`, 'tool');
            setCurrentSteps(prev => {
              let targetIndex = prev.findIndex(s => s.status === 'active');
              if (targetIndex === -1) targetIndex = prev.findIndex(s => s.status === 'pending');

              if (targetIndex !== -1) {
                const updated = [...prev];
                const s = updated[targetIndex];
                const newLog: AgentLog = {
                  id: Date.now().toString(),
                  timestamp: new Date(),
                  type: 'tool',
                  message: `Running command: ${command}`,
                  toolData: { tool: 'terminal', command }
                };
                updated[targetIndex] = {
                  ...s,
                  status: 'active',
                  toolInput: { type: 'terminal', value: command },
                  logs: [...(s.logs || []), newLog]
                } as PlanStep;
                updateLastAssistantMessage({ steps: updated });
                return updated;
              }
              return prev;
            });
            setTimeout(async () => {
              await agentRef.current?.sendToolResponse(call.id, call.name, { output: "Command executed successfully. Output captured." });
            }, 1000);
            break;
        }
      }
    } else if (text) {
      const mockFiles: GeneratedFile[] = [];
      if (text.toLowerCase().includes('index.html') || text.toLowerCase().includes('code')) {
        mockFiles.push({ name: 'index.html', type: 'code', size: '384 B' });
        mockFiles.push({ name: 'project_files.zip', type: 'zip', size: '1.2 MB' });
      }

      setMessages(prev => {
        const last = prev[prev.length - 1];
        const updatedMessages = last?.role === 'assistant'
          ? [...prev.slice(0, -1), { ...last, content: text, steps: (last.steps || []).map(s => ({ ...s, status: 'completed' as const })), groundingMetadata, generatedFiles: mockFiles }]
          : [...prev, { id: Date.now().toString(), role: 'assistant', content: text, timestamp: new Date(), groundingMetadata, generatedFiles: mockFiles }];

        // Update session in history when assistant finishes
        if (currentSessionId) {
          setSessions(old => old.map(s => s.id === currentSessionId ? { ...s, preview: text.slice(0, 50) + '...', messages: updatedMessages } : s));
        }
        return updatedMessages;
      });
      setIsProcessing(false);
      setCurrentSteps([]);
      addLog("Task completed successfully.", "success");
    }
  };

  const handleSendMessage = useCallback(async (content: string) => {
    if (!agentRef.current) return;
    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: new Date() };

    setMessages(prev => {
      const updated = [...prev, userMessage];
      // Only appear in history if user has interacted
      if (!currentSessionId) {
        const newId = Date.now().toString();
        const newSession: ChatSession = {
          id: newId,
          title: content.length > 30 ? content.slice(0, 30) + '...' : content,
          preview: 'Thinking...',
          messages: updated,
          timestamp: new Date(),
          iconType: 'globe'
        };
        setCurrentSessionId(newId);
        setSessions(prevS => [newSession, ...prevS]);
      } else {
        setSessions(prevS => prevS.map(s => s.id === currentSessionId ? { ...s, messages: updated, timestamp: new Date() } : s));
      }
      return updated;
    });

    setIsProcessing(true);
    setView('chat');
    addLog(`User objective: ${content}`);
    try {
      const response = await agentRef.current.sendMessage(content);
      await processResponse(response);
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
      addLog("An error occurred during task execution.", "error");
    }
  }, [currentSessionId]);

  const handleSelectChat = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      setView('chat');
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setCurrentSteps([]);
    setLogs([]);
    setView('chat');
  };

  const activeStep = currentSteps.find(s => s.status === 'active') || currentSteps[0];

  return (
    <div className={`h-screen w-screen overflow-hidden bg-white ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {!isApiConfigured && !isLoading && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-sm text-amber-800">
              <strong>API Key Required:</strong> Add <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">GEMINI_API_KEY</code> to your Vercel environment variables to enable AI functionality.
            </p>
          </div>
        </div>
      )}


      {isWorkspaceExpanded && (
        <AgentWorkspace
          status={isProcessing ? AgentStatus.EXECUTING : AgentStatus.FINISHED}
          statusMessage={activeStep?.title || "Agent Workstation"}
          plan={currentSteps}
          logs={logs}
          workspace={workspace}
          onClose={() => setIsWorkspaceExpanded(false)}
        />
      )}

      <main className={`main-container flex h-full w-full relative transition-opacity duration-1000 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <div className={`absolute inset-0 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${view === 'history' ? 'translate-y-0 opacity-100 z-20' : '-translate-y-full opacity-0 z-10 pointer-events-none'}`}>
          <HistoryInterface
            sessions={sessions}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        </div>
        <div className={`absolute inset-0 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${view === 'chat' ? 'translate-y-0 opacity-100 z-20' : 'translate-y-full opacity-0 z-10 pointer-events-none'}`}>
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            onOpenSidebar={() => setView('history')}
            onExpandWorkspace={() => setIsWorkspaceExpanded(true)}
            activeStep={activeStep}
            steps={currentSteps}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
