
import React, { useState } from 'react';
import { ICONS } from '../constants';
import { AgentStatus, PlanStep, AgentLog, WorkspaceState } from '../types';

interface AgentWorkspaceProps {
  status: AgentStatus;
  statusMessage: string;
  plan: PlanStep[];
  logs: AgentLog[];
  workspace: WorkspaceState;
  onClose: () => void;
}

const AgentWorkspace: React.FC<AgentWorkspaceProps> = ({ status, statusMessage, plan, logs, workspace, onClose }) => {
  const [activeTab, setActiveTab] = useState<'browser' | 'terminal'>(workspace.view === 'terminal' ? 'terminal' : 'browser');
  const [isAppSwitcherOpen, setIsAppSwitcherOpen] = useState(false);
  const [isPlannerExpanded, setIsPlannerExpanded] = useState(false);

  const activeStepIdx = plan.findIndex(s => s.status === 'active');
  const displayStep = activeStepIdx !== -1 ? plan[activeStepIdx] : plan[plan.length - 1];
  const stepProgress = `${activeStepIdx !== -1 ? activeStepIdx + 1 : (plan.length > 0 ? plan.length : 0)}/${plan.length}`;

  return (
    <div className="fixed inset-0 z-[200] bg-[#f2f2f2] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Top Header */}
      <header className="h-16 flex items-center justify-between px-6 shrink-0">
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-black transition-colors">
          <ICONS.X />
        </button>
        
        <h2 className="text-[20px] font-bold text-[#1a1a1a]">Axon's computer</h2>

        <div className="relative">
          <button 
            onClick={() => setIsAppSwitcherOpen(!isAppSwitcherOpen)}
            className="flex items-center gap-1 bg-[#e0e0e0] hover:bg-gray-200 px-3 py-1.5 rounded-2xl transition-all"
          >
            <div className="scale-90 text-gray-700">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="15" x="2" y="3" rx="2"/><path d="M7 21h10"/><path d="M12 18v3"/></svg>
            </div>
            <ICONS.ChevronDown />
          </button>
          
          {isAppSwitcherOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95">
              <p className="text-[14px] font-medium text-gray-400 px-4 py-3">Select an app to take control</p>
              <button 
                onClick={() => { setActiveTab('browser'); setIsAppSwitcherOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="text-blue-500"><ICONS.Globe /></div>
                <span className="text-[16px] font-medium text-gray-900">Browser</span>
              </button>
              <button 
                onClick={() => { setActiveTab('terminal'); setIsAppSwitcherOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="text-gray-600"><ICONS.Terminal /></div>
                <span className="text-[16px] font-medium text-gray-900">Terminal</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center px-6 overflow-hidden">
        <div className="w-full max-w-2xl flex-1 flex flex-col gap-8 py-4 overflow-y-auto scrollbar-hide">
          
          {/* Virtual Display Frame */}
          <div className="aspect-[4/3] w-full bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden relative flex flex-col">
            {activeTab === 'browser' ? (
              <div className="flex-1 flex flex-col h-full">
                <div className="h-10 border-b border-gray-50 flex items-center justify-center px-4 bg-white">
                  <span className="text-[13px] font-medium text-gray-400 underline decoration-gray-200 underline-offset-4">
                    {workspace.url || 'google.com'}
                  </span>
                </div>
                <div className="flex-1 bg-white p-8 relative overflow-hidden flex flex-col items-center justify-center">
                  <div className="w-full max-w-sm space-y-6 opacity-40">
                    <div className="h-4 bg-gray-100 rounded-full w-3/4 mx-auto"></div>
                    <div className="h-32 bg-gray-50 rounded-[2rem] border border-gray-100"></div>
                    <div className="h-4 bg-gray-100 rounded-full w-1/2 mx-auto"></div>
                  </div>
                  <button className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white border border-gray-100 px-6 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[15px] font-bold hover:scale-105 transition-transform active:scale-95">
                    <ICONS.Maximize /> Take control
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-[#fdfdfd] p-8 font-mono text-[14px] leading-relaxed text-[#2a2a2a] overflow-y-auto">
                <div className="text-green-600 font-bold mb-1">ubuntu@sandbox:~ $ <span className="text-black font-normal">pip3 install mido</span></div>
                <div className="text-gray-600 mb-1">Using Python 3.11.0rc1 environment at: /usr</div>
                <div className="text-gray-600 mb-1">Resolved <span className="font-bold">2 packages</span> in 112ms</div>
                <div className="text-gray-500 mb-4">Preparing packages... (0/1)</div>
                {logs.slice(-5).map(log => (
                  <div key={log.id} className="mb-1 text-gray-700">
                    {log.message}
                  </div>
                ))}
                <div className="text-red-500 mt-2 font-medium">error: Failed to install: mido-1.3.3-py3-none...</div>
              </div>
            )}
          </div>

          {/* Activity Status Pill */}
          <div className="flex items-center gap-4 animate-in fade-in">
             <div className="w-14 h-14 bg-[#e0e0e0] rounded-2xl flex items-center justify-center text-gray-500 shadow-sm border border-gray-200">
               {activeTab === 'browser' ? <ICONS.Globe /> : <ICONS.Terminal />}
             </div>
             <div>
                <h3 className="text-[18px] font-bold text-[#1a1a1a]">Axon is using {activeTab === 'browser' ? 'Browser' : 'Terminal'}</h3>
                <p className="text-[14px] text-gray-400 font-medium truncate max-w-xs">
                  {activeTab === 'browser' ? `Browsing: ${workspace.url || 'https://manus.ai'}` : 'Executing command: python3 generate_chord...'}
                </p>
             </div>
          </div>

          {/* Timeline Scrubber */}
          <div className="w-full pt-4">
            <div className="h-2 w-full bg-[#e0e0e0] rounded-full relative">
               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-16 py-4">
            <button className="text-[#1a1a1a] opacity-80 hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m11 19-7-7 7-7v14zm10 0-7-7 7-7v14z"/></svg>
            </button>
            
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              <span className="text-[16px] font-bold text-[#1a1a1a]">Live</span>
            </div>

            <button className="text-[#e0e0e0] cursor-not-allowed">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="m13 19 7-7-7-7v14zm-10 0 7-7-7-7v14z"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Step Progress Footer - Now Expandable */}
      <div className="px-6 pb-8 pt-2 flex flex-col items-center bg-[#f2f2f2] relative">
        <div className={`w-full max-w-2xl bg-white border border-gray-100 rounded-[2rem] shadow-sm transition-all duration-300 overflow-hidden ${isPlannerExpanded ? 'mb-4 pb-4' : ''}`}>
           {/* Expandable Plan List */}
           {isPlannerExpanded && (
             <div className="px-8 py-6 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-2">
                   <h5 className="text-[16px] font-bold text-gray-900">Planner</h5>
                   <span className="text-[14px] font-bold text-gray-300">{stepProgress}</span>
                </div>
                <div className="space-y-4">
                   {plan.map((step, idx) => (
                     <div key={idx} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${step.status === 'completed' ? 'text-green-500 bg-green-50 border-transparent' : 'border-gray-200'}`}>
                           {step.status === 'completed' && <ICONS.Check />}
                        </div>
                        <span className={`text-[15px] font-bold tracking-tight ${step.status === 'pending' ? 'text-gray-300' : 'text-gray-700'}`}>{step.title}</span>
                     </div>
                   ))}
                   {plan.length === 0 && (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full border border-gray-200"></div>
                        <span className="text-[15px] font-bold text-gray-300">Initializing objective...</span>
                      </div>
                   )}
                </div>
             </div>
           )}

           {/* Collapsed Pill (The main handle) */}
           <div 
             onClick={() => setIsPlannerExpanded(!isPlannerExpanded)}
             className={`h-14 flex items-center px-8 justify-between cursor-pointer hover:bg-gray-50 transition-colors ${isPlannerExpanded ? 'border-t border-gray-50' : ''}`}
           >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center text-green-500 shrink-0 shadow-sm border border-green-100/50">
                  <ICONS.Check />
                </div>
                <span className="text-[15px] font-bold text-gray-800 truncate">
                  {displayStep?.title || "Completing objective..."}
                </span>
              </div>
              
              <div className="flex items-center gap-3 shrink-0 ml-4">
                 <span className="text-[14px] font-bold text-gray-300 tracking-tight">{stepProgress}</span>
                 <div className={`transition-transform duration-300 ${isPlannerExpanded ? 'rotate-180' : ''} text-gray-300`}>
                    <ICONS.ChevronUp />
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AgentWorkspace;
