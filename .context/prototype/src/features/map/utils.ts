
import L from 'leaflet';
import { MapEntity, User } from '../../types';

// Constants for Colors
const BLUE_COLOR = '#2E5CFF'; // Vivid Signal Blue
const RED_COLOR = '#EF4444';
const MINT_COLOR = '#00E096';

// Custom Silhouette Group Icon (recreating user image reference)
const GROUP_CLUSTER_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
  <!-- Center User -->
  <circle cx="50" cy="32" r="14" fill="currentColor"/>
  <path d="M22 85C22 65 32 55 50 55C68 55 78 65 78 85" fill="currentColor"/>
  <!-- Left User -->
  <circle cx="22" cy="42" r="11" fill="currentColor"/>
  <path d="M5 85C5 72 10 65 22 65" fill="currentColor"/>
  <!-- Right User -->
  <circle cx="78" cy="42" r="11" fill="currentColor"/>
  <path d="M95 85C95 72 90 65 78 65" fill="currentColor"/>
</svg>`;

const USERS_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;

/**
 * Generates the HTML for a custom Leaflet DivIcon based on the node type.
 */
export const getIconHtml = (node: MapEntity): { html: string; size: [number, number] } => {
  let html = '';
  let size: [number, number] = [32, 32];

  if (node.type === 'FRIEND') {
    size = [40, 40];
    const hasSignal = !!node.data.signal;
    const borderColor = hasSignal ? '#F472B6' : BLUE_COLOR; // Pink for signal, Blue default

    let signalHtml = '';
    if (hasSignal) {
        signalHtml = `
            <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 z-50 animate-in zoom-in slide-in-from-bottom-2 duration-300 pointer-events-none">
                <span class="text-xl leading-none filter drop-shadow-sm">${node.data.signal.emoji}</span>
                <span class="text-[10px] font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity max-w-[100px] truncate">${node.data.signal.text}</span>
            </div>
        `;
    }

    html = `
      <div class="relative w-10 h-10 group">
        ${signalHtml}
        <div class="w-full h-full rounded-full border-2 border-[${borderColor}] overflow-hidden bg-[#0F1115] shadow-lg relative z-10 transition-transform group-hover:scale-110 ${hasSignal ? 'ring-2 ring-pink-500/30' : ''}">
           <img src="${node.data.avatarUrl}" class="w-full h-full object-cover" />
           ${node.data.status === 'ONLINE' ? '<div class="absolute bottom-0 right-0 w-3 h-3 bg-mint rounded-full border-2 border-[#0F1115]"></div>' : ''}
        </div>
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-black text-white bg-black/80 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
          ${node.data.name.split(' ')[0]}
        </div>
      </div>
    `;
  } else if (node.type === 'GROUP') {
    // FRIENDSHIP CLUSTER (Distinct Blue circle with Group Icon)
    size = [60, 60];
    const friends: User[] = node.data.friends || [];
    const color = BLUE_COLOR; 
    
    html = `
        <div class="relative w-14 h-14 flex items-center justify-center group cursor-pointer">
            <!-- Pulsing outer glow -->
            <div class="absolute inset-0 bg-[${color}]/20 rounded-full animate-pulse scale-125"></div>
            
            <!-- Icon Container -->
            <div class="w-full h-full rounded-full bg-[#0F1115] border-[3px] border-[${color}] flex items-center justify-center shadow-[0_0_20px_rgba(46,92,255,0.6)] transition-all group-hover:scale-110 overflow-hidden text-[${color}] relative z-10">
               <div class="w-full h-full flex items-center justify-center bg-[${color}]/5">
                 ${GROUP_CLUSTER_SVG}
               </div>
            </div>

            <!-- Count Badge -->
            <div class="absolute -top-1 -right-1 w-7 h-7 bg-[${color}] text-white text-[12px] font-black flex items-center justify-center rounded-full border-[3px] border-[#0F1115] z-20 shadow-xl">
               ${friends.length}
            </div>
        </div>
        <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] font-black text-white bg-[${color}]/90 backdrop-blur-md px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            ${node.data.name}
        </div>
    `;
  } else if (node.type === 'GATHERING') {
    const count = node.data.memberCount || 0;
    const isGroupChat = node.data.communityName === "Group Chat"; 
    const isPrivate = !!node.privateGroupId; 
    
    size = [54, 54]; 
    
    const activeColor = isPrivate ? RED_COLOR : (isGroupChat ? BLUE_COLOR : MINT_COLOR);
    const borderColor = `border-[${activeColor}]`;
    const pulseColor = `bg-[${activeColor}]/20`;
    
    // CONTENT: Check for custom icon first, then fallbacks
    let innerContent;
    if (node.data.customIcon) {
        // --- NEW: RENDER CUSTOM EMOJI ICON ---
        innerContent = `<div class="text-2xl leading-none flex items-center justify-center pb-1">${node.data.customIcon}</div>`;
    } else if (isGroupChat) {
        innerContent = `<div class="text-[${activeColor}] flex items-center justify-center">${GROUP_CLUSTER_SVG}</div>`;
    } else if (isPrivate) {
        innerContent = `<div class="text-[${activeColor}] flex items-center justify-center">${USERS_ICON_SVG}</div>`;
    } else if (node.data.communityIconUrl) {
        innerContent = `<img src="${node.data.communityIconUrl}" class="w-full h-full object-cover" alt="${node.data.name}" />`;
    } else {
        innerContent = `<span class="text-white font-bold text-sm">#</span>`;
    }

    html = `
      <div class="relative w-12 h-12 flex items-center justify-center group cursor-pointer">
         <div class="absolute inset-0 ${pulseColor} rounded-full animate-pulse scale-110"></div>
         
         <div class="w-full h-full rounded-full bg-[#0F1115] border-[3px] ${borderColor} flex items-center justify-center shadow-lg transition-transform hover:scale-110 overflow-hidden" style="border-color: ${activeColor}">
             ${innerContent}
         </div>
         
         <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-[${activeColor}] text-white text-[11px] font-black flex items-center justify-center rounded-full border-2 border-[#0F1115] z-10 shadow-md" style="background-color: ${activeColor}">
            ${count}
         </div>
      </div>
    `;
  } else if (node.type === 'EVENT') {
    size = [44, 44];
    const date = new Date(node.data.startTime);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    html = `
      <div class="relative w-11 h-11 group cursor-pointer hover:z-50">
         <div class="w-full h-full rounded-full bg-[#0F1115] border border-white/20 flex flex-col items-center justify-center shadow-lg overflow-hidden hover:scale-110 transition-transform">
             <div class="w-full bg-red-500 h-4 text-[7px] font-bold text-white flex items-center justify-center tracking-wider">
                ${month}
             </div>
             <div class="flex-1 flex items-center justify-center pb-1">
                <span class="text-white font-bold text-sm leading-none">${day}</span>
             </div>
         </div>
      </div>
    `;
  }

  return { html, size };
};

export const getPopupContent = (node: MapEntity): string => {
  if (node.type === 'GROUP') {
      const friends = node.data.friends || [];
      const friendAvatars = friends.map((f: User) => 
          `<img src="${f.avatarUrl}" title="${f.displayName}" class="w-6 h-6 rounded-full border border-[#0F1115]" />`
      ).join('');
      
      return `
         <div class="text-sm font-sans min-w-[140px]">
            <div class="font-bold mb-2 text-white flex items-center gap-2">
               <span class="text-signal">${node.data.name}</span>
               <span class="bg-signal/20 text-signal text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Cluster</span>
            </div>
            <div class="flex -space-x-2 mb-3 overflow-hidden">
                ${friendAvatars}
            </div>
            <div class="text-[10px] text-gray-400 mb-2">
                ${friends.length} friends from this group are here.
            </div>
            <button 
                onclick="window.dispatchEvent(new CustomEvent('create-group-chat', { detail: '${node.id}' }))"
                class="w-full bg-signal hover:bg-blue-600 text-white text-xs font-black py-2 rounded-xl transition-all shadow-lg active:scale-95"
            >
                Open Group Chat
            </button>
         </div>
      `;
  } else if (node.type === 'EVENT') {
     const date = new Date(node.data.startTime);
     const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
     
     return `
        <div class="text-sm font-sans min-w-[160px]">
            <div class="text-[10px] text-red-400 font-bold uppercase mb-1 tracking-wide">Upcoming Event</div>
            <div class="font-bold mb-1 text-white text-base">${node.data.name}</div>
            <div class="text-xs text-gray-300 mb-3 flex flex-col gap-0.5">
               <span>${timeStr} • ${node.data.locationName}</span>
               <span class="text-gray-500">${node.data.attendeeCount} attending</span>
            </div>
            <button 
                onclick="window.dispatchEvent(new CustomEvent('view-event', { detail: '${node.eventId}' }))"
                class="w-full bg-white text-black hover:bg-gray-200 text-xs font-bold py-2 rounded-lg transition-colors shadow-md"
            >
                View Event Details
            </button>
        </div>
     `;
  } else if (node.type === 'FRIEND') {
      const friendId = node.id.replace('node-', '');
      const spotLabel = node.data.spotName 
        ? `<div class="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-bold inline-block mb-2">At ${node.data.spotName}</div>`
        : '';
        
      const signalText = node.data.signal 
        ? `<div class="bg-pink-500/10 border border-pink-500/20 text-pink-400 px-2 py-1.5 rounded-lg text-[10px] font-bold mb-2 flex items-center gap-1.5"><span class="text-base leading-none">${node.data.signal.emoji}</span> "${node.data.signal.text}"</div>`
        : '';

      return `
        <div class="text-sm font-sans min-w-[150px]">
            <div class="font-bold mb-1 text-white text-base">${node.data.name}</div>
            ${signalText}
            ${spotLabel}
            <div class="mb-3 text-[10px] font-bold uppercase tracking-wider ${node.data.status === 'ONLINE' ? 'text-mint' : 'text-gray-500'}">${node.data.status || 'OFFLINE'}</div>
            <button 
                onclick="window.dispatchEvent(new CustomEvent('start-dm', { detail: '${friendId}' }))"
                class="w-full bg-signal hover:bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded-md transition-colors shadow-md flex items-center justify-center gap-1.5"
            >
                Message
            </button>
        </div>
      `;
  } else {
      // GATHERING
      const isGroupChat = node.data.communityName === "Group Chat";
      const isPrivate = !!node.privateGroupId;
      const activeColor = isPrivate ? RED_COLOR : (isGroupChat ? BLUE_COLOR : MINT_COLOR);
      const subLabel = isGroupChat ? 'Friend Group' : (isPrivate ? 'Private Spot' : 'Community Spot');
      
      // Render facepile of members if available
      let memberPreview = '';
      if (node.data.members && node.data.members.length > 0) {
          const members = node.data.members as User[];
          const avatars = members.slice(0, 5).map(m => 
              `<img src="${m.avatarUrl}" class="w-5 h-5 rounded-full border border-[#0F1115]" title="${m.displayName}" />`
          ).join('');
          memberPreview = `
            <div class="flex -space-x-1.5 mb-2 overflow-hidden items-center">
                ${avatars}
                ${members.length > 5 ? `<div class="w-5 h-5 rounded-full bg-[#333] border border-[#0F1115] text-[8px] flex items-center justify-center text-white">+${members.length - 5}</div>` : ''}
            </div>
          `;
      }

      return `
        <div class="text-sm font-sans">
          <div class="font-bold mb-1 text-white">
            <span>${node.data.name}</span>
            <span class="block text-[9px] text-gray-400 font-normal uppercase tracking-wide mt-0.5">${subLabel}</span>
          </div>
          ${memberPreview}
          <div class="text-xs text-gray-400 mb-3">${node.data.memberCount || 0} people here</div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('join-chat', { detail: '${node.chatId}' }))"
            class="w-full text-xs font-bold py-2 rounded-xl transition-all border shadow-lg active:scale-95"
            style="background-color: ${activeColor}33; color: ${activeColor}; border-color: ${activeColor}80;"
          >
            Join Chat
          </button>
        </div>
      `;
  }
};

export const getMeIcon = (signal?: { emoji: string, text: string }) => {
  let signalHtml = '';
  if (signal) {
      signalHtml = `
        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 z-50 animate-in zoom-in slide-in-from-bottom-2 duration-300">
            <span class="text-xl leading-none filter drop-shadow-sm">${signal.emoji}</span>
            <span class="text-[10px] font-bold text-white whitespace-nowrap max-w-[100px] truncate">${signal.text}</span>
        </div>
      `;
  }

  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        ${signalHtml}
        <div class="absolute w-12 h-12 ${signal ? 'bg-pink-500/20' : 'bg-signal/20'} rounded-full animate-ping"></div>
        <div class="w-8 h-8 rounded-full border-2 border-white ${signal ? 'bg-pink-500 shadow-pink-500/50' : 'bg-signal shadow-signal/80'} shadow-lg flex items-center justify-center text-white transition-colors duration-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `,
    className: 'bg-transparent',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// Haversine Distance in Meters
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}
