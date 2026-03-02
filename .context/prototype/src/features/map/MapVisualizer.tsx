
import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { MapEntity, User, CommunitySpot, UserSpot } from '../../types';
import { getIconHtml, getMeIcon, getPopupContent, getDistance } from './utils';
import { MapPin, Eye, Ghost, Radio } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { SignalModal } from './components/SignalModal';
import { ActiveSignalHUD } from './components/ActiveSignalHUD';

interface MapVisualizerProps {
  nodes: MapEntity[];
  spots?: CommunitySpot[];
  userSpots?: UserSpot[]; 
  ghostMode: boolean;
  toggleGhostMode: () => void;
  onJoinGathering?: (chatId: string) => void;
  onCreateGroupChat?: (friends: User[]) => void;
  onViewEvent?: (eventId: string) => void;
  onStartDirectMessage?: (friendId: string) => void;
  mode?: 'FULL' | 'EMBEDDED' | 'PERSONAL_SPOT_CREATION'; 
  centerOnNode?: { lat: number; lng: number };
  
  // Creation Mode Props
  creationConfig?: {
      location: { lat: number; lng: number };
      radius: number;
      onLocationChange: (loc: { lat: number; lng: number }) => void;
      onRadiusChange: (radius: number) => void;
  };
}

const DEFAULT_CENTER: [number, number] = [55.6049, 13.0038]; 

// Robust coordinate validation
const isValidCoord = (n: any): n is number => 
    typeof n === 'number' && !isNaN(n) && isFinite(n);

export const MapVisualizer: React.FC<MapVisualizerProps> = ({
  nodes = [],
  spots = [],
  userSpots = [],
  ghostMode,
  toggleGhostMode,
  onJoinGathering,
  onCreateGroupChat,
  onViewEvent,
  onStartDirectMessage,
  mode = 'FULL',
  centerOnNode,
  creationConfig
}) => {
  const { currentUser, clearSignal } = useData();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const spotsLayerRef = useRef<L.LayerGroup | null>(null);
  const userSpotsLayerRef = useRef<L.LayerGroup | null>(null);
  const creationLayerRef = useRef<L.LayerGroup | null>(null); // For drag marker/circle
  
  const [myLocation] = useState({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // State for visibility status HUD
  const [visibilityStatus, setVisibilityStatus] = useState<{ visible: boolean; spotName?: string }>({ visible: false });
  
  // Signal State
  const [showSignalModal, setShowSignalModal] = useState(false);

  // creationConfig ref to avoid stale closures in Leaflet event listeners
  const creationConfigRef = useRef(creationConfig);
  useEffect(() => { creationConfigRef.current = creationConfig; }, [creationConfig]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Calculate Visibility Status based on My Location and Active User Spots
  useEffect(() => {
      if (ghostMode) {
          setVisibilityStatus({ visible: false });
          return;
      }

      if (!userSpots || userSpots.length === 0) {
          setVisibilityStatus({ visible: false });
          return;
      }
      
      const activeSpot = userSpots.find(spot => {
          if (!spot.isActive) return false;
          const dist = getDistance(myLocation.lat, myLocation.lng, spot.location.lat, spot.location.lng);
          return dist <= spot.radius;
      });

      if (activeSpot) {
          setVisibilityStatus({ visible: true, spotName: activeSpot.name });
      } else {
          setVisibilityStatus({ visible: false });
      }
  }, [myLocation, userSpots, ghostMode]);

  const filteredNodes = useMemo(() => {
      if (mode === 'EMBEDDED' || mode === 'PERSONAL_SPOT_CREATION') return []; // Hide clutter in specific modes if needed, or pass empty nodes from parent
      return nodes.filter(n => ['FRIEND', 'GROUP', 'GATHERING', 'EVENT'].includes(n.type));
  }, [nodes, mode]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;
    
    // Layers order matters for z-index
    spotsLayerRef.current = L.layerGroup().addTo(map);
    userSpotsLayerRef.current = L.layerGroup().addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    creationLayerRef.current = L.layerGroup().addTo(map);

    const resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    // Handle Map Clicks for Creation Mode
    map.on('click', (e) => {
        if (creationConfigRef.current) {
            creationConfigRef.current.onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Handle Interaction Modes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mode === 'EMBEDDED') {
        map.dragging.disable();
        map.touchZoom.disable();
        map.scrollWheelZoom.disable();
    } else {
        map.dragging.enable();
        map.touchZoom.enable();
        map.scrollWheelZoom.enable();
    }
  }, [mode]);

  // 3. View Center Logic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !centerOnNode) return;
    
    if (isValidCoord(centerOnNode.lat) && isValidCoord(centerOnNode.lng)) {
        if (mode === 'EMBEDDED') {
            map.setView([centerOnNode.lat, centerOnNode.lng], 15);
        } else {
            map.flyTo([centerOnNode.lat, centerOnNode.lng], 15, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }
  }, [centerOnNode, mode]);

  // 4. Render Community Spots
  useEffect(() => {
      const layers = spotsLayerRef.current;
      if (!layers) return;
      layers.clearLayers();

      if (mode === 'FULL') {
          spots.forEach(spot => {
              if (spot.location && isValidCoord(spot.location.lat) && isValidCoord(spot.location.lng)) {
                  L.circle([spot.location.lat, spot.location.lng], {
                      color: spot.type === 'PRIVATE' ? '#EF4444' : '#00E096',
                      fillColor: spot.type === 'PRIVATE' ? '#EF4444' : '#00E096',
                      fillOpacity: 0.05,
                      radius: spot.radius || 300,
                      weight: 1,
                      dashArray: '4, 4'
                  }).addTo(layers);
              }
          });
      }
  }, [spots, mode]);

  // 5. Render User Spots (Personal)
  useEffect(() => {
      const layers = userSpotsLayerRef.current;
      if (!layers) return;
      layers.clearLayers();

      // Show user spots in FULL and PERSONAL_SPOT_CREATION modes
      if (mode !== 'EMBEDDED') {
          userSpots.forEach(spot => {
              if (spot.location && isValidCoord(spot.location.lat) && isValidCoord(spot.location.lng)) {
                  // Only show visually if active or in creation mode context (though creation mode usually handles its own overlay)
                  const opacity = spot.isActive ? 0.08 : 0.02;
                  const color = spot.isActive ? '#818CF8' : '#666';

                  // Circle
                  L.circle([spot.location.lat, spot.location.lng], {
                      color: color, 
                      fillColor: color,
                      fillOpacity: opacity,
                      radius: spot.radius,
                      weight: spot.isActive ? 1.5 : 1,
                      dashArray: '6, 6'
                  }).addTo(layers);

                  // Icon
                  if (spot.isActive) {
                      const iconHtml = `<div class="text-lg drop-shadow-md transform hover:scale-125 transition-transform cursor-default" title="${spot.name}">${spot.icon}</div>`;
                      const icon = L.divIcon({
                          html: iconHtml,
                          className: 'bg-transparent flex items-center justify-center',
                          iconSize: [24, 24],
                          iconAnchor: [12, 12]
                      });
                      const marker = L.marker([spot.location.lat, spot.location.lng], { icon }).addTo(layers);

                      // Bind Popup with Edit Action
                      const popupContent = `
                        <div class="text-sm font-sans min-w-[140px]">
                            <div class="font-bold text-white mb-1 flex items-center gap-2">
                                <span class="text-xl">${spot.icon}</span> <span>${spot.name}</span>
                            </div>
                            <div class="text-[10px] text-indigo-400 mb-3 uppercase tracking-wide font-black">
                                Personal Place • ${spot.radius}m
                            </div>
                            <button 
                                onclick="window.dispatchEvent(new CustomEvent('edit-user-spot', { detail: '${spot.id}' }))"
                                class="w-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Edit Place
                            </button>
                        </div>
                      `;
                      marker.bindPopup(popupContent, {
                          closeButton: false,
                          className: 'custom-popup' // relies on global style overrides
                      });
                  }
              }
          });
      }
  }, [userSpots, mode]);

  // 6. Render Creation Overlay (Marker + Circle)
  useEffect(() => {
      const layers = creationLayerRef.current;
      if (!layers) return;
      layers.clearLayers();

      if (mode === 'PERSONAL_SPOT_CREATION' && creationConfig) {
          const { location, radius, onLocationChange } = creationConfig;

          // Draggable Marker
          const markerIcon = L.divIcon({
              html: `<div class="w-6 h-6 bg-white rounded-full border-4 border-indigo-500 shadow-2xl animate-pulse"></div>`,
              className: 'bg-transparent',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
          });

          const marker = L.marker([location.lat, location.lng], { 
              icon: markerIcon, 
              draggable: true,
              zIndexOffset: 2000 
          }).addTo(layers);

          marker.on('dragend', (e) => {
              const ll = e.target.getLatLng();
              onLocationChange({ lat: ll.lat, lng: ll.lng });
          });

          // Radius Circle
          L.circle([location.lat, location.lng], {
              color: '#818CF8',
              fillColor: '#818CF8',
              fillOpacity: 0.2,
              radius: radius,
              weight: 2,
              dashArray: '8, 8'
          }).addTo(layers);
      }
  }, [mode, creationConfig]); 

  // 7. Render Standard Markers (Friends, etc.)
  useEffect(() => {
    const layers = markersRef.current;
    if (!layers) return;

    layers.clearLayers();

    // In Creation mode, we might want to hide other markers or keep them for context
    // Keeping them provides better context for placing spots
    filteredNodes.forEach(node => {
      if (node.location && isValidCoord(node.location.lat) && isValidCoord(node.location.lng)) {
        const { html, size } = getIconHtml(node);
        const icon = L.divIcon({
          html,
          className: 'bg-transparent border-none',
          iconSize: size,
          iconAnchor: [size[0]/2, size[1]/2]
        });

        const marker = L.marker([node.location.lat, node.location.lng], { icon });
        const popupContent = getPopupContent(node);
        marker.bindPopup(popupContent);
        marker.addTo(layers);
      }
    });

    if (!ghostMode && isValidCoord(myLocation.lat) && isValidCoord(myLocation.lng) && mode !== 'EMBEDDED') {
        const myIcon = getMeIcon(currentUser.currentSignal);
        L.marker([myLocation.lat, myLocation.lng], { icon: myIcon, zIndexOffset: 1000 }).addTo(layers);
    }
  }, [filteredNodes, ghostMode, myLocation, mode, currentUser.currentSignal]);

  // Global Event Listeners
  useEffect(() => {
      const handleJoinChat = (e: Event) => {
          const detail = (e as CustomEvent).detail;
          if (onJoinGathering && detail) onJoinGathering(detail);
      };
      const handleCreateGroupChat = (e: Event) => {
          const nodeId = (e as CustomEvent).detail;
          const node = nodes.find(n => n.id === nodeId);
          if (onCreateGroupChat && node?.type === 'GROUP' && node.data.friends) {
              onCreateGroupChat(node.data.friends);
          }
      };
      const handleViewEvent = (e: Event) => {
          const eventId = (e as CustomEvent).detail;
          if (onViewEvent && eventId) onViewEvent(eventId);
      };
      const handleStartDM = (e: Event) => {
          const friendId = (e as CustomEvent).detail;
          if (onStartDirectMessage && friendId) onStartDirectMessage(friendId);
      };

      window.addEventListener('join-chat', handleJoinChat);
      window.addEventListener('create-group-chat', handleCreateGroupChat);
      window.addEventListener('view-event', handleViewEvent);
      window.addEventListener('start-dm', handleStartDM);
      
      return () => {
          window.removeEventListener('join-chat', handleJoinChat);
          window.removeEventListener('create-group-chat', handleCreateGroupChat);
          window.removeEventListener('view-event', handleViewEvent);
          window.removeEventListener('start-dm', handleStartDM);
      };
  }, [onJoinGathering, onCreateGroupChat, onViewEvent, onStartDirectMessage, nodes]);

  return (
    <div className="relative w-full h-full bg-[#0F1115] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Active Signal HUD */}
      {currentUser.currentSignal && mode === 'FULL' && (
          <ActiveSignalHUD signal={currentUser.currentSignal} onClear={clearSignal} />
      )}

      {/* Signal Creation Modal */}
      {showSignalModal && (
          <SignalModal onClose={() => setShowSignalModal(false)} />
      )}

      {/* Full Mode HUD */}
      {mode === 'FULL' && (
        <>
          <div className="absolute top-0 left-0 right-0 z-[400] p-4 flex flex-col items-center pointer-events-none">
               {/* Clock Widget */}
               <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 shadow-lg mb-2 flex flex-col items-center pointer-events-auto">
                   <div className="text-2xl font-bold text-white leading-none tracking-tight">
                       {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </div>
                   <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-1">
                       {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                   </div>
               </div>

               {/* Visibility Status Widget */}
               <div className={`
                   backdrop-blur-md px-3 py-1.5 rounded-full border shadow-lg flex items-center gap-2 pointer-events-auto transition-all duration-300
                   ${visibilityStatus.visible 
                        ? 'bg-signal/20 border-signal/50 text-signal shadow-signal/20' 
                        : 'bg-black/60 border-white/10 text-gray-400'}
               `}>
                   {visibilityStatus.visible ? <Eye size={12} className="animate-pulse" /> : <Ghost size={12} />}
                   <span className="text-[10px] font-bold uppercase tracking-widest">
                       {visibilityStatus.visible ? `Visible at ${visibilityStatus.spotName}` : 'Hidden (In Transit)'}
                   </span>
               </div>
          </div>

          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-3">
             <button
                onClick={toggleGhostMode}
                className={`p-3 rounded-full backdrop-blur-md border transition-all shadow-lg flex items-center justify-center ${ghostMode ? 'bg-signal text-white border-signal' : 'bg-black/40 text-gray-400 border-white/10 hover:bg-black/60 hover:text-white'}`}
                title="Toggle Ghost Mode"
             >
                {ghostMode ? <GhostActiveIcon /> : <GhostInactiveIcon />}
             </button>
             
             {/* Broadcast Signal Trigger */}
             {!ghostMode && (
                 <button
                    onClick={() => setShowSignalModal(true)}
                    className="p-3 rounded-full backdrop-blur-md border border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500 hover:text-white transition-all shadow-lg flex items-center justify-center animate-in zoom-in slide-in-from-right-4"
                    title="Broadcast Signal"
                 >
                    <Radio size={20} />
                 </button>
             )}
          </div>
        </>
      )}

      {/* Creation Mode HUD */}
      {mode === 'PERSONAL_SPOT_CREATION' && creationConfig && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[400] w-full max-w-sm px-4 pointer-events-none">
              <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-auto animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                          <MapPin size={12} /> Spot Radius
                      </label>
                      <span className="text-xs font-bold text-white">{creationConfig.radius}m</span>
                  </div>
                  <input 
                      type="range" 
                      min="50" 
                      max="1000" 
                      step="50" 
                      value={creationConfig.radius}
                      onChange={(e) => creationConfig.onRadiusChange(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 text-center">
                      Drag marker to move • Slide to resize
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

const GhostActiveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
);

const GhostInactiveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
