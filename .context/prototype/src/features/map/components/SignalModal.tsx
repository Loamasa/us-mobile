
import React, { useState, useMemo } from 'react';
import { X, Users, MapPin, Star, Check } from 'lucide-react';
import { useData } from '../../../context/DataContext';

interface SignalModalProps {
  onClose: () => void;
}

const PRESETS = [
    { emoji: '🍺', text: 'Beer' },
    { emoji: '📚', text: 'Studying' },
    { emoji: '☕', text: 'Fika' },
    { emoji: '🛹', text: 'Skating' },
    { emoji: '🎮', text: 'Gaming' },
    { emoji: '🏋️', text: 'Gym' },
    { emoji: '🍔', text: 'Lunch' },
    { emoji: '🎬', text: 'Movies' },
    { emoji: '🎨', text: 'Art' },
];

const DURATIONS = [
    { label: '1 Hour', value: 60 * 60 * 1000 },
    { label: '4 Hours', value: 4 * 60 * 60 * 1000 },
    { label: 'Until Tonight', value: 'TONIGHT' }, 
];

export const SignalModal: React.FC<SignalModalProps> = ({ onClose }) => {
  const { setSignal, communities, joinedCommunityIds, closeFriendIds } = useData();
  const [emoji, setEmoji] = useState('👋');
  const [text, setText] = useState('');
  const [duration, setDuration] = useState<number | 'TONIGHT'>(60 * 60 * 1000);
  
  // Audience State
  const [audienceType, setAudienceType] = useState<'FRIENDS' | 'COMMUNITY'>('FRIENDS');
  const [friendScope, setFriendScope] = useState<'ALL' | 'CLOSE'>('ALL');
  
  // Changed to array for multiple selection
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([]);

  // Filter joined local communities
  const localCommunities = useMemo(() => {
      return communities.filter(c => c.type === 'LOCAL' && joinedCommunityIds.includes(c.id));
  }, [communities, joinedCommunityIds]);

  const toggleCommunity = (id: string) => {
      setSelectedCommunityIds(prev => 
          prev.includes(id) 
              ? prev.filter(c => c !== id) 
              : [...prev, id]
      );
  };

  const handleSubmit = () => {
      // Calculate Expiration
      let expiresAt = '';
      if (duration === 'TONIGHT') {
          const d = new Date();
          d.setHours(23, 59, 0, 0);
          expiresAt = d.toISOString();
      } else {
          expiresAt = new Date(Date.now() + (duration as number)).toISOString();
      }

      // Determine Audience IDs
      let audienceIds: string[] = [];
      if (audienceType === 'FRIENDS') {
          // If ALL friends, we use a magic string 'FRIENDS' or just leave it empty to imply public to friends? 
          // The signal type expects an ID list or 'GLOBAL'. The current implementation in MapVisualizer handles logic.
          // But to be precise for Close Friends, we pass the IDs.
          audienceIds = friendScope === 'ALL' ? ['FRIENDS'] : closeFriendIds;
      } else if (audienceType === 'COMMUNITY') {
          if (selectedCommunityIds.length === 0) return; // Prevent empty broadcast
          audienceIds = selectedCommunityIds;
      }

      setSignal({
          emoji,
          text: text || 'Hanging out',
          expiresAt,
          audienceIds,
          location: { lat: 0, lng: 0 } 
      });
      onClose();
  };

  const getButtonLabel = () => {
      if (audienceType === 'FRIENDS') {
          return friendScope === 'CLOSE' ? 'Broadcast to Close Friends' : 'Broadcast to Friends';
      }
      if (selectedCommunityIds.length === 0) return 'Select a Community';
      if (selectedCommunityIds.length === 1) return 'Broadcast to Community';
      return `Broadcast to ${selectedCommunityIds.length} Communities`;
  };

  return (
      <div className="absolute inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10">
                  <X size={20} />
              </button>

              <h2 className="text-xl font-black text-white text-center mb-8 shrink-0">Broadcast Signal</h2>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
                  {/* Emoji Input with Glow */}
                  <div className="flex justify-center mb-8">
                      <div className="relative group">
                          <div className="absolute inset-0 bg-signal/20 rounded-full blur-xl group-hover:bg-signal/30 transition-colors"></div>
                          <div className="w-24 h-24 bg-[#1A1D21] rounded-full flex items-center justify-center text-6xl border border-white/10 shadow-inner relative z-10">
                              <input 
                                type="text" 
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                className="w-full h-full bg-transparent text-center focus:outline-none"
                                maxLength={2} 
                              />
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
                              <span className="text-[10px] font-bold text-white">Edit</span>
                          </div>
                      </div>
                  </div>

                  {/* Presets - Improved Scrolling */}
                  <div className="mb-8">
                      <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 no-scrollbar snap-x">
                          {PRESETS.map(p => (
                              <button 
                                key={p.text}
                                onClick={() => { setEmoji(p.emoji); setText(p.text); }}
                                className="flex flex-col items-center gap-2 min-w-[70px] p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95 shrink-0 snap-center"
                              >
                                  <span className="text-2xl">{p.emoji}</span>
                                  <span className="text-[10px] text-gray-400 font-bold">{p.text}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Text Input */}
                  <div className="mb-8 px-4">
                      <input 
                        type="text" 
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="What are you doing?"
                        className="w-full bg-transparent border-b-2 border-white/10 py-2 text-center text-xl text-white font-bold focus:outline-none focus:border-signal transition-colors placeholder-gray-600"
                        maxLength={30}
                      />
                  </div>

                  {/* Duration */}
                  <div className="mb-8">
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                          {DURATIONS.map((d, i) => (
                              <button
                                key={i}
                                onClick={() => setDuration(d.value as any)}
                                className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${duration === d.value ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                  {d.label}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Audience Segmented Control */}
                  <div className="mb-4">
                      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-4">
                          <button 
                            onClick={() => setAudienceType('FRIENDS')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${audienceType === 'FRIENDS' ? 'bg-signal text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                              <Users size={14} /> Friends
                          </button>
                          <button 
                            onClick={() => setAudienceType('COMMUNITY')}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${audienceType === 'COMMUNITY' ? 'bg-signal text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                              <MapPin size={14} /> Community
                          </button>
                      </div>

                      {/* Sub Options */}
                      {audienceType === 'FRIENDS' && (
                          <div className="flex gap-2 animate-in slide-in-from-top-2">
                              <button 
                                onClick={() => setFriendScope('ALL')}
                                className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${friendScope === 'ALL' ? 'bg-white/10 border-white/20 text-white' : 'border-transparent text-gray-500 hover:bg-white/5'}`}
                              >
                                  All Friends
                              </button>
                              <button 
                                onClick={() => setFriendScope('CLOSE')}
                                className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${friendScope === 'CLOSE' ? 'bg-mint/10 border-mint/20 text-mint' : 'border-transparent text-gray-500 hover:bg-white/5'}`}
                              >
                                  <Star size={12} fill={friendScope === 'CLOSE' ? "currentColor" : "none"} /> Close Friends
                              </button>
                          </div>
                      )}

                      {audienceType === 'COMMUNITY' && (
                          <div className="animate-in slide-in-from-top-2">
                              {localCommunities.length === 0 ? (
                                  <div className="text-center p-6 border-2 border-dashed border-white/10 rounded-2xl">
                                      <p className="text-xs text-gray-500">You haven't joined any local communities yet.</p>
                                  </div>
                              ) : (
                                  <div className="flex flex-wrap gap-2">
                                      {localCommunities.map(c => {
                                          const isSelected = selectedCommunityIds.includes(c.id);
                                          return (
                                              <button
                                                  key={c.id}
                                                  onClick={() => toggleCommunity(c.id)}
                                                  className={`
                                                      flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border transition-all
                                                      ${isSelected ? 'bg-white text-black border-white' : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'}
                                                  `}
                                              >
                                                  <img src={c.iconUrl} className="w-6 h-6 rounded-full object-cover" alt={c.name} />
                                                  <span className="text-xs font-bold">{c.name}</span>
                                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                              </button>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={(!text && !emoji) || (audienceType === 'COMMUNITY' && selectedCommunityIds.length === 0) || (audienceType === 'FRIENDS' && friendScope === 'CLOSE' && closeFriendIds.length === 0)}
                className={`w-full py-4 mt-4 bg-white text-black rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2`}
              >
                  {getButtonLabel()}
              </button>
          </div>
      </div>
  );
};
