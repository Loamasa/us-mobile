import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Globe, Shield, Users, Check, AtSign, BellOff, Bell, ListFilter, MapPin, Search, Star, Ban, Zap, Info } from 'lucide-react';
import { Community, Visibility, NotificationSetting } from '../../../../../types';
import { SettingsTab } from '../ServerSettingsModal';
import { useCommunityContext } from '../../../context/CommunityContext';
import { SettingsViewHandle } from './LocalSettingsView'; // Import interface

interface TopicSettingsViewProps {
  community: Community;
  activeTab: SettingsTab;
  onSave: (data: Partial<Community>) => void;
  setIsDirty: (isDirty: boolean) => void;
  isAdmin: boolean;
  isOwner: boolean;
}

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void, disabled?: boolean }) => (
    <button 
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${checked ? 'bg-mint' : 'bg-white/10'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

export const TopicSettingsView = forwardRef<SettingsViewHandle, TopicSettingsViewProps>(({ community, activeTab, onSave, setIsDirty, isAdmin, isOwner }, ref) => {
  const { allCommunities, connectedLocalCommunities } = useCommunityContext();
  
  // State for Overview
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [visibility, setVisibility] = useState<Visibility>(community.visibility);
  const [iconUrl, setIconUrl] = useState(community.iconUrl);
  
  // Mock Aggregation State (Since not in type yet, we manage locally for UI)
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [minAttendees, setMinAttendees] = useState(5);
  const [autoApprove, setAutoApprove] = useState(true);

  // Dirty Detection
  const hasChanges = useMemo(() => {
      if (name !== community.name) return true;
      if (description !== community.description) return true;
      if (visibility !== community.visibility) return true;
      if (iconUrl !== community.iconUrl) return true;
      return false;
  }, [name, description, visibility, iconUrl, community]);

  // Notify parent of dirty state
  useEffect(() => {
      setIsDirty(hasChanges);
  }, [hasChanges, setIsDirty]);

  const handleReset = () => {
      setName(community.name);
      setDescription(community.description);
      setVisibility(community.visibility);
      setIconUrl(community.iconUrl);
  };

  const handleSaveChanges = () => {
      onSave({ name, description, visibility, iconUrl });
  };

  // Expose save to parent
  useImperativeHandle(ref, () => ({
      save: handleSaveChanges
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      
      {/* --- TAB: OVERVIEW --- */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-mint/10 rounded-2xl text-mint border border-mint/20"><Globe size={24} /></div>
              <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">Culture Overview</h1>
                  <p className="text-gray-500 text-sm">Identity of your culture</p>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0 flex flex-col items-center">
                    <div className="relative group w-32 h-32">
                        <img src={iconUrl} className="w-full h-full rounded-full object-cover border-4 border-mint/20 shadow-2xl" alt="Icon" />
                        {isAdmin && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Culture Name</label>
                        <input 
                            value={name} 
                            disabled={!isAdmin}
                            onChange={e => setName(e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-mint/50 transition-all font-bold" 
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Mission Statement</label>
                        <textarea 
                            value={description} 
                            disabled={!isAdmin}
                            onChange={e => setDescription(e.target.value)} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white h-32 resize-none focus:border-mint/50 transition-all text-sm leading-relaxed" 
                        />
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- TAB: VISIBILITY --- */}
      {activeTab === 'VISIBILITY' && (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Discovery Mode</h1>
                <p className="text-gray-400">Cultures are global. This controls how others find and follow this culture.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {[Visibility.PUBLIC, Visibility.LINK_ONLY].map(v => (
                    <button 
                      key={v} 
                      disabled={!isAdmin}
                      onClick={() => setVisibility(v)} 
                      className={`flex items-start gap-5 p-6 rounded-3xl border text-left transition-all ${visibility === v ? 'bg-mint/10 border-mint/50 shadow-lg shadow-mint/5' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                        <div className={`p-4 rounded-2xl ${visibility === v ? 'bg-mint text-black shadow-lg shadow-mint/20' : 'bg-white/5 text-gray-500'}`}>
                          {v === Visibility.PUBLIC ? <Globe size={24} /> : <Shield size={24} />}
                        </div>
                        <div className="flex-1">
                          <div className={`font-black text-xl ${visibility === v ? 'text-white' : 'text-gray-300'} uppercase tracking-tight`}>
                            {v.toLowerCase().replace('_', ' ')}
                          </div>
                          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                            {v === Visibility.PUBLIC ? 'Visible to everyone in global search. Ideal for growing a broad culture.' : 'Hidden from search. Only users with an invite link can find and follow this hub.'}
                          </p>
                        </div>
                        {visibility === v && <Check className="text-mint shrink-0 mt-1" size={24} />}
                    </button>
                ))}
            </div>
        </div>
      )}

      {/* --- TAB: CONNECTED LOCALS --- */}
      {activeTab === 'CONNECTED_LOCALS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Connected Locals</h1>
                    <p className="text-gray-400">Manage the local communities that contribute to this hub's feed.</p>
                  </div>
                  <div className="text-right">
                      <span className="text-3xl font-black text-mint">{connectedLocalCommunities.length}</span>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Locals</p>
                  </div>
              </div>

              <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-mint transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search connected communities..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-mint/50 transition-all"
                  />
              </div>

              <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                              <th className="p-6">Community</th>
                              <th className="p-6">Location</th>
                              <th className="p-6 text-right">Moderation</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                          {connectedLocalCommunities.map(c => (
                              <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                                  <td className="p-6">
                                      <div className="flex items-center gap-4">
                                          <img src={c.iconUrl} className="w-12 h-12 rounded-xl object-cover shadow-lg border border-white/10" alt={c.name} />
                                          <div>
                                              <div className="font-bold text-white group-hover:text-mint transition-colors">{c.name}</div>
                                              <div className="text-xs text-gray-500">{c.memberCount} members</div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-6">
                                      <span className="text-xs font-medium text-gray-400 flex items-center gap-1.5"><MapPin size={12} className="text-mint" /> {c.location.city}</span>
                                  </td>
                                  <td className="p-6 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button className="p-2.5 bg-mint/10 hover:bg-mint text-mint hover:text-black rounded-xl transition-all" title="Pin to Highlights"><Star size={16} /></button>
                                          <button className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all" title="Blacklist Community"><Ban size={16} /></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* --- TAB: AGGREGATION RULES --- */}
      {activeTab === 'AGGREGATION' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-2 duration-300">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Aggregation Rules</h1>
                <p className="text-gray-400">Define what happenings and events get pulled into the Hub's feed.</p>
              </div>

              <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                      <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                              <div className="p-3 bg-mint/10 text-mint rounded-2xl border border-mint/20 mt-1"><Shield size={20}/></div>
                              <div>
                                  <h3 className="font-bold text-white text-lg">Verified Communities Only</h3>
                                  <p className="text-sm text-gray-500 max-w-sm">Only show happenings from communities vetted by topic curators.</p>
                              </div>
                          </div>
                          <Toggle checked={verifiedOnly} onChange={setVerifiedOnly} disabled={!isAdmin} />
                      </div>

                      <div className="h-[1px] bg-white/5"></div>

                      <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                              <div className="p-3 bg-mint/10 text-mint rounded-2xl border border-mint/20 mt-1"><Zap size={20}/></div>
                              <div>
                                  <h3 className="font-bold text-white text-lg">Auto-Feature Large Events</h3>
                                  <p className="text-sm text-gray-500 max-w-sm">Automatically pin events to the top if they exceed {minAttendees} attendees.</p>
                              </div>
                          </div>
                          <Toggle checked={autoApprove} onChange={setAutoApprove} disabled={!isAdmin} />
                      </div>

                      <div className="h-[1px] bg-white/5"></div>

                      <div className="pt-2">
                          <div className="flex justify-between items-center mb-6">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Min. Attendees for Feed</label>
                              <span className="text-2xl font-black text-mint font-mono">{minAttendees}</span>
                          </div>
                          <input 
                            type="range" min="0" max="50" step="5" 
                            value={minAttendees} 
                            disabled={!isAdmin}
                            onChange={(e) => setMinAttendees(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-mint"
                          />
                          <p className="text-[10px] text-gray-600 mt-4 italic flex items-center gap-2">
                              <Info size={12} /> Smaller gatherings will remain local and won't appear in the Global Hub Happenings.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- TAB: NOTIFICATIONS --- */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
            <h1 className="text-2xl font-bold text-white">Culture Notifications</h1>
            <p className="text-gray-400">Customize how you receive alerts for global activity in this hub.</p>

            <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/10">
                <button onClick={() => isAdmin && onSave({ defaultNotificationLevel: 'ALL' })} className="w-full flex items-center justify-between p-8 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl transition-all ${community.defaultNotificationLevel === 'ALL' ? 'bg-mint text-black shadow-lg shadow-mint/20' : 'bg-white/5 text-gray-500 group-hover:text-gray-400'}`}>
                            <Bell size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-black text-xl text-white uppercase tracking-tight">Push All Happenings</div>
                            <p className="text-sm text-gray-500 mt-1">Get notified for every gathering and event in this hub.</p>
                        </div>
                    </div>
                    {community.defaultNotificationLevel === 'ALL' && <Check className="text-mint shrink-0" size={24} />}
                </button>

                <button onClick={() => isAdmin && onSave({ defaultNotificationLevel: 'MENTIONS' })} className="w-full flex items-center justify-between p-8 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-2xl transition-all ${community.defaultNotificationLevel === 'MENTIONS' ? 'bg-mint text-black shadow-lg shadow-mint/20' : 'bg-white/5 text-gray-500 group-hover:text-gray-400'}`}>
                            <AtSign size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-black text-xl text-white uppercase tracking-tight">Vetted Pulse</div>
                            <p className="text-sm text-gray-500 mt-1">Only get notified about happenings from verified communities.</p>
                        </div>
                    </div>
                    {community.defaultNotificationLevel === 'MENTIONS' && <Check className="text-mint shrink-0" size={24} />}
                </button>
            </div>
        </div>
      )}

      {/* --- TAB: MEMBERS --- */}
      {activeTab === 'MEMBERS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-end">
                <h1 className="text-2xl font-bold text-white">Followers & Curators</h1>
                <span className="bg-mint/10 text-mint text-[10px] font-black px-2 py-1 rounded border border-mint/20 uppercase tracking-widest">{community.memberCount} Followers</span>
              </div>
              
              <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                  <Users size={48} className="text-gray-700 mb-4" />
                  <h3 className="text-xl font-bold text-white">Follower List Coming Soon</h3>
                  <p className="text-gray-500 max-w-sm mt-2 text-sm leading-relaxed">
                      We're building advanced moderation tools to help you manage the curators and followers of this global topic hub.
                  </p>
              </div>
          </div>
      )}

      {/* Floating Save Bar */}
      {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-full max-w-2xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
                  <div className="text-sm font-bold text-white pl-2">
                      Careful — you have unsaved changes!
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={handleReset}
                          className="px-4 py-2 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors"
                      >
                          Reset
                      </button>
                      <button 
                          onClick={handleSaveChanges}
                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-green-500/20"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
});