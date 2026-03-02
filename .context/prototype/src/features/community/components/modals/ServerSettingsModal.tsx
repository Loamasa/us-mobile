import React, { useState, useRef } from 'react';
import { X, Check, Layout, Globe, Hash, Shield, Bell, Users, Trash2, ListFilter, MapPin, Zap, AlertCircle, Coins } from 'lucide-react';
import { Community } from '../../../../types';
import { useCommunityContext } from '../../context/CommunityContext';
import { LocalSettingsView, SettingsViewHandle } from './settings/LocalSettingsView';
import { TopicSettingsView } from './settings/TopicSettingsView';
import { CommunityTreasury } from '../../../monetization/components/CommunityTreasury';

interface ServerSettingsModalProps {
  community: Community;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<Community>) => void;
}

export type SettingsTab = 
  | 'OVERVIEW' 
  | 'VISIBILITY' 
  | 'CHANNELS' 
  | 'ROLES' 
  | 'NOTIFICATIONS' 
  | 'MEMBERS' 
  | 'CONNECTED_LOCALS' 
  | 'AGGREGATION'
  | 'TREASURY'; // NEW

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ community, onClose, onSubmit }) => {
  const { userRole } = useCommunityContext();
  const [activeTab, setActiveTab] = useState<SettingsTab>('OVERVIEW');
  
  // Track dirty state from children to prevent accidental exit
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  
  // Ref to trigger save in child
  const settingsRef = useRef<SettingsViewHandle>(null);

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER';
  const isOwner = userRole === 'OWNER';
  const isTopic = community.type === 'TOPIC';
  
  const handleSave = (data: Partial<Community>) => {
    if (isAdmin) {
      onSubmit(community.id, data);
      setIsDirty(false); // Reset dirty state after save
    }
  };

  const handleClose = () => {
      if (isDirty) {
          setShowExitConfirm(true);
      } else {
          onClose();
      }
  };

  const handleSaveAndExit = () => {
      if (settingsRef.current) {
          settingsRef.current.save();
          // Small timeout to allow state update to propagate before closing, or assume save is sync
          // Ideally we wait for save completion but simple call is okay for MVP
          onClose(); 
      }
  };

  const SidebarItem = ({ tab, label, icon: Icon, danger = false }: { tab: SettingsTab, label: string, icon: any, danger?: boolean }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`
          w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between group
          ${activeTab === tab 
              ? 'bg-white/10 text-white' 
              : danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}
      `}
    >
        <span className="flex items-center gap-3">
            <Icon size={16} />
            {label}
        </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F1115] flex animate-in fade-in duration-200 text-fog font-sans">
        
        {/* --- SIDEBAR SHELL --- */}
        <div className="w-64 bg-[#0A0A0A] flex flex-col border-r border-white/5 shrink-0">
            <div className="p-6 border-b border-white/5">
                <h2 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isTopic ? 'text-mint' : 'text-signal'}`}>
                    {isTopic ? 'Culture Settings' : 'Local Community Settings'}
                </h2>
                <div className="font-bold text-white truncate">{community.name}</div>
            </div>
            
            <div className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
                <div className="px-3 pt-3 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">General</div>
                <SidebarItem tab="OVERVIEW" label="Overview" icon={Layout} />
                <SidebarItem tab="VISIBILITY" label="Visibility" icon={Globe} />
                
                {isAdmin && (
                    <>
                      <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {isTopic ? 'Aggregation' : 'Structure'}
                      </div>
                      {isTopic ? (
                          <>
                            <SidebarItem tab="CONNECTED_LOCALS" label="Connected Locals" icon={MapPin} />
                            <SidebarItem tab="AGGREGATION" label="Aggregation Rules" icon={ListFilter} />
                          </>
                      ) : (
                          <SidebarItem tab="CHANNELS" label="Channels" icon={Hash} />
                      )}
                    </>
                )}
                
                <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">User Base</div>
                <SidebarItem tab="MEMBERS" label="Members" icon={Users} />
                <SidebarItem tab="ROLES" label="Roles" icon={Shield} />
                <SidebarItem tab="NOTIFICATIONS" label="Notifications" icon={Bell} />

                {/* Monetization Section */}
                <div className="px-3 pt-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Funding</div>
                <SidebarItem tab="TREASURY" label="Treasury" icon={Coins} />
            </div>
            
            <div className="p-4 bg-[#0A0A0A] border-t border-white/5">
                <button onClick={handleClose} className="w-full py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                    <X size={14} /> ESC
                </button>
            </div>
        </div>

        {/* --- CONTENT STRATEGY AREA --- */}
        <div className="flex-1 flex flex-col min-w-0 relative bg-void">
             <div className="absolute top-6 right-6 z-50">
                 <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/20 transition-colors">
                     <X size={20} />
                 </button>
             </div>

             <div className="flex-1 p-12 max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar relative">
                {activeTab === 'TREASURY' ? (
                    <CommunityTreasury communityId={community.id} />
                ) : isTopic ? (
                  <TopicSettingsView 
                    ref={settingsRef}
                    community={community} 
                    activeTab={activeTab} 
                    onSave={handleSave} 
                    setIsDirty={setIsDirty}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                  />
                ) : (
                  <LocalSettingsView 
                    ref={settingsRef}
                    community={community} 
                    activeTab={activeTab} 
                    onSave={handleSave} 
                    setIsDirty={setIsDirty}
                    isAdmin={isAdmin}
                    isOwner={isOwner}
                  />
                )}
             </div>
        </div>

        {/* EXIT CONFIRMATION MODAL */}
        {showExitConfirm && (
            <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                <div className="bg-[#1A1D21] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Unsaved Changes</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        You have unsaved changes. Do you want to save them before exiting?
                    </p>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setShowExitConfirm(false)}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onClose}
                            className="flex-1 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl font-bold text-sm transition-colors"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={handleSaveAndExit}
                            className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm text-white transition-colors shadow-lg shadow-green-500/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};