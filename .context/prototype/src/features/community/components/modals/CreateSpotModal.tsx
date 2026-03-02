
import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Users, Check, Settings, Plus, Globe, Lock, Trash2, Edit2, ChevronDown, Info, ArrowLeft, Zap, Smile } from 'lucide-react';
import L from 'leaflet';
import { CommunitySpot, PrivateGroup } from '../../../../types';
import { useCommunityContext } from '../../context/CommunityContext';
import { useServerBoost } from '../../../monetization/hooks/useServerBoost';

interface CreateSpotModalProps {
  onClose: () => void;
  onSubmit: (spot: { name: string; radius: number; minPeople: number; location: { lat: number; lng: number }; type: 'COMMUNITY' | 'PRIVATE'; privateGroupId?: string; icon?: string }) => void;
  onUpdate?: (id: string, spot: Partial<CommunitySpot>) => void;
  onDelete?: (id: string) => void;
  initialCenter: { lat: number; lng: number };
  existingSpots?: CommunitySpot[];
  privateGroups?: PrivateGroup[];
}

type Mode = 'LIST' | 'EDIT' | 'CREATE';

const SPOT_ICONS = ["🏠", "🏢", "🌳", "🍺", "☕", "🍔", "🎵", "🎨", "🎮", "⚽", "🏋️", "📚", "🚆", "🛑", "👻", "⛺", "🏖️", "🏰", "🏭", "🚇"];

export const CreateSpotModal: React.FC<CreateSpotModalProps> = ({ 
    onClose, 
    onSubmit, 
    onUpdate,
    onDelete,
    initialCenter, 
    existingSpots = [], 
    privateGroups = [] 
}) => {
  const { selectedCommunity } = useCommunityContext();
  const { isBoosted } = useServerBoost(selectedCommunity?.id || '');

  const [mode, setMode] = useState<Mode>('LIST');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // --- FORM STATE ---
  const [name, setName] = useState('');
  const [radius, setRadius] = useState(300);
  const [minPeople, setMinPeople] = useState(10);
  const [spotType, setSpotType] = useState<'COMMUNITY' | 'PRIVATE'>('COMMUNITY');
  const [selectedPrivateGroupId, setSelectedPrivateGroupId] = useState<string>('');
  const [location, setLocation] = useState(initialCenter);
  const [icon, setIcon] = useState('');
  
  // --- MAP REFS ---
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const activeOverlayRef = useRef<{ marker: L.Marker; circle: L.Circle } | null>(null);

  // Refs to handle stale closures in Leaflet events
  const stateRef = useRef({ mode, location, radius });
  useEffect(() => {
      stateRef.current = { mode, location, radius };
  }, [mode, location, radius]);

  // --- HANDLERS ---

  const handleEditSpot = (spot: CommunitySpot) => {
      setEditingId(spot.id);
      setName(spot.name);
      setRadius(spot.radius);
      setMinPeople(spot.minPeople);
      setSpotType(spot.type);
      setLocation(spot.location);
      setIcon(spot.icon || '');
      if (spot.privateGroupId) setSelectedPrivateGroupId(spot.privateGroupId);
      setMode('EDIT');
      mapInstanceRef.current?.flyTo([spot.location.lat, spot.location.lng], 16);
  };

  const handleStartCreate = () => {
      setEditingId(null);
      setName('');
      setRadius(300);
      setMinPeople(10);
      setSpotType('COMMUNITY');
      setIcon('');
      setLocation(mapInstanceRef.current?.getCenter() || initialCenter);
      setMode('CREATE');
  };

  const handleCancel = () => {
      setMode('LIST');
      setEditingId(null);
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Remove this spot from the community map?")) {
          if (onDelete) onDelete(id);
          handleCancel();
      }
  };

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
        center: [initialCenter.lat, initialCenter.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    layersRef.current = layers;

    // Active Placement Tools
    const activeIcon = L.divIcon({
        html: `<div class="w-6 h-6 bg-white rounded-full border-4 border-[#0F1115] shadow-2xl animate-in zoom-in"></div>`,
        className: 'bg-transparent',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const activeMarker = L.marker([initialCenter.lat, initialCenter.lng], { 
        icon: activeIcon, 
        draggable: true,
        zIndexOffset: 1000 
    });
    
    const activeCircle = L.circle([initialCenter.lat, initialCenter.lng], {
        color: '#00E096',
        fillColor: '#00E096',
        fillOpacity: 0.15,
        radius: 300,
        weight: 2,
        dashArray: '4, 4'
    });

    activeOverlayRef.current = { marker: activeMarker, circle: activeCircle };

    map.on('click', (e) => {
        const { mode: currentMode, location: currentLoc, radius: currentRad } = stateRef.current;
        
        if (currentMode !== 'LIST') {
            const clickLatLng = e.latlng;
            const centerLatLng = L.latLng(currentLoc.lat, currentLoc.lng);
            const distance = clickLatLng.distanceTo(centerLatLng);

            // If user clicks outside the radius while editing, exit the state
            if (distance > currentRad) {
                handleCancel();
            } else {
                // If inside, reposition the marker/circle
                const newLoc = { lat: clickLatLng.lat, lng: clickLatLng.lng };
                setLocation(newLoc);
                activeMarker.setLatLng(newLoc);
                activeCircle.setLatLng(newLoc);
            }
        }
    });

    activeMarker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        const newLoc = { lat: position.lat, lng: position.lng };
        setLocation(newLoc);
        activeCircle.setLatLng(newLoc);
    });

    mapInstanceRef.current = map;
    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Sync Existing Spots on Map
  useEffect(() => {
      const layers = layersRef.current;
      const map = mapInstanceRef.current;
      if (!layers || !map) return;
      layers.clearLayers();

      existingSpots.forEach(spot => {
          if (spot.id === editingId) return; 

          L.circle([spot.location.lat, spot.location.lng], {
              color: spot.type === 'PRIVATE' ? '#EF4444' : '#00E096',
              fillColor: spot.type === 'PRIVATE' ? '#EF4444' : '#00E096',
              fillOpacity: 0.05,
              radius: spot.radius,
              weight: 1,
              dashArray: '4, 4'
          }).addTo(layers);

          let htmlContent = `<div class="w-3 h-3 rounded-full border-2 border-void ${spot.type === 'PRIVATE' ? 'bg-red-500' : 'bg-mint'}"></div>`;
          let iconSize: [number, number] = [12, 12];
          
          // Preview Icon on Map
          if (spot.icon) {
              htmlContent = `<div class="text-xl drop-shadow-md">${spot.icon}</div>`;
              iconSize = [24, 24];
          }

          const spotIcon = L.divIcon({
              html: htmlContent,
              className: 'bg-transparent flex items-center justify-center',
              iconSize: iconSize
          });
          
          const marker = L.marker([spot.location.lat, spot.location.lng], { icon: spotIcon }).addTo(layers);
          marker.on('click', () => handleEditSpot(spot));
      });
  }, [existingSpots, editingId, mode]);

  // Handle Placement Overlay Visibility & Icon Preview
  useEffect(() => {
      const map = mapInstanceRef.current;
      const overlay = activeOverlayRef.current;
      if (!map || !overlay) return;

      if (mode === 'LIST') {
          overlay.marker.remove();
          overlay.circle.remove();
      } else {
          overlay.marker.addTo(map);
          overlay.circle.addTo(map);
          overlay.marker.setLatLng([location.lat, location.lng]);
          
          // Update Marker Icon to show selected emoji
          if (icon) {
              const emojiIcon = L.divIcon({
                  html: `<div class="text-3xl drop-shadow-2xl filter drop-shadow-lg">${icon}</div>`,
                  className: 'bg-transparent flex items-center justify-center',
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
              });
              overlay.marker.setIcon(emojiIcon);
          } else {
              // Default
              const defaultIcon = L.divIcon({
                  html: `<div class="w-6 h-6 bg-white rounded-full border-4 border-[#0F1115] shadow-2xl animate-in zoom-in"></div>`,
                  className: 'bg-transparent',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
              });
              overlay.marker.setIcon(defaultIcon);
          }

          overlay.circle.setLatLng([location.lat, location.lng]);
          overlay.circle.setRadius(radius);
          overlay.circle.setStyle({
              color: spotType === 'PRIVATE' ? '#EF4444' : '#00E096',
              fillColor: spotType === 'PRIVATE' ? '#EF4444' : '#00E096',
          });
      }
  }, [mode, location, radius, spotType, icon]);

  const handleSave = () => {
      if (!name) return;
      const payload = { name, radius, minPeople, location, type: spotType, privateGroupId: selectedPrivateGroupId, icon };
      if (mode === 'EDIT' && editingId && onUpdate) onUpdate(editingId, payload);
      else onSubmit(payload);
      handleCancel();
  };

  return (
      <div className="fixed inset-0 z-[150] bg-[#0F1115] flex animate-in fade-in duration-300">
          
          {/* --- SPATIAL SIDEBAR --- */}
          <div className="w-80 md:w-96 bg-[#0A0A0A] border-r border-white/5 flex flex-col z-20 shadow-2xl relative">
              
              {/* Sidebar Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div>
                      <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Settings</h2>
                      <h1 className="text-xl font-black text-white">Community Map</h1>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors">
                      <X size={20} />
                  </button>
              </div>

              {/* Dynamic Content Pane */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {mode === 'LIST' ? (
                      <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{existingSpots.length} Spots Managed</span>
                              <button onClick={handleStartCreate} className="p-2 bg-signal rounded-lg text-white shadow-lg shadow-signal/20 hover:scale-105 active:scale-95 transition-all">
                                  <Plus size={18} />
                              </button>
                          </div>

                          <div className="space-y-3">
                              {existingSpots.map(spot => (
                                  <div 
                                    key={spot.id} 
                                    onClick={() => handleEditSpot(spot)}
                                    className="group p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer"
                                  >
                                      <div className="flex items-center gap-4">
                                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-lg ${spot.type === 'COMMUNITY' ? 'bg-mint/10 text-mint border-mint/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                              {spot.icon ? spot.icon : <MapPin size={20} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h3 className="font-bold text-white truncate">{spot.name}</h3>
                                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                                                  {spot.radius}m • {spot.minPeople} Members
                                              </p>
                                          </div>
                                          <ChevronDown size={14} className="text-gray-700 -rotate-90" />
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <div className="pt-8 text-center px-4">
                               <Info size={24} className="mx-auto text-gray-800 mb-3" />
                               <p className="text-xs text-gray-600 leading-relaxed">
                                   When enough members are present in a Spot, it automatically triggers a "Live Gathering" on the global map.
                               </p>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                          <div className="flex items-center gap-2">
                              <button onClick={handleCancel} className="p-2 -ml-2 text-gray-500 hover:text-white transition-colors">
                                  <ArrowLeft size={20} />
                              </button>
                              <h2 className="text-xl font-black text-white">{mode === 'EDIT' ? 'Edit Spot' : 'New Spot'}</h2>
                          </div>

                          <div className="space-y-6">
                               {/* Name & Icon */}
                               <div className="space-y-2">
                                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Name</label>
                                   <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. The Bass Bunker"
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-signal font-bold transition-all"
                                   />
                               </div>

                               {/* Icon Selector (Boost Perk) */}
                               <div>
                                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 block flex items-center gap-2">
                                       <Smile size={12} className="text-gray-400" /> Map Icon
                                       {!isBoosted && <span className="bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded text-[9px] font-black border border-yellow-500/30">LOCKED</span>}
                                   </label>
                                   
                                   {isBoosted ? (
                                       <div className="bg-white/5 border border-white/5 rounded-xl p-3 grid grid-cols-5 gap-2">
                                           <button 
                                              onClick={() => setIcon('')}
                                              className={`aspect-square rounded-lg flex items-center justify-center transition-all ${icon === '' ? 'bg-white/20 border-white/50' : 'hover:bg-white/10 text-gray-500'}`}
                                              title="Default Pin"
                                           >
                                               <MapPin size={16} />
                                           </button>
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
                                   ) : (
                                       <div className="bg-gradient-to-br from-yellow-500/5 to-transparent border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3 opacity-80">
                                           <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-500">
                                               <Zap size={16} fill="currentColor" />
                                           </div>
                                           <div>
                                               <div className="text-xs font-bold text-yellow-500">Boost to Unlock</div>
                                               <div className="text-[10px] text-gray-500 mt-0.5">Custom icons are a supporter perk.</div>
                                           </div>
                                       </div>
                                   )}
                               </div>

                               {/* Visibility Toggles */}
                               <div>
                                   <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Visibility</label>
                                   <div className="flex p-1 bg-white/5 rounded-xl border border-white/10">
                                       <button 
                                            onClick={() => setSpotType('COMMUNITY')}
                                            className={`flex-1 py-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${spotType === 'COMMUNITY' ? 'bg-mint text-black shadow-lg shadow-mint/20' : 'text-gray-500 hover:text-gray-300'}`}
                                       >
                                           <Globe size={14} /> Community
                                       </button>
                                       <button 
                                            onClick={() => setSpotType('PRIVATE')}
                                            className={`flex-1 py-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${spotType === 'PRIVATE' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-500 hover:text-gray-300'}`}
                                       >
                                           <Lock size={14} /> Private
                                       </button>
                                   </div>
                               </div>

                               {/* Private Group Selector */}
                               {spotType === 'PRIVATE' && (
                                   <div className="animate-in fade-in slide-in-from-top-2">
                                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Restricted to Group</label>
                                       <select 
                                            value={selectedPrivateGroupId}
                                            onChange={(e) => setSelectedPrivateGroupId(e.target.value)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white appearance-none focus:outline-none focus:border-red-500 text-sm font-bold"
                                       >
                                           <option value="" disabled>Choose a private group</option>
                                           {privateGroups.map(pg => <option key={pg.id} value={pg.id}>{pg.name}</option>)}
                                       </select>
                                   </div>
                               )}

                               <div className="h-[1px] bg-white/5"></div>

                               {/* Threshold */}
                               <div>
                                   <div className="flex justify-between items-center mb-4">
                                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Live Threshold</label>
                                       <span className="text-xl font-mono font-black text-white">{minPeople}</span>
                                   </div>
                                   <input 
                                        type="range" min="1" max="100" step="1" 
                                        value={minPeople} 
                                        onChange={(e) => setMinPeople(parseInt(e.target.value))}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-signal"
                                   />
                                   <p className="text-[10px] text-gray-600 mt-2 italic leading-tight">
                                       When {minPeople} members are in this radius, a Live Gathering appears globally.
                                   </p>
                               </div>

                               {/* Radius */}
                               <div>
                                   <div className="flex justify-between items-center mb-4">
                                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Coverage Area</label>
                                       <span className={`text-sm font-bold ${spotType === 'PRIVATE' ? 'text-red-400' : 'text-mint'}`}>{radius}m</span>
                                   </div>
                                   <input 
                                        type="range" min="50" max="2000" step="50" 
                                        value={radius} 
                                        onChange={(e) => setRadius(parseInt(e.target.value))}
                                        className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer ${spotType === 'PRIVATE' ? 'accent-red-500' : 'accent-mint'}`}
                                   />
                               </div>
                          </div>

                          <div className="pt-6 flex flex-col gap-3">
                               <button 
                                    onClick={handleSave}
                                    disabled={!name}
                                    className={`w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-3 shadow-xl ${name ? (spotType === 'PRIVATE' ? 'bg-red-500 text-white' : 'bg-mint text-black') : 'bg-white/5 text-gray-700 cursor-not-allowed'}`}
                               >
                                   {mode === 'EDIT' ? <Check size={20}/> : <Plus size={20}/>}
                                   {mode === 'EDIT' ? 'Save Changes' : 'Create Spot'}
                               </button>
                               {mode === 'EDIT' && (
                                   <button 
                                        onClick={() => editingId && handleDelete(editingId)}
                                        className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                   >
                                       <Trash2 size={14} /> Remove Spot
                                   </button>
                               )}
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* --- INTERACTIVE MAP VIEW --- */}
          <div className="flex-1 relative bg-[#050505] cursor-crosshair">
              <div ref={mapRef} className="absolute inset-0 z-0"></div>
              
              {/* Map Floating HUD */}
              <div className="absolute top-6 left-6 z-50 pointer-events-none">
                  <div className="bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-3 shadow-2xl animate-in fade-in duration-700 slide-in-from-left-4">
                       <div className={`w-2 h-2 rounded-full ${mode === 'LIST' ? 'bg-mint' : 'bg-signal'} animate-pulse`}></div>
                       <span className="text-[10px] font-black text-gray-100 uppercase tracking-widest">
                           {mode === 'LIST' ? 'Community Coverage View' : 'Placement Mode'}
                       </span>
                  </div>
              </div>

              {/* Simple Zoom Controls */}
              <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2">
                   <button onClick={() => mapInstanceRef.current?.zoomIn()} className="w-12 h-12 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-2xl">
                       <Plus size={20} />
                   </button>
                   <button onClick={() => mapInstanceRef.current?.zoomOut()} className="w-12 h-12 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-white/10 transition-all shadow-2xl font-black">
                       —
                   </button>
              </div>
          </div>
      </div>
  );
};
