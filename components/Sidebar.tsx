import React from 'react';
import { ICONS } from '../constants';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <div className={`
        fixed inset-y-0 left-0 z-[110] 
        w-full max-w-sm bg-white border-r border-gray-200
        transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        flex flex-col
      `}>
        <div className="p-8 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
                <span className="logo-font text-lg text-black uppercase tracking-tight">Profile Center</span>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                    <ICONS.X />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-10">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-xl bg-black flex items-center justify-center text-white text-xl font-bold">
                        KM
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-gray-900">Keamogetswe</h2>
                        <p className="text-gray-400 font-medium text-xs tracking-wide">Premium Workspace Access</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <MenuButton icon={<ICONS.Calendar />} label="Scheduled Tasks" />
                    <MenuButton icon={<ICONS.Book />} label="Memory Library" />
                    <MenuButton icon={<ICONS.Plug />} label="Integrations" />
                    <MenuButton icon={<ICONS.Shield />} label="Privacy Center" />
                </div>
            </div>

            <div className="mt-auto pt-8 border-t border-gray-100">
                <button className="w-full bg-gray-50 border border-gray-200 text-gray-400 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                    Sign In
                    <span className="bg-[#f4f4f5] text-[10px] font-bold text-gray-400 px-1.5 py-0.5 rounded border border-gray-100 uppercase whitespace-nowrap">
                      Coming Soon
                    </span>
                </button>
            </div>
        </div>
      </div>
    </>
  );
};

const MenuButton = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
  <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-all group">
    <div className="flex items-center gap-4">
      <div className="text-gray-400 group-hover:text-black transition-colors">{icon}</div>
      <span className="text-[14px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
    </div>
    <div className="text-gray-200 group-hover:text-gray-400 transition-all">
        <ICONS.ChevronRight />
    </div>
  </button>
);

export default Sidebar;