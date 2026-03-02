import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Globe, Lock, Link as LinkIcon, Check, MapPin, Image as ImageIcon, Search, UserMinus, Ban, Shield, Crown, Bell, AtSign, BellOff, Trash2, ShieldCheck, ShieldAlert, UserCog, MoreVertical, Users, AlertTriangle, LogOut, Hash, Mic, Edit2, GripVertical, Plus, Ticket, Clock, RefreshCw, Zap } from 'lucide-react';
import L from 'leaflet';
import { Community, Visibility, UserStatus, NotificationSetting, CommunityRole, Channel, User } from '../../../../../types';
import { SettingsTab } from '../ServerSettingsModal';
import { useCommunityContext } from '../../../context/CommunityContext';
import { useData } from '../../../../../context/DataContext';
import { CURRENT_USER } from '../../../../../data/users';
import { useServerBoost } from '../../../../monetization/hooks/useServerBoost';

interface LocalSettingsViewProps {
  community: Community;
  activeTab: SettingsTab;
  onSave: (data: Partial<Community>) => void;
  setIsDirty: (isDirty: boolean) => void;
  isAdmin: boolean;
  isOwner: boolean;
}

export interface SettingsViewHandle {
    save: () => void;
}

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void, disabled?: boolean }) => (
    <button 
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${checked ? 'bg-signal' : 'bg-white/10'}`}
    >
        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const MOCK_BANS = [
    { id: 'b1', name: 'Spam Bot 3000', handle: '@spammer', date: '2 days ago', reason: 'Spamming invite links' },
    { id: 'b2', name: 'Troll User', handle: '@troll_face', date: '1 week ago', reason: 'Harassment' },
];

export const LocalSettingsView = forwardRef<SettingsViewHandle, LocalSettingsViewProps>(({ community, activeTab, onSave, setIsDirty, isAdmin, isOwner }, ref) => {
  const { onUpdateChannel, onDeleteChannel, onDeleteCommunity, onLeaveCommunity, openCreateChannelModal } = useCommunityContext();
  const { transferOwnership, invites, revokeInvite, users } = useData();
  const { isBoosted } = useServerBoost(community.id);
  
  // Local Form State
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [visibility, setVisibility] = useState<Visibility>(community.visibility);
  const [iconUrl, setIconUrl] = useState(community.iconUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(community.coverImageUrl);
  const [radius, setRadius] = useState(community.location.radius || 2000);
  const [coordinates, setCoordinates] = useState(community.location.coordinates);
  const [vanitySlug, setVanitySlug] = useState(community.vanitySlug || '');
  
  // Notification State
  const [defaultNotificationLevel, setDefaultNotificationLevel] = useState<NotificationSetting>(community.defaultNotificationLevel || 'MENTIONS');
  const [allowEveryoneMention, setAllowEveryoneMention] = useState(community.allowEveryoneMention ?? true);
  const [allowHereMention, setAllowHereMention] = useState(community.allowHereMention ?? true);

  // Role State
  const [selectedRoleForDetails, setSelectedRoleForDetails] = useState<CommunityRole>('ADMIN');

  // Channel Management State
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');

  // Member Management State
  const [memberSubTab, setMemberSubTab] = useState<'MEMBERS' | 'INVITES' | 'BANNED'>('MEMBERS');

  // Map Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Filter Invites
  const communityInvites = useMemo(() => {
      return invites.filter(i => i.communityId === community.id && i.status === 'ACTIVE');
  }, [invites, community.id]);

  // Dirty Detection
  const hasChanges = useMemo(() => {
      if (name !== community.name) return true;
      if (description !== community.description) return true;
      if (visibility !== community.visibility) return true;
      if (iconUrl !== community.iconUrl) return true;
      if (coverImageUrl !== community.coverImageUrl) return true;
      if (radius !== (community.location.radius || 2000)) return true;
      if (coordinates.lat !== community.location.coordinates.lat || coordinates.lng !== community.location.coordinates.lng) return true;
      if (defaultNotificationLevel !== (community.defaultNotificationLevel || 'MENTIONS')) return true;
      if (allowEveryoneMention !== (community.allowEveryoneMention ?? true)) return true;
      if (allowHereMention !== (community.allowHereMention ?? true)) return true;
      if (vanitySlug !== (community.vanitySlug || '')) return true;
      return false;
  }, [name, description, visibility, iconUrl, coverImageUrl, radius, coordinates, defaultNotificationLevel, allowEveryoneMention, allowHereMention, vanitySlug, community]);

  // Notify parent of dirty state for exit protection
  useEffect(() => {
      setIsDirty(hasChanges);
  }, [hasChanges, setIsDirty]);

  const handleReset = () => {
      setName(community.name);
      setDescription(community.description);
      setVisibility(community.visibility);
      setIconUrl(community.iconUrl);
      setCoverImageUrl(community.coverImageUrl);
      setRadius(community.location.radius || 2000);
      setCoordinates(community.location.coordinates);
      setDefaultNotificationLevel(community.defaultNotificationLevel || 'MENTIONS');
      setAllowEveryoneMention(community.allowEveryoneMention ?? true);
      setAllowHereMention(community.allowHereMention ?? true);
      setVanitySlug(community.vanitySlug || '');
  };

  const handleSaveChanges = () => {
      onSave({ 
        name, description, visibility, iconUrl, coverImageUrl, vanitySlug,
        location: { ...community.location, coordinates, radius },
        defaultNotificationLevel, allowEveryoneMention, allowHereMention
      });
  };

  // Expose save to parent via ref
  useImperativeHandle(ref, () => ({
      save: handleSaveChanges
  }));

  // Map Initialization
  useEffect(() => {
    if (activeTab !== 'VISIBILITY' || !mapRef.current) return;
    
    if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        return;
    }

    const map = L.map(mapRef.current, {
        center: [coordinates.lat, coordinates.lng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    const icon = L.divIcon({
        html: `<div class="w-8 h-8 bg-signal rounded-full border-2 border-white shadow-lg"></div>`,
        className: 'bg-transparent',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });

    const marker = L.marker([coordinates.lat, coordinates.lng], { icon, draggable: isAdmin }).addTo(map);
    markerRef.current = marker;

    const circle = L.circle([coordinates.lat, coordinates.lng], {
        color: '#2E5CFF',
        fillColor: '#2E5CFF',
        fillOpacity: 0.1,
        radius: radius,
        weight: 2,
        dashArray: '4, 4'
    }).addTo(map);
    circleRef.current = circle;

    if (isAdmin) {
        marker.on('dragend', (e) => setCoordinates({ lat: e.target.getLatLng().lat, lng: e.target.getLatLng().lng }));
        map.on('click', (e) => setCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng }));
    }

    mapInstanceRef.current = map;
    return () => { if (mapInstanceRef.current) mapInstanceRef.current.remove(); mapInstanceRef.current = null; };
  }, [activeTab, isAdmin]);

  useEffect(() => {
    if (markerRef.current) markerRef.current.setLatLng([coordinates.lat, coordinates.lng]);
    if (circleRef.current) {
        circleRef.current.setLatLng([coordinates.lat, coordinates.lng]);
        circleRef.current.setRadius(radius);
    }
  }, [coordinates, radius]);

  const members = useMemo(() => {
      // Logic to assign roles to member users for UI representation
      const ids = community.memberIds || [community.ownerId];
      
      const memberList: any[] = [];
      
      ids.forEach(id => {
          const user = users.find(u => u.id === id);
          if (user) {
              let role: CommunityRole = 'MEMBER';
              if (id === community.ownerId) role = 'OWNER';
              else if (id.includes('admin') || id === 'f1') role = 'ADMIN'; // Simulating admins
              
              memberList.push({ ...user, role });
          }
      });
      
      // Fallback if empty (shouldn't happen with hydrated data)
      if (memberList.length === 0) {
          memberList.push({ ...CURRENT_USER, role: 'OWNER' });
      }
      
      return memberList;
  }, [isAdmin, isOwner, community.memberIds, users, community.ownerId]);

  const roles: { id: CommunityRole, label: string, icon: any, color: string, description: string }[] = [
      { id: 'OWNER', label: 'Owner', icon: Crown, color: 'text-yellow-400', description: 'Full access to all settings and deletion.' },
      { id: 'ADMIN', label: 'Admin', icon: ShieldCheck, color: 'text-signal', description: 'Can manage channels, events, and members.' },
      { id: 'MEMBER', label: 'Member', icon: Users, color: 'text-gray-400', description: 'Standard community access.' },
  ];

  const permissions = [
      { id: 'MANAGE_SERVER', label: 'Manage Community', description: 'Change name, icon, and visibility.' },
      { id: 'MANAGE_CHANNELS', label: 'Manage Channels', description: 'Create, edit, and delete text/voice channels.' },
      { id: 'MANAGE_ROLES', label: 'Manage Roles', description: 'Create and assign permissions to others.' },
      { id: 'MANAGE_MEMBERS', label: 'Manage Members', description: 'Kick or promote members of the community.' },
      { id: 'CREATE_EVENTS', label: 'Create Events', description: 'Host official community events.' },
  ];

  const handleSaveChannel = (id: string) => {
      if (editChannelName.trim()) {
          onUpdateChannel(id, { name: editChannelName.trim() });
      }
      setEditingChannelId(null);
      setEditChannelName('');
  };

  const handleStartEditChannel = (channel: Channel) => {
      setEditingChannelId(channel.id);
      setEditChannelName(channel.name);
  };

  const getCreatorName = (id: string) => {
      if (id === CURRENT_USER.id) return 'You';
      const user = users.find(u => u.id === id);
      return user ? user.displayName : 'System';
  };

  const getExpirationLabel = (iso: string | 'never') => {
      if (iso === 'never') return 'Never';
      const date = new Date(iso);
      if (date < new Date()) return 'Expired';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 pb-20">
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-white leading-tight">Community Overview</h1>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="shrink-0 flex flex-col items-center">
                    <div className="relative group w-32 h-32">
                        <img src={iconUrl} className="w-full h-full rounded-3xl object-cover border-4 border-black shadow-2xl" alt="Icon" />
                        {isAdmin && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center cursor-pointer">
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex-1 space-y-6">
                    <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-signal/50 transition-all font-bold" />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={!isAdmin} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white h-24 resize-none focus:border-signal/50 transition-all text-sm" />
                    </div>
                    
                    {/* Vanity URL Section */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                            {isBoosted ? <Zap size={12} className="text-yellow-400 fill-yellow-400" /> : <Lock size={12} />}
                            Vanity URL
                        </label>
                        <div className={`flex items-center rounded-xl overflow-hidden border transition-all ${isBoosted ? 'bg-white/5 border-white/10 focus-within:border-yellow-400/50' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                            <div className="pl-4 pr-1 py-4 text-gray-500 text-sm font-bold bg-transparent select-none">
                                us.app/join/
                            </div>
                            <input 
                                value={vanitySlug} 
                                onChange={e => setVanitySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} 
                                disabled={!isAdmin || !isBoosted} 
                                placeholder={isBoosted ? "cool-community" : "Locked"}
                                className={`w-full bg-transparent p-4 pl-0 text-white focus:outline-none transition-all font-bold ${isBoosted ? '' : 'cursor-not-allowed text-gray-600'}`} 
                            />
                            {!isBoosted && (
                                <div className="pr-4">
                                    <Lock size={16} className="text-gray-600" />
                                </div>
                            )}
                        </div>
                        {!isBoosted && (
                            <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1.5">
                                <Zap size={10} className="text-yellow-400" /> 
                                Unlock Vanity URL with Server Boost (Level 1)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* DANGER ZONE */}
            <div className="pt-8 border-t border-white/5">
                <h3 className="text-red-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2 mb-4">
                    <AlertTriangle size={14} /> Danger Zone
                </h3>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-white mb-1">{isOwner ? 'Delete Community' : 'Leave Community'}</h4>
                        <p className="text-xs text-gray-400">
                            {isOwner 
                                ? 'Permanently delete this community and all its data. This cannot be undone.' 
                                : 'Leave this community. You will need a new invite to rejoin.'}
                        </p>
                    </div>
                    {isOwner ? (
                        <button 
                            onClick={onDeleteCommunity}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-red-500/20"
                        >
                            Delete Community
                        </button>
                    ) : (
                        <button 
                            onClick={onLeaveCommunity}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-red-400 hover:text-red-300 border border-white/10 rounded-lg text-xs font-bold transition-colors"
                        >
                            <LogOut size={14} className="inline mr-2" />
                            Leave Community
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ... (Other tabs remain unchanged) ... */}
      
      {activeTab === 'VISIBILITY' && (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white mb-2">Discovery & Coverage</h1>
                <p className="text-gray-400">Control how people find your community and the physical area it represents.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[Visibility.PUBLIC, Visibility.LINK_ONLY, Visibility.HIDDEN].map(v => (
                    <button 
                        key={v} 
                        disabled={!isAdmin}
                        onClick={() => setVisibility(v)} 
                        className={`p-6 rounded-2xl border text-left transition-all ${visibility === v ? 'bg-signal/10 border-signal shadow-lg shadow-signal/10' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                        <div className={`font-black text-sm text-white mb-1 uppercase tracking-tight`}>{v.replace('_', ' ')}</div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">
                            {v === Visibility.PUBLIC ? 'Visible in discovery. Anyone can find and join.' : v === Visibility.LINK_ONLY ? 'Hidden from search. Invite link only.' : 'Completely private. Members must be added manually.'}
                        </p>
                    </button>
                ))}
            </div>

            <div className="pt-6 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="font-bold text-white">Local Coverage Radius</h2>
                        <p className="text-xs text-gray-500">The area on the map where this community is "active".</p>
                    </div>
                    <span className="text-signal font-mono font-black text-xl">{(radius/1000).toFixed(1)} km</span>
                </div>
                <input type="range" min="500" max="50000" step="500" value={radius} onChange={e => setRadius(parseInt(e.target.value))} disabled={!isAdmin} className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-signal" />
                
                <div className="h-72 w-full rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl">
                    <div ref={mapRef} className="absolute inset-0 z-0"></div>
                    <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold text-white flex items-center gap-2">
                        <MapPin size={12} className="text-signal" />
                        SET CENTER POINT
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'CHANNELS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Channels</h1>
                    <p className="text-gray-400">Organize your community conversations.</p>
                  </div>
                  {isAdmin && (
                      <button 
                        onClick={openCreateChannelModal}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
                      >
                          <Plus size={14} /> New Channel
                      </button>
                  )}
              </div>

              <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                  <div className="p-1">
                      {community.channels.map((channel, index) => (
                          <div 
                            key={channel.id} 
                            className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl group transition-all"
                          >
                              <div className="flex items-center gap-4">
                                  <div className="text-gray-600 cursor-grab active:cursor-grabbing hover:text-white">
                                      <GripVertical size={16} />
                                  </div>
                                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-gray-400">
                                      {channel.type === 'voice' ? <Mic size={16} /> : <Hash size={16} />}
                                  </div>
                                  
                                  {editingChannelId === channel.id ? (
                                      <div className="flex items-center gap-2">
                                          <input 
                                            value={editChannelName} 
                                            onChange={(e) => setEditChannelName(e.target.value)}
                                            className="bg-black/40 text-white text-sm px-2 py-1 rounded border border-white/20 focus:outline-none focus:border-signal"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveChannel(channel.id);
                                                if (e.key === 'Escape') setEditingChannelId(null);
                                            }}
                                          />
                                          <button onClick={() => handleSaveChannel(channel.id)} className="p-1 bg-signal text-white rounded hover:bg-blue-600"><Check size={12} /></button>
                                          <button onClick={() => setEditingChannelId(null)} className="p-1 bg-white/10 text-gray-400 rounded hover:text-white"><LinkIcon size={12} className="rotate-45" /></button>
                                      </div>
                                  ) : (
                                      <div>
                                          <div className="text-sm font-bold text-white">{channel.name}</div>
                                          <div className="text-[10px] text-gray-500 uppercase tracking-wider">{channel.category || 'Uncategorized'}</div>
                                      </div>
                                  )}
                              </div>

                              {isAdmin && !editingChannelId && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleStartEditChannel(channel)}
                                        className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                                        title="Edit Name"
                                      >
                                          <Edit2 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                            if (window.confirm(`Delete channel #${channel.name}?`)) {
                                                onDeleteChannel(channel.id);
                                            }
                                        }}
                                        className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                                        title="Delete Channel"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'ROLES' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div>
                  <h1 className="text-2xl font-bold text-white mb-2">Permissions & Roles</h1>
                  <p className="text-gray-400">Manage what different members can do in your community.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Roles List */}
                  <div className="md:col-span-1 space-y-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block px-1">Active Roles</label>
                      {roles.map(role => (
                          <button
                            key={role.id}
                            onClick={() => setSelectedRoleForDetails(role.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left group ${selectedRoleForDetails === role.id ? 'bg-signal/10 border-signal/50 shadow-lg shadow-signal/5' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <role.icon size={16} className={role.color} />
                                  <span className={`font-bold text-sm ${selectedRoleForDetails === role.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{role.label}</span>
                              </div>
                              {selectedRoleForDetails === role.id && <div className="w-1.5 h-1.5 rounded-full bg-signal shadow-[0_0_8px_rgba(46,92,255,1)]"></div>}
                          </button>
                      ))}
                      {isAdmin && (
                          <button className="w-full flex items-center gap-2 p-3 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors border border-dashed border-white/10 rounded-xl mt-4">
                              <Shield size={12} /> Create Custom Role
                          </button>
                      )}
                  </div>

                  {/* Permissions Detail */}
                  <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 space-y-8">
                      <div className="flex items-start gap-4 pb-6 border-b border-white/5">
                          {(() => {
                              const role = roles.find(r => r.id === selectedRoleForDetails)!;
                              return (
                                  <>
                                      <div className={`p-4 rounded-2xl bg-white/5 ${role.color}`}>
                                          <role.icon size={24} />
                                      </div>
                                      <div>
                                          <h3 className="text-xl font-bold text-white">{role.label} Permissions</h3>
                                          <p className="text-sm text-gray-500 mt-1">{role.description}</p>
                                      </div>
                                  </>
                              );
                          })()}
                      </div>

                      <div className="space-y-6">
                          {permissions.map(perm => {
                              const isOwnerRole = selectedRoleForDetails === 'OWNER';
                              const isAdminRole = selectedRoleForDetails === 'ADMIN';
                              const isMemberRole = selectedRoleForDetails === 'MEMBER';
                              
                              // Logic simulation: Member has no perms, Admin has most, Owner has all
                              let hasPerm = isOwnerRole;
                              if (isAdminRole && perm.id !== 'MANAGE_ROLES') hasPerm = true;
                              if (isMemberRole) hasPerm = false;

                              return (
                                  <div key={perm.id} className="flex items-center justify-between group">
                                      <div className="flex-1 pr-4">
                                          <div className="font-bold text-sm text-white">{perm.label}</div>
                                          <div className="text-[10px] text-gray-500 uppercase tracking-tight">{perm.description}</div>
                                      </div>
                                      <Toggle checked={hasPerm} onChange={() => {}} disabled={true} />
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'MEMBERS' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">Member Management</h1>
                    <p className="text-gray-400">Promote trusted people or remove troublemakers.</p>
                  </div>
                  <div className="text-right">
                      <span className="text-3xl font-black text-signal">{members.length}</span>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Active Humans</p>
                  </div>
              </div>

              {/* Sub-Tabs for Members */}
              <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                  {(['MEMBERS', 'INVITES', 'BANNED'] as const).map(tab => (
                      <button
                          key={tab}
                          onClick={() => setMemberSubTab(tab)}
                          className={`
                              flex-1 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider
                              ${memberSubTab === tab 
                                  ? 'bg-white/10 text-white shadow-sm border border-white/5' 
                                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}
                          `}
                      >
                          {tab}
                      </button>
                  ))}
              </div>

              {/* MEMBERS LIST */}
              {memberSubTab === 'MEMBERS' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                      <div className="relative group mb-4">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-signal transition-colors" size={18} />
                          <input type="text" placeholder="Search members by name or handle..." className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-signal/50 transition-all" />
                      </div>

                      <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                      <th className="p-6">Member</th>
                                      <th className="p-6">Current Role</th>
                                      <th className="p-6 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                  {members.map(m => {
                                      const canManage = (isOwner && m.id !== CURRENT_USER.id) || (isAdmin && m.role === 'MEMBER');
                                      const roleObj = roles.find(r => r.id === m.role);

                                      return (
                                        <tr key={m.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <img src={m.avatarUrl} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt={m.displayName} />
                                                        {m.status === 'ONLINE' && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-mint rounded-full border-2 border-[#0F1115]"></div>}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white group-hover:text-signal transition-colors">{m.displayName}</div>
                                                        <div className="text-xs text-gray-500">{m.handle}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 w-fit border border-white/5 ${roleObj?.color}`}>
                                                    {roleObj && <roleObj.icon size={12} />}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{m.role}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                {canManage ? (
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => window.alert(`Mock: Opening role selector for ${m.displayName}`)}
                                                            className="p-2.5 bg-signal/10 hover:bg-signal text-signal hover:text-white rounded-xl transition-all" 
                                                            title="Modify Role"
                                                        >
                                                            <UserCog size={16} />
                                                        </button>
                                                        {isOwner && (
                                                            <button 
                                                                onClick={() => {
                                                                    if (window.confirm(`Transfer ownership to ${m.displayName}? You will become an Admin.`)) {
                                                                        transferOwnership(community.id, m.id);
                                                                        window.location.reload(); // Quick simulation of state shift
                                                                    }
                                                                }}
                                                                className="p-2.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-black rounded-xl transition-all" 
                                                                title="Transfer Ownership"
                                                            >
                                                                <Crown size={16} />
                                                            </button>
                                                        )}
                                                        <button className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all" title="Remove Member"><UserMinus size={16} /></button>
                                                    </div>
                                                ) : m.id === CURRENT_USER.id ? (
                                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-2">It's You</span>
                                                ) : (
                                                    <button className="text-gray-600 hover:text-white p-2 transition-colors"><Shield size={16} /></button>
                                                )}
                                            </td>
                                        </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* INVITES & BANS */}
              {(memberSubTab === 'INVITES' || memberSubTab === 'BANNED') && (
                  <div className="animate-in fade-in slide-in-from-bottom-2">
                      <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
                          {memberSubTab === 'INVITES' ? (
                              communityInvites.length === 0 ? (
                                  <div className="p-12 text-center text-gray-500">
                                      <Ticket size={32} className="mx-auto mb-3 opacity-20" />
                                      No active invites. Generate one from the Invite People menu.
                                  </div>
                              ) : (
                                  <table className="w-full text-left">
                                      <thead>
                                          <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                              <th className="p-6">Invite Code</th>
                                              <th className="p-6">Uses</th>
                                              <th className="p-6">Expires</th>
                                              <th className="p-6">Created By</th>
                                              <th className="p-6 text-right">Actions</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                          {communityInvites.map((inv, i) => (
                                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                                  <td className="p-6">
                                                      <div className="flex items-center gap-3">
                                                          <div className="p-2 bg-white/5 rounded-lg text-gray-400"><Ticket size={16} /></div>
                                                          <span className="font-mono text-sm font-bold text-white tracking-wider select-all">{inv.code}</span>
                                                      </div>
                                                  </td>
                                                  <td className="p-6 text-sm text-gray-300">{inv.uses} / {inv.maxUses === 'unlimited' ? '∞' : inv.maxUses}</td>
                                                  <td className="p-6"><div className="flex items-center gap-2 text-xs text-gray-400"><Clock size={12} /> {getExpirationLabel(inv.expiresAt)}</div></td>
                                                  <td className="p-6 text-sm text-gray-300">{getCreatorName(inv.creatorId)}</td>
                                                  <td className="p-6 text-right">
                                                      <button onClick={() => revokeInvite(inv.code)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )
                          ) : (
                              MOCK_BANS.length === 0 ? (
                                  <div className="p-12 text-center text-gray-500">No banned users.</div>
                              ) : (
                                  <table className="w-full text-left">
                                      <thead>
                                          <tr className="border-b border-white/10 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                                              <th className="p-6">User</th>
                                              <th className="p-6">Ban Reason</th>
                                              <th className="p-6">Date</th>
                                              <th className="p-6 text-right">Actions</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                          {MOCK_BANS.map(ban => (
                                              <tr key={ban.id} className="hover:bg-white/5 transition-colors">
                                                  <td className="p-6">
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><Ban size={20} /></div>
                                                          <div>
                                                              <div className="font-bold text-white text-sm">{ban.name}</div>
                                                              <div className="text-xs text-gray-500">{ban.handle}</div>
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="p-6 text-sm text-red-300 italic">{ban.reason}</td>
                                                  <td className="p-6 text-xs text-gray-500">{ban.date}</td>
                                                  <td className="p-6 text-right">
                                                      <button onClick={() => window.alert(`Mock: Unbanned ${ban.name}`)} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-2 ml-auto">
                                                          <RefreshCw size={14} /> Revoke Ban
                                                      </button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )
                          )}
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
