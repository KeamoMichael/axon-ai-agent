
import React from 'react';
import { ICONS } from '../constants';
import { ChatSession } from '../types';

interface HistoryInterfaceProps {
    sessions: ChatSession[];
    onNewChat: () => void;
    onSelectChat: (id: string) => void;
    onOpenSidebar: () => void;
}

const HistoryInterface: React.FC<HistoryInterfaceProps> = ({ sessions, onNewChat, onSelectChat, onOpenSidebar }) => {
    // Sort sessions by timestamp descending
    const sortedSessions = [...sessions].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="flex flex-col h-full bg-white relative">
            <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-30 bg-white border-b border-gray-100/80 animate-fade">
                <div className="flex-1 flex justify-start">
                    <button 
                        onClick={onOpenSidebar} 
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-50 text-gray-400 hover:text-black transition-colors"
                    >
                        <ICONS.User />
                    </button>
                </div>
                
                <div className="flex items-center gap-2.5 animate-reveal">
                    <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
                    </div>
                    <span className="logo-font text-[23px] text-black font-bold tracking-tighter lowercase leading-none pb-0.5">axon</span>
                </div>

                <div className="flex-1 flex justify-end">
                    <div className="w-10 h-10" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-10 pb-24 scrollbar-hide">
                <div className="max-w-xl mx-auto pt-12 pb-16">
                    {sortedSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                                <ICONS.Book />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg">No history yet</h3>
                            <p className="text-gray-400 text-sm max-w-[200px] mt-1">Interactions with Axon will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {sortedSessions.map((item, idx) => (
                                <button 
                                    key={item.id}
                                    onClick={() => onSelectChat(item.id)}
                                    className={`w-full text-left group transition-all opacity-0 animate-reveal stagger-${(idx % 5) + 1}`}
                                >
                                    <div className="py-7 flex items-center gap-6 border-b border-transparent hover:bg-gray-50/50 rounded-xl px-4 -mx-4 transition-colors">
                                        <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-black transition-all shrink-0">
                                            {item.iconType === 'globe' && <ICONS.Globe />}
                                            {item.iconType === 'code' && <ICONS.Terminal />}
                                            {item.iconType === 'search' && <ICONS.Search />}
                                            {item.iconType === 'file' && <ICONS.Book />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[19px] text-gray-900 truncate leading-none mb-2 tracking-tight">{item.title}</h4>
                                            <p className="text-[#9ca4b3] text-[15px] truncate font-medium">{item.preview}</p>
                                        </div>
                                        <div className="text-right shrink-0 ml-6">
                                            <span className="text-[14px] font-medium text-[#d1d5db] lowercase">
                                                {getTimeAgo(item.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-12 right-12 z-40">
                <button 
                    onClick={onNewChat}
                    className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group animate-reveal stagger-5"
                >
                    <ICONS.Plus />
                </button>
            </div>
        </div>
    );
};

export default HistoryInterface;
