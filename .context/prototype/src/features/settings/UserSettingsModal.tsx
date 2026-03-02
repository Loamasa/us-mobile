
import React, { useState } from 'react';
import { X, User, Shield, Bell, Eye, HelpCircle, Terminal, LogOut, Check, Image, ArrowLeft, Globe, AlertTriangle, Mail, Bug, ChevronDown, Ban, Search, Share2, Copy, QrCode, Sparkles, RefreshCw, PlayCircle, CreditCard, MapPin } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTutorial } from '../../context/TutorialContext';
import { UserSettings } from '../../types';
import { SubscriptionSettings } from '../monetization/components/SubscriptionSettings';
import { ManagePlacesModal } from './ManagePlacesModal';

interface UserSettingsModalProps {
  onClose: () => void;
  onLogout?: () => void;
  onRestartOnboarding?: () => void;
}

type Tab = 'ACCOUNT' | 'SUBSCRIPTION' | 'PRIVACY' | 'NOTIFICATIONS' | 'ACCESSIBILITY' | 'LANGUAGE' | 'BLOCKED' | 'HELP' | 'DEBUG';

const LANGUAGES = [
    { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', flag: '🇺🇸' },
    { code: 'en-UK', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧' },
    { code: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
    { code: 'es-ES', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr-FR', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
];

const FAQS = [
    { q: "What is 'us'?", a: "'us' is a community-first app designed to connect you with local groups and friends without algorithmic feeds or ads. We prioritize real-world connections." },
    { q: "How do I create a community?", a: "Go to the Communities tab and click the '+' icon in the sidebar rail. You can create Local communities for physical gatherings or Topic communities for global interests." },
    { q: "Is my data private?", a: "Yes. We prioritize privacy. Your messages are encrypted, and we don't sell your data to third parties. Ghost Mode allows you to hide your location instantly." },
    { q: "What is Ghost Mode?", a: "Ghost Mode hides your live location from the map. You can toggle it from the main map view or in the Privacy settings tab." },
    { q: "Can I use 'us' without location?", a: "While the map features require location services, you can still use chat and community features without sharing your precise location." },
];

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button 
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full p-1 transition-colors ${checked ? 'bg-signal' : 'bg-white/10'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
);

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ onClose, onLogout, onRestartOnboarding }) => {
  const { currentUser, updateUserProfile, applyTemplate, resetData, deleteAccount, users, unblockUser, blockUser } = useData();
  const { isSystemActive, setTutorialsEnabled, resetTutorials } = useTutorial();
  const [activeTab, setActiveTab] = useState<Tab>('ACCOUNT');
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [showPlacesModal, setShowPlacesModal] = useState(false);

  // Account Form State
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [handle, setHandle] = useState(currentUser.handle);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);

  // Share Profile State
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Block Search State
  const [blockSearch, setBlockSearch] = useState('');

  // Account Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Logout Confirmation State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Help State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleSaveAccount = () => {
      updateUserProfile({ displayName, handle, bio, avatarUrl });
  };

  const handleDeleteAccount = () => {
      if (deleteInput === 'DELETE') {
          deleteAccount();
      }
  };

  const handleTabSelect = (tab: Tab) => {
      setActiveTab(tab);
      setShowMobileMenu(false);
  };

  const handleLanguageChange = (code: string) => {
      updateUserProfile({ 
          settings: { 
              ...currentUser.settings!, 
              language: code 
          } 
      });
  };

  // Generic handler for boolean/value settings
  const handleSettingChange = (key: keyof UserSettings, value: any) => {
      if (!currentUser.settings) return;
      updateUserProfile({
          settings: {
              ...currentUser.settings,
              [key]: value
          }
      });
  };

  const handleCopyLink = () => {
      const link = `https://us.app/${currentUser.handle.replace('@', '')}`;
      navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  const currentLanguage = currentUser.settings?.language || 'en-US';

  const SidebarItem = ({ tab, label, icon: Icon }: any) => (
      <button 
        onClick={() => handleTabSelect(tab)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
          <Icon size={18} /> {label}
      </button>
  );

  // Filter users for blocking (exclude self and already blocked)
  const usersToBlock = blockSearch.trim() ? users.filter(u => 
    u.id !== currentUser.id && 
    !currentUser.blockedUserIds?.includes(u.id) &&
    (u.displayName.toLowerCase().includes(blockSearch.toLowerCase()) || 
     u.handle.toLowerCase().includes(blockSearch.toLowerCase()))
  ) : [];

  const handleResetTutorials = () => {
      resetTutorials();
      window.alert("Tutorial history cleared. You will see tips again as you navigate.");
  };

  return (
      <div className="fixed inset-0 z-[100] bg-[#0F1115] flex animate-in fade-in duration-200 font-sans text-fog">
          {/* Sidebar */}
          <div className={`w-full md:w-64 border-r border-white/5 bg-[#0A0A0A] flex-col shrink-0 ${showMobileMenu ? 'flex' : 'hidden'} md:flex`}>
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                  <h2 className="font-bold text-white text-lg">Settings</h2>
                  {/* Mobile Close Button (Visible in Menu View) */}
                  <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
                      <X size={20} />
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">User Settings</div>
                  <SidebarItem tab="ACCOUNT" label="My Account" icon={User} />
                  <SidebarItem tab="SUBSCRIPTION" label="Subscription" icon={CreditCard} />
                  
                  {/* My Places Button - Special Case */}
                  <button 
                    onClick={() => setShowPlacesModal(true)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:bg-white/5 hover:text-white"
                  >
                      <MapPin size={18} /> My Places
                  </button>

                  <SidebarItem tab="PRIVACY" label="Privacy & Safety" icon={Shield} />
                  <SidebarItem tab="BLOCKED" label="Blocked Users" icon={Ban} />
                  <SidebarItem tab="NOTIFICATIONS" label="Notifications" icon={Bell} />
                  <SidebarItem tab="ACCESSIBILITY" label="Accessibility" icon={Eye} />
                  <SidebarItem tab="LANGUAGE" label="Language" icon={Globe} />
                  
                  <div className="my-4 h-[1px] bg-white/5 mx-3"></div>
                  
                  <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">App</div>
                  <SidebarItem tab="HELP" label="Help & Support" icon={HelpCircle} />
                  <SidebarItem tab="DEBUG" label="Developer / Debug" icon={Terminal} />
                  
                  <div className="my-4 h-[1px] bg-white/5 mx-3"></div>
                  
                  <button 
                    onClick={() => setShowLogoutConfirm(true)} 
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                      <LogOut size={18} /> Log Out
                  </button>
              </div>
          </div>

          {/* Content */}
          <div className={`flex-1 flex-col min-w-0 bg-void relative ${!showMobileMenu ? 'flex' : 'hidden'} md:flex`}>
              {/* Mobile Navigation Header */}
              <div className="absolute top-6 left-6 z-50 md:hidden">
                  <button 
                    onClick={() => setShowMobileMenu(true)} 
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                      <ArrowLeft size={20} />
                  </button>
              </div>

              {/* Desktop Close Button */}
              <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors z-50">
                  <X size={20} />
              </button>

              <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-3xl custom-scrollbar pt-20 md:pt-12">
                  {/* TABS CONTENT */}
                  {activeTab === 'ACCOUNT' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">My Account</h1>
                          
                          <div className="flex flex-col md:flex-row items-start gap-8 bg-white/5 p-6 md:p-8 rounded-2xl border border-white/5">
                              <div className="relative group cursor-pointer shrink-0 mx-auto md:mx-0">
                                  <img src={avatarUrl} className="w-32 h-32 rounded-full object-cover border-4 border-[#0A0A0A] ring-1 ring-white/10 group-hover:ring-signal/50 transition-colors" alt="Avatar" />
                                  <div className="absolute top-0 right-0 p-2 bg-black rounded-full border border-white/10 text-white shadow-lg">
                                      <Image size={14} />
                                  </div>
                              </div>
                              <div className="flex-1 space-y-5 w-full">
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Display Name</label>
                                      <input 
                                        value={displayName} 
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-signal/50 font-bold"
                                      />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Handle</label>
                                          <input 
                                            value={handle} 
                                            onChange={(e) => setHandle(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-signal/50"
                                          />
                                      </div>
                                      <div>
                                          <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Avatar URL</label>
                                          <input 
                                            value={avatarUrl} 
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-signal/50"
                                          />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Bio</label>
                                      <textarea 
                                        value={bio} 
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-signal/50 h-24 resize-none"
                                      />
                                  </div>
                                  <div className="flex flex-col md:flex-row gap-3 justify-end pt-2">
                                      <button 
                                        onClick={() => setShowShareModal(true)} 
                                        className="w-full md:w-auto px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                      >
                                          <Share2 size={16} /> Share Profile
                                      </button>
                                      <button 
                                        onClick={handleSaveAccount} 
                                        className="w-full md:w-auto px-6 py-2.5 bg-signal hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-signal/20"
                                      >
                                          <Check size={16} /> Save Changes
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* DANGER ZONE */}
                          <div className="h-[1px] bg-white/5 my-8"></div>
                          <div className="space-y-4">
                                <h3 className="text-red-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                                    <AlertTriangle size={14} /> Danger Zone
                                </h3>
                                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                                    <h4 className="font-bold text-white mb-1">Delete Account</h4>
                                    <p className="text-xs text-gray-400 mb-4">
                                        Permanently delete your account and all associated data. This action cannot be undone.
                                    </p>
                                    {!showDeleteConfirm ? (
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-colors"
                                        >
                                            Delete Account
                                        </button>
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                            <p className="text-xs font-bold text-white">
                                                Type <span className="font-mono text-red-400 select-all">DELETE</span> to confirm:
                                            </p>
                                            <input 
                                                type="text" 
                                                value={deleteInput}
                                                onChange={(e) => setDeleteInput(e.target.value)}
                                                className="w-full bg-black/20 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                                                placeholder="DELETE"
                                            />
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={handleDeleteAccount}
                                                    disabled={deleteInput !== 'DELETE'}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${deleteInput === 'DELETE' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                                                >
                                                    Confirm Delete
                                                </button>
                                                <button 
                                                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'SUBSCRIPTION' && (
                      <SubscriptionSettings />
                  )}

                  {activeTab === 'PRIVACY' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Privacy & Safety</h1>
                          <p className="text-gray-400 max-w-lg">Manage how you connect with others and what you share.</p>

                          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                              {/* Online Status */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Show Online Status</div>
                                      <div className="text-xs text-gray-500">Allow friends to see when you're active.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.showOnlineStatus ?? true}
                                      onChange={(v) => handleSettingChange('showOnlineStatus', v)}
                                  />
                              </div>
                              {/* Friend Requests */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Allow Friend Requests</div>
                                      <div className="text-xs text-gray-500">Let everyone send you friend requests.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.allowFriendRequests ?? true}
                                      onChange={(v) => handleSettingChange('allowFriendRequests', v)}
                                  />
                              </div>
                               {/* Activity Status */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Share Activity Status</div>
                                      <div className="text-xs text-gray-500">Show what you're listening to or playing.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.shareActivityStatus ?? true}
                                      onChange={(v) => handleSettingChange('shareActivityStatus', v)}
                                  />
                              </div>
                               {/* Read Receipts */}
                               <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Read Receipts</div>
                                      <div className="text-xs text-gray-500">Show when you've viewed messages.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.readReceiptsEnabled ?? true}
                                      onChange={(v) => handleSettingChange('readReceiptsEnabled', v)}
                                  />
                              </div>
                               {/* Location (Ghost Mode reference) */}
                               <div className="p-4 flex items-center justify-between bg-signal/5">
                                  <div>
                                      <div className="font-bold text-white text-sm">Global Location Sharing</div>
                                      <div className="text-xs text-gray-500">Toggle "Ghost Mode" on/off globally.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.globalLocationSharing ?? true}
                                      onChange={(v) => handleSettingChange('globalLocationSharing', v)}
                                  />
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'BLOCKED' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Blocked Users</h1>
                          <p className="text-gray-400 max-w-lg">Manage users you have blocked. They cannot message you or see your status.</p>

                          {/* Block New User Section */}
                          <div className="space-y-4">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Block a user</h3>
                              <div className="relative group">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" size={16} />
                                  <input 
                                      type="text" 
                                      value={blockSearch}
                                      onChange={(e) => setBlockSearch(e.target.value)}
                                      placeholder="Search by name or handle to block..."
                                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all placeholder-gray-500"
                                  />
                              </div>
                              
                              {/* Search Results */}
                              {blockSearch && (
                                  <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      {usersToBlock.length === 0 ? (
                                          <div className="p-4 text-center text-gray-500 text-xs">No matching users found.</div>
                                      ) : (
                                          <div className="divide-y divide-white/5">
                                              {usersToBlock.map(user => (
                                                  <div key={user.id} className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                      <div className="flex items-center gap-3">
                                                          <img src={user.avatarUrl} alt={user.displayName} className="w-8 h-8 rounded-full object-cover bg-gray-800" />
                                                          <div>
                                                              <div className="font-bold text-white text-xs">{user.displayName}</div>
                                                              <div className="text-[10px] text-gray-500">{user.handle}</div>
                                                          </div>
                                                      </div>
                                                      <button 
                                                          onClick={() => {
                                                              blockUser(user.id);
                                                              setBlockSearch('');
                                                          }}
                                                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-bold text-red-400 transition-colors"
                                                      >
                                                          Block
                                                      </button>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              )}
                          </div>

                          <div className="h-[1px] bg-white/5 my-4"></div>

                          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                              {currentUser.blockedUserIds?.length === 0 ? (
                                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                                      <Shield size={48} className="mb-4 opacity-20" />
                                      <p>You haven't blocked anyone.</p>
                                  </div>
                              ) : (
                                  <div className="divide-y divide-white/5">
                                      {currentUser.blockedUserIds?.map(blockedId => {
                                          const user = users.find(u => u.id === blockedId) || { 
                                              id: blockedId, 
                                              displayName: 'Unknown User', 
                                              handle: 'Unknown', 
                                              avatarUrl: `https://ui-avatars.com/api/?name=?&background=random` 
                                          } as any;
                                          
                                          return (
                                              <div key={blockedId} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                  <div className="flex items-center gap-4">
                                                      <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                                                      <div>
                                                          <div className="font-bold text-white text-sm">{user.displayName}</div>
                                                          <div className="text-xs text-gray-500">{user.handle}</div>
                                                      </div>
                                                  </div>
                                                  <button 
                                                      onClick={() => unblockUser(blockedId)}
                                                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors"
                                                  >
                                                      Unblock
                                                  </button>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'NOTIFICATIONS' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Notifications</h1>
                          <p className="text-gray-400 max-w-lg">Control how and when you want to be notified.</p>

                          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                              {/* Sounds */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">In-App Sounds</div>
                                      <div className="text-xs text-gray-500">Play sounds for new messages and events.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.enableSounds ?? true}
                                      onChange={(v) => handleSettingChange('enableSounds', v)}
                                  />
                              </div>
                              {/* Push Notifications */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Push Notifications</div>
                                      <div className="text-xs text-gray-500">Receive notifications on this device.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.enablePushNotifications ?? true}
                                      onChange={(v) => handleSettingChange('enablePushNotifications', v)}
                                  />
                              </div>
                              {/* Email Digest */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Email Digest</div>
                                      <div className="text-xs text-gray-500">Receive a summary of missed activity.</div>
                                  </div>
                                  <select
                                      value={currentUser.settings?.emailDigestFrequency || 'WEEKLY'}
                                      onChange={(e) => handleSettingChange('emailDigestFrequency', e.target.value)}
                                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-signal/50"
                                  >
                                      <option value="DAILY">Daily</option>
                                      <option value="WEEKLY">Weekly</option>
                                      <option value="NEVER">Never</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'ACCESSIBILITY' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Accessibility</h1>
                          <p className="text-gray-400 max-w-lg">Customize the interface to suit your needs.</p>

                          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                              {/* Font Size */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Font Size</div>
                                      <div className="text-xs text-gray-500">Adjust the text size of the interface.</div>
                                  </div>
                                  <div className="flex bg-black/20 p-1 rounded-lg border border-white/10">
                                      {['SMALL', 'MEDIUM', 'LARGE'].map((size) => (
                                          <button
                                              key={size}
                                              onClick={() => handleSettingChange('fontSize', size)}
                                              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors ${
                                                  (currentUser.settings?.fontSize || 'MEDIUM') === size 
                                                  ? 'bg-white text-black' 
                                                  : 'text-gray-400 hover:text-white'
                                              }`}
                                          >
                                              {size === 'SMALL' ? 'A' : size === 'MEDIUM' ? 'Aa' : 'Aaa'}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {/* Reduced Motion */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">Reduced Motion</div>
                                      <div className="text-xs text-gray-500">Minimize animations and transitions.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.reducedMotion ?? false}
                                      onChange={(v) => handleSettingChange('reducedMotion', v)}
                                  />
                              </div>

                              {/* High Contrast */}
                              <div className="p-4 flex items-center justify-between">
                                  <div>
                                      <div className="font-bold text-white text-sm">High Contrast</div>
                                      <div className="text-xs text-gray-500">Increase contrast for better visibility.</div>
                                  </div>
                                  <Toggle
                                      checked={currentUser.settings?.highContrast ?? false}
                                      onChange={(v) => handleSettingChange('highContrast', v)}
                                  />
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'LANGUAGE' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Language & Region</h1>
                          <p className="text-gray-400 max-w-lg">Choose your preferred language for the interface.</p>
                          
                          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
                              {LANGUAGES.map((lang) => (
                                  <button
                                      key={lang.code}
                                      onClick={() => handleLanguageChange(lang.code)}
                                      className={`w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${currentLanguage === lang.code ? 'bg-white/10' : ''}`}
                                  >
                                      <div className="flex items-center gap-4">
                                          <span className="text-2xl">{lang.flag}</span>
                                          <div className="text-left">
                                              <div className={`font-bold ${currentLanguage === lang.code ? 'text-white' : 'text-gray-300'}`}>{lang.name}</div>
                                              <div className="text-xs text-gray-500">{lang.nativeName}</div>
                                          </div>
                                      </div>
                                      {currentLanguage === lang.code && <Check className="text-signal" size={20} />}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {activeTab === 'HELP' && (
                      <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Help & Support</h1>
                          
                          {/* Support Actions */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button 
                                onClick={() => window.alert("Mock: Opened email client to support@us.app")}
                                className="p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-left transition-colors group"
                              >
                                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                                      <Mail size={16} /> Contact Support
                                  </div>
                                  <div className="text-xs text-gray-500 group-hover:text-gray-400">Get help with your account</div>
                              </button>
                              <button 
                                onClick={() => window.alert("Mock: Opened bug reporting form")}
                                className="p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-left transition-colors group"
                              >
                                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                                      <Bug size={16} /> Report a Bug
                                  </div>
                                  <div className="text-xs text-gray-500 group-hover:text-gray-400">Found something broken?</div>
                              </button>
                          </div>

                          {/* Tips & Tutorials Section */}
                          <div className="space-y-4 pt-4 border-t border-white/5">
                              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                  <Sparkles size={14} className="text-signal" /> Tips & Tutorials
                              </h3>
                              <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5">
                                  <div className="p-4 flex items-center justify-between">
                                      <div>
                                          <div className="font-bold text-white text-sm">Helpful Tips</div>
                                          <div className="text-xs text-gray-500">Show context-aware tutorial tooltips as you navigate.</div>
                                      </div>
                                      <Toggle
                                          checked={isSystemActive}
                                          onChange={(v) => setTutorialsEnabled(v)}
                                      />
                                  </div>
                                  <div className="p-4 flex items-center justify-between">
                                      <div>
                                          <div className="font-bold text-white text-sm">Reset Tutorials</div>
                                          <div className="text-xs text-gray-500">Clear seen history to see all tutorial tips again.</div>
                                      </div>
                                      <button 
                                          onClick={handleResetTutorials}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors"
                                      >
                                          <RefreshCw size={14} /> Reset Progress
                                      </button>
                                  </div>
                                  <div className="p-4 flex items-center justify-between">
                                      <div>
                                          <div className="font-bold text-white text-sm">Welcome Guide</div>
                                          <div className="text-xs text-gray-500">Replay the introductory onboarding carousel.</div>
                                      </div>
                                      <button 
                                          onClick={onRestartOnboarding}
                                          className="flex items-center gap-2 px-3 py-1.5 bg-signal hover:bg-blue-600 rounded-lg text-xs font-bold text-white transition-colors shadow-lg shadow-signal/20"
                                      >
                                          <PlayCircle size={14} /> Replay
                                      </button>
                                  </div>
                              </div>
                          </div>

                          {/* FAQ */}
                          <div className="pt-4 border-t border-white/5">
                              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Frequently Asked Questions</h2>
                              <div className="space-y-2">
                                  {FAQS.map((faq, i) => (
                                      <div key={i} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                                          <button 
                                              onClick={() => setOpenFaqIndex(openFaqIndex === i ? null : i)}
                                              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                                          >
                                              <span className="font-bold text-sm text-white">{faq.q}</span>
                                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${openFaqIndex === i ? 'rotate-180' : ''}`} />
                                          </button>
                                          {openFaqIndex === i && (
                                              <div className="px-4 pb-4 text-sm text-gray-400 leading-relaxed animate-in slide-in-from-top-1">
                                                  {faq.a}
                                              </div>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>

                          {/* Version Info */}
                          <div className="text-center pt-8 border-t border-white/5">
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                                  <span className="text-[10px] font-bold text-gray-500">VERSION 1.0.0 (BETA)</span>
                              </div>
                              <div className="mt-4 text-[10px] text-gray-600 flex justify-center gap-4">
                                  <a href="#" className="hover:text-gray-400">Terms of Service</a>
                                  <a href="#" className="hover:text-gray-400">Privacy Policy</a>
                                  <a href="#" className="hover:text-gray-400">Open Source Licenses</a>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'DEBUG' && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                          <h1 className="text-2xl font-bold text-white">Developer / Debug</h1>
                          <p className="text-gray-400">Tools for development and testing.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button onClick={() => applyTemplate('DEMO')} className="p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-left transition-colors">
                                  <div className="font-bold text-blue-400 mb-1">Load Demo Data</div>
                                  <div className="text-xs text-gray-500">Populate with mock friends/chats</div>
                              </button>
                              <button onClick={() => applyTemplate('EMPTY')} className="p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-left transition-colors">
                                  <div className="font-bold text-mint mb-1">Empty Template</div>
                                  <div className="text-xs text-gray-500">Clean slate (Discovery only)</div>
                              </button>
                              <button onClick={resetData} className="p-4 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 rounded-xl text-left transition-colors">
                                  <div className="font-bold text-red-400 mb-1">Factory Reset</div>
                                  <div className="text-xs text-gray-500">Clear localStorage</div>
                              </button>
                              <button 
                                onClick={() => { applyTemplate('EMPTY'); if(onRestartOnboarding) onRestartOnboarding(); }} 
                                className="p-4 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl text-left transition-colors"
                              >
                                  <div className="font-bold text-white mb-1">Replay Onboarding</div>
                                  <div className="text-xs text-gray-500">Reset to empty & view slides</div>
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* SHARE PROFILE MODAL */}
          {showShareModal && (
              <div className="absolute inset-0 z-50 bg-[#0F1115] flex flex-col animate-in fade-in duration-200">
                  <div className="p-6 border-b border-white/5 flex justify-between items-center">
                      <h2 className="font-bold text-white text-lg">Share Profile</h2>
                      <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8 overflow-y-auto">
                      <div className="bg-white p-4 rounded-3xl shadow-2xl relative">
                           {/* Simple Mock QR Code Grid Pattern */}
                           <div className="grid grid-cols-5 gap-1 w-48 h-48 sm:w-64 sm:h-64 opacity-90">
                               {Array.from({length: 25}).map((_, i) => (
                                   <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-black' : 'bg-gray-100'}`} />
                               ))}
                               {/* Corner markers */}
                               <div className="absolute top-4 left-4 w-12 h-12 border-4 border-black rounded-lg bg-white" />
                               <div className="absolute top-4 right-4 w-12 h-12 border-4 border-black rounded-lg bg-white" />
                               <div className="absolute bottom-4 left-4 w-12 h-12 border-4 border-black rounded-lg bg-white" />
                           </div>
                           
                           {/* Center Avatar Overlay */}
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white overflow-hidden shadow-md bg-black">
                               <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="Profile" />
                           </div>
                      </div>
                      
                      <div className="text-center">
                          <h3 className="text-2xl font-black text-white">{currentUser.displayName}</h3>
                          <p className="text-signal text-lg font-mono">{currentUser.handle}</p>
                      </div>

                      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
                          <div className="flex-1 text-sm text-gray-400 truncate px-2 font-mono select-all">
                              https://us.app/{currentUser.handle.replace('@', '')}
                          </div>
                          <button 
                              onClick={handleCopyLink}
                              className={`p-2.5 rounded-lg text-white transition-all flex items-center gap-2 font-bold text-xs ${linkCopied ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'}`}
                          >
                              {linkCopied ? <Check size={16} /> : <Copy size={16} />}
                              {linkCopied ? 'Copied' : 'Copy'}
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* LOGOUT CONFIRMATION MODAL */}
          {showLogoutConfirm && (
              <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
                  <div className="bg-[#1A1D21] border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95">
                      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                          <LogOut size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">Log Out?</h3>
                      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                          Are you sure you want to log out? You will need to verify your phone number to log back in.
                      </p>
                      
                      <div className="flex items-center justify-center gap-2 mb-6">
                          <input type="checkbox" id="remember" className="rounded bg-white/10 border-white/20 text-signal focus:ring-0 w-4 h-4" defaultChecked />
                          <label htmlFor="remember" className="text-xs text-gray-400 select-none cursor-pointer font-medium">Remember this device</label>
                      </div>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setShowLogoutConfirm(false)}
                              className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={onLogout}
                              className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-sm text-white transition-colors shadow-lg shadow-red-500/20"
                          >
                              Log Out
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* MANAGE PLACES MODAL */}
          {showPlacesModal && (
              <ManagePlacesModal onClose={() => setShowPlacesModal(false)} />
          )}
      </div>
  );
};
