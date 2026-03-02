
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Plus, Trash2, Check, ArrowLeft, Smile, Eye, EyeOff } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { MapVisualizer } from '../map/MapVisualizer';
import { UserSpot } from '../../types';

interface ManagePlacesModalProps {
  onClose: () => void;
  initialEditId?: string | null;
}

const DEFAULT_CENTER = { lat: 55.6049, lng: 13.0038 }; // Default Malmö center
const SPOT_ICONS = ["🏠", "💼", "🏋️", "🎓", "☕", "🍺", "🌳", "🏖️", "🎮", "❤️", "📍", "🚲", "🛒", "🍔", "📚"];

export const ManagePlacesModal: React.FC<ManagePlacesModalProps> = ({ onClose, initialEditId }) => {
  const { currentUser, createUserSpot, deleteUserSpot, toggleUserSpot } = useData();
  const [mode, setMode] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Create/Edit Form State
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [radius, setRadius] = useState(200);
  const [location, setLocation] = useState(DEFAULT_CENTER);

  // Hydrate on mount if initialEditId is provided
  useEffect(() => {
      if (initialEditId && currentUser.userSpots) {
          const spot = currentUser.userSpots.find(s => s.id === initialEditId);
          if (spot) {
              setEditingId(spot.id);
              setName(spot.name);
              setIcon(spot.icon);
              setRadius(spot.radius);
              setLocation(spot.location);
              setMode('EDIT');
          }
      }
  }, [initialEditId, currentUser.userSpots]);

  const handleStartCreate = () => {
      setName('');
      setIcon('🏠');
      setRadius(200);
      setLocation(DEFAULT_CENTER); // Or user's current location if available
      setMode('CREATE');
  };

  const handleEdit = (spot: UserSpot) => {
      setEditingId(spot.id);
      setName(spot.name);
      setIcon(spot.icon);
      setRadius(spot.radius);
      setLocation(spot.location);
      setMode('EDIT');
  };

  const handleSave = () => {
      if (!name) return;
      
      if (mode === 'EDIT' && editingId) {
          // Delete old and create new to simulate update since we don't have updateUserSpot yet
          deleteUserSpot(editingId);
          createUserSpot({ name, icon, radius, location });
      } else {
          createUserSpot({ name, icon, radius, location });
      }
      
      setMode('LIST');
      setName('');
      setEditingId(null);
  };

  const handleDelete = () => {
      if (editingId && window.confirm("Delete this place?")) {
          deleteUserSpot(editingId);
          setMode('LIST');
      }
  };

  return (
      <div className="fixed inset-0 z-[150] bg-[#0F1115] flex animate-in fade-in duration-300 font-sans">
          
          {/* --- SIDEBAR --- */}
          <div className="w-80 md:w-96 bg-[#0A0A0A] border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
              
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                      {(mode === 'CREATE' || mode === 'EDIT') && (
                          <button 
                            onClick={() => setMode('LIST')} 
                            className="p-1 -ml-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                          >
                              <ArrowLeft size={20} />
                          </button>
                      )}
                      <div>
                          <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Settings</h2>
                          <h1 className="text-xl font-black text-white">
                              {mode === 'LIST' ? 'My Places' : (mode === 'EDIT' ? 'Edit Place' : 'New Place')}
                          </h1>
                      </div>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
              </div>

              {/* Content Pane */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  
                  {/* LIST VIEW */}
                  {mode === 'LIST' && (
                      <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  {currentUser.userSpots?.length || 0} Saved Places
                              </span>
                              <button 
                                onClick={handleStartCreate}
                                className="p-2 bg-signal rounded-lg text-white shadow-lg shadow-signal/20 hover:scale-105 active:scale-95 transition-all"
                              >
                                  <Plus size={18} />
                              </button>
                          </div>

                          <div className="space-y-3">
                              {(currentUser.userSpots || []).map(spot => (
                                  <div 
                                    key={spot.id} 
                                    className={`group p-4 border rounded-2xl transition-all flex items-center justify-between ${spot.isActive ? 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]' : 'bg-black border-white/5 opacity-60'}`}
                                  >
                                      <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => handleEdit(spot)}>
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${spot.isActive ? 'bg-white/5 border-white/5' : 'bg-black border-white/5 grayscale'}`}>
                                              {spot.icon}
                                          </div>
                                          <div>
                                              <h3 className={`font-bold ${spot.isActive ? 'text-white' : 'text-gray-500'}`}>{spot.name}</h3>
                                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                                  {spot.radius}m Radius
                                              </p>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <button 
                                            onClick={(e) => { e.stopPropagation(); toggleUserSpot(spot.id); }}
                                            className={`p-2 rounded-lg transition-colors ${spot.isActive ? 'text-signal bg-signal/10 hover:bg-signal/20' : 'text-gray-600 bg-white/5 hover:text-gray-400'}`}
                                            title={spot.isActive ? 'Hide Visibility' : 'Show Visibility'}
                                          >
                                              {spot.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                                          </button>
                                          <button 
                                            onClick={() => handleEdit(spot)}
                                            className="p-2 text-gray-600 hover:text-white transition-colors"
                                          >
                                              <Edit2 size={14} />
                                          </button>
                                      </div>
                                  </div>
                              ))}

                              {(currentUser.userSpots || []).length === 0 && (
                                  <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                                      <MapPin size={32} className="mx-auto text-gray-700 mb-3" />
                                      <p className="text-gray-500 text-sm font-medium">No places defined yet.</p>
                                      <p className="text-xs text-gray-600 mt-1">Add Home, Work, or Hangouts.</p>
                                  </div>
                              )}
                          </div>
                          
                          <div className="pt-4 px-2">
                              <p className="text-xs text-gray-600 leading-relaxed text-center">
                                  You are only visible to friends on the map when you are physically inside one of your active places.
                              </p>
                          </div>
                      </div>
                  )}

                  {/* CREATE / EDIT VIEW */}
                  {(mode === 'CREATE' || mode === 'EDIT') && (
                      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                          <div className="space-y-6">
                               {/* Name Input */}
                               <div className="space-y-2">
                                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Place Name</label>
                                   <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Home Base"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-signal font-bold transition-all placeholder-gray-600"
                                        autoFocus
                                   />
                               </div>

                               {/* Icon Grid */}
                               <div>
                                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                       <Smile size={12} className="text-gray-400" /> Map Icon
                                   </label>
                                   <div className="bg-white/5 border border-white/5 rounded-xl p-3 grid grid-cols-5 gap-2">
                                       {SPOT_ICONS.map(emoji => (
                                           <button
                                              key={emoji}
                                              onClick={() => setIcon(emoji)}
                                              className={`aspect-square rounded-lg flex items-center justify-center text-xl transition-all ${icon === emoji ? 'bg-white/20 border border-white/50 shadow-lg scale-110' : 'hover:bg-white/10 hover:scale-105'}`}
                                           >
                                               {emoji}
                                           </button>
                                       ))}
                                   </div>
                               </div>
                          </div>

                          <div className="pt-6 flex flex-col gap-3">
                               <button 
                                    onClick={handleSave}
                                    disabled={!name}
                                    className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-xl ${name ? 'bg-signal hover:bg-blue-600 text-white' : 'bg-white/5 text-gray-700 cursor-not-allowed'}`}
                               >
                                   <Check size={20}/>
                                   {mode === 'EDIT' ? 'Save Changes' : 'Create Place'}
                               </button>
                               
                               {mode === 'EDIT' && (
                                   <button 
                                        onClick={handleDelete}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                   >
                                       <Trash2 size={14} /> Remove Place
                                   </button>
                               )}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* --- MAP AREA --- */}
          <div className="flex-1 relative bg-black">
              {/* Using MapVisualizer with appropriate props based on mode */}
              <MapVisualizer 
                  mode={mode === 'LIST' ? 'FULL' : 'PERSONAL_SPOT_CREATION'}
                  nodes={[]} // Clean view
                  spots={[]} // Hide community spots to focus on personal? Or show context? Let's show clean.
                  userSpots={currentUser.userSpots} // Always show existing spots
                  ghostMode={false}
                  toggleGhostMode={() => {}}
                  centerOnNode={mode !== 'LIST' ? location : undefined}
                  creationConfig={mode !== 'LIST' ? {
                      location,
                      radius,
                      onLocationChange: setLocation,
                      onRadiusChange: setRadius
                  } : undefined}
              />
              
              {/* Mode Indicator Overlay */}
              <div className="absolute top-6 left-6 z-[400] pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl animate-in fade-in duration-700 slide-in-from-left-4">
                       <div className={`w-2 h-2 rounded-full ${mode === 'LIST' ? 'bg-mint' : 'bg-signal'} animate-pulse`}></div>
                       <span className="text-[10px] font-black text-gray-100 uppercase tracking-widest">
                           {mode === 'LIST' ? 'Your Places' : 'Placement Mode'}
                       </span>
                  </div>
              </div>
          </div>
      </div>
  );
};

// Helper Icon for edit button in list
const Edit2 = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
);
