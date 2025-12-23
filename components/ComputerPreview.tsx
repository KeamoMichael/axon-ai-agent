import React, { useState, useEffect } from 'react';

interface ComputerPreviewProps {
    isActive: boolean;
    currentAction?: string; // "Using Browser", "Running Code", "Executing Strategy"
    browserUrl?: string;
    executionTime?: number; // seconds
    onTakeControl?: () => void;
    onExpand?: () => void;
}

const ComputerPreview: React.FC<ComputerPreviewProps> = ({
    isActive,
    currentAction = "Executing strategy",
    browserUrl,
    executionTime = 0,
    onTakeControl,
    onExpand
}) => {
    const [timer, setTimer] = useState(executionTime);

    useEffect(() => {
        if (!isActive) return;
        const interval = setInterval(() => {
            setTimer(t => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isActive]);

    useEffect(() => {
        setTimer(executionTime);
    }, [executionTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isActive) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Header with computer icon */}
            <div className="px-5 py-4 flex items-center gap-4">
                {/* Computer Preview Thumbnail */}
                <div className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {browserUrl ? (
                        <div className="w-full h-full bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
                            {/* Mock browser chrome */}
                            <div className="h-3 bg-gray-200 flex items-center px-1 gap-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                            </div>
                            {/* Mock URL bar */}
                            <div className="flex-1 flex items-center justify-center px-1">
                                <div className="w-full h-1.5 bg-gray-300 rounded"></div>
                            </div>
                            {/* Mock content area */}
                            <div className="flex-1 flex items-center justify-center">
                                <div className="w-8 h-4 bg-gray-300 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    )}
                    {/* Expand button */}
                    <button
                        onClick={onExpand}
                        className="absolute top-1 right-1 w-5 h-5 bg-white/80 rounded flex items-center justify-center hover:bg-white transition-colors"
                    >
                        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </div>

                {/* Title and status */}
                <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">Axon's computer</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
                            {browserUrl ? (
                                <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            ) : (
                                <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                        <span className="text-sm text-gray-500">{currentAction}</span>
                        <span className="text-sm text-gray-400">· {formatTime(timer)}</span>
                    </div>
                </div>

                {/* Dropdown arrow */}
                <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {/* Browser View (expanded) */}
            {browserUrl && (
                <div className="border-t border-gray-100">
                    {/* Browser chrome */}
                    <div className="bg-gray-50 px-4 py-2 flex items-center gap-2">
                        <div className="flex gap-1">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 truncate">
                            {browserUrl}
                        </div>
                    </div>

                    {/* Mock browser content */}
                    <div className="bg-white h-48 flex items-center justify-center relative">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-gray-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <p className="text-sm text-gray-500">Loading page...</p>
                        </div>

                        {/* Take control button */}
                        <button
                            onClick={onTakeControl}
                            className="absolute bottom-4 right-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            Take control
                        </button>
                    </div>

                    {/* Footer with live indicator */}
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900">Axon is using Browser</p>
                                <p className="text-xs text-gray-500">Browsing: {browserUrl}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-gray-400">
                            <button className="hover:text-gray-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg></button>
                            <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-600">Live</span>
                            </div>
                            <button className="hover:text-gray-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComputerPreview;
