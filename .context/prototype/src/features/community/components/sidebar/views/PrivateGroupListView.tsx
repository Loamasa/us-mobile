
import React, { useState, useRef, useEffect } from 'react';
import { Lock, Plus, Hash, MessagesSquare, Users, Edit2, Trash2 } from 'lucide-react';
import { PrivateGroup, MapEntity } from '../../../../../types';
import { ChannelRow } from '../ChannelRow';

interface PrivateGroupListViewProps {
  userPrivateGroups: PrivateGroup[];
  selectedPrivateGroupId: string | null;
  privateGatherings: MapEntity[];
  onSelectPrivateGroup: (id: string | null) => void;
  onCreatePrivateTag: (name: string) => void;
  onUpdatePrivateGroup: (groupId: string, name: string) => void;
  onDeletePrivateGroup: (groupId: string) => void;
  onCreatePrivateChannel: (groupId: string, name: string) => void;
  activeChannel: string;
  onChannelClick: (name: string, type: 'text' | 'voice') => void;
}

export const PrivateGroupListView: React.FC<PrivateGroupListViewProps> = ({
    userPrivateGroups,
    selectedPrivateGroupId,
    privateGatherings,
    onSelectPrivateGroup,
    onCreatePrivateTag,
    onUpdatePrivateGroup,
    onDeletePrivateGroup,
    onCreatePrivateChannel,
    activeChannel,
    onChannelClick
}) => {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  // Edit State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editedGroupName, setEditedGroupName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (editingGroupId && editInputRef.current) {
          editInputRef.current.focus();
      }
  }, [editingGroupId]);

  const handleCreateTag = () => {
      if (newTagName) {
          onCreatePrivateTag(newTagName);
          setNewTagName('');
          setIsCreatingTag(false);
      }
  };

  const handleSaveGroupEdit = () => {
      if (editingGroupId && editedGroupName.trim()) {
          onUpdatePrivateGroup(editingGroupId, editedGroupName.trim());
      }
      setEditingGroupId(null);
  };

  const handleKeyDownGroupEdit = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSaveGroupEdit();
      if (e.key === 'Escape') setEditingGroupId(null);
  };

  const handleDeleteGroup = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      onDeletePrivateGroup(id);
  };

  const handleCreateChannel = () => {
      if (newChannelName && selectedPrivateGroupId) {
          onCreatePrivateChannel(selectedPrivateGroupId, newChannelName);
          setNewChannelName('');
          setIsCreatingChannel(false);
      }
  };

  const selectedPrivateGroup = userPrivateGroups.find(g => g.id === selectedPrivateGroupId);

  const SectionHeader = ({ label }: { label: string }) => (
      <div className="px-4 mt-6 mb-2 flex items-center gap-2">
         <div className="h-[1px] flex-1 bg-white/5"></div>
         <span className="text-[10px] font-bold uppercase tracking-widest text-mint">{label}</span>
         <div className="h-[1px] flex-1 bg-white/5"></div>
      </div>
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-4">
        <div className="mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
                 <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">My Groups</span>
                 <button 
                     onClick={() => setIsCreatingTag(!isCreatingTag)} 
                     className="text-xs bg-white/5 hover:bg-white/10 p-1 rounded text-gray-300 transition-colors"
                     title="Create new group"
                 >
                     <Plus size={14} />
                 </button>
            </div>

            {userPrivateGroups.length === 0 && !isCreatingTag && (
                <div className="text-center p-6 text-gray-500 text-xs bg-white/5 rounded-xl border border-dashed border-white/5">
                    <Users size={24} className="mx-auto mb-2 opacity-50" />
                    <p>Create groups to organize<br/>your exclusive circles.</p>
                </div>
            )}
            
            {isCreatingTag && (
                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                    <input 
                        type="text" 
                        placeholder="Group Name (e.g., Skyddsrum)"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                        className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-white/30"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsCreatingTag(false)} className="text-[10px] text-gray-500 hover:text-white">Cancel</button>
                        <button onClick={handleCreateTag} className="text-[10px] bg-white text-black px-2 py-1 rounded font-bold">Create</button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {userPrivateGroups.map(group => {
                    const isSelected = selectedPrivateGroupId === group.id;
                    const isEditing = editingGroupId === group.id;

                    return (
                        <div 
                            key={group.id}
                            onClick={() => !isEditing && onSelectPrivateGroup && onSelectPrivateGroup(group.id)}
                            className={`
                                flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border group
                                ${isSelected 
                                    ? 'bg-white/10 border-white/20 shadow-md' 
                                    : 'bg-white/5 border-transparent hover:bg-white/10'}
                            `}
                        >
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0" style={{ backgroundColor: group.color }}>
                                    <Hash size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {isEditing ? (
                                        <input 
                                            ref={editInputRef}
                                            value={editedGroupName}
                                            onChange={(e) => setEditedGroupName(e.target.value)}
                                            onBlur={handleSaveGroupEdit}
                                            onKeyDown={handleKeyDownGroupEdit}
                                            onClick={(e) => e.stopPropagation()}
                                            className="bg-black/50 text-white text-sm px-1 py-0.5 rounded border border-white/20 w-full focus:outline-none focus:border-signal"
                                        />
                                    ) : (
                                        <>
                                            <div className="text-sm font-bold text-white leading-tight truncate">{group.name}</div>
                                            <div className="text-[10px] text-gray-400">{group.memberCount} members</div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Actions (Only show when not editing and active or hovered) */}
                            {!isEditing && (
                                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setEditingGroupId(group.id); setEditedGroupName(group.name); }}
                                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                    <button 
                                        onClick={(e) => handleDeleteGroup(e, group.id)}
                                        className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {selectedPrivateGroupId && selectedPrivateGroup ? (
            <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                
                {/* --- Channels Section --- */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2 px-1">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Group Channels</span>
                         <button 
                             onClick={() => setIsCreatingChannel(!isCreatingChannel)} 
                             className="text-xs bg-white/5 hover:bg-white/10 p-1 rounded text-gray-300 transition-colors"
                             title="Create Channel"
                         >
                             <Plus size={12} />
                         </button>
                    </div>

                     {isCreatingChannel && (
                        <div className="mb-3 p-2 bg-white/5 rounded-lg border border-white/10">
                            <input 
                                type="text" 
                                placeholder="Channel Name"
                                value={newChannelName}
                                onChange={(e) => setNewChannelName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateChannel()}
                                className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white mb-2 focus:outline-none focus:border-white/30"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsCreatingChannel(false)} className="text-[10px] text-gray-500 hover:text-white">Cancel</button>
                                <button onClick={handleCreateChannel} className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold">Add</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1">
                        {selectedPrivateGroup.channels?.map(c => (
                            <ChannelRow 
                                key={c.id}
                                name={c.name}
                                type={c.type}
                                category="Channels"
                                isActive={activeChannel === c.name}
                                onClick={() => onChannelClick(c.name, c.type)}
                            />
                        ))}
                        {(!selectedPrivateGroup.channels || selectedPrivateGroup.channels.length === 0) && (
                            <div className="text-xs text-gray-500 px-2 italic py-2 flex items-center gap-2">
                                <MessagesSquare size={12} />
                                No channels created.
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Gatherings Section --- */}
                <div>
                    <SectionHeader label="Private Gatherings" />
                    
                    {privateGatherings.length === 0 ? (
                         <div className="text-center text-gray-500 py-4 text-xs bg-white/5 rounded-xl border border-dashed border-white/5 mt-2">
                            No active gatherings for this group.
                        </div>
                    ) : (
                        <div className="space-y-2 mt-2">
                            {privateGatherings.map(g => (
                                <ChannelRow 
                                    key={g.id} 
                                    name={g.data.name} 
                                    type="text" 
                                    category="Live Gatherings" 
                                    isActive={activeChannel === g.data.name || activeChannel === g.chatId}
                                    onClick={() => onChannelClick(g.chatId || g.id, 'text')}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-600 text-xs text-center border-t border-white/5 mt-4">
                <Lock size={24} className="mb-2 opacity-50" />
                <p>Select a group above to see<br/>hidden channels & gatherings.</p>
            </div>
        )}
     </div>
  );
};
