import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, MapPin, Image as ImageIcon, Repeat, Shield, Globe, Lock, Link as LinkIcon, ChevronDown, Check, Users } from 'lucide-react';
import { CommunitySpot, Event, RecurrenceFrequency, EventVisibility, Community } from '../../../../types';

interface CreateEventModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
  spots?: CommunitySpot[];
  initialData?: Event;
  selectableCommunities?: Community[]; // New prop for global context
}

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
    'NONE': "Don't repeat",
    'DAILY': "Every day",
    'WEEKLY': "Every week",
    'MONTHLY': "Every month"
};

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSubmit, spots = [], initialData, selectableCommunities }) => {
  // Parse initial data dates if available
  const initialDate = initialData ? new Date(initialData.startTime).toISOString().split('T')[0] : '';
  const initialTime = initialData ? new Date(initialData.startTime).toTimeString().slice(0,5) : '';
  const initialSpotId = initialData?.spotId || '';
  const initialLocationType = initialSpotId ? 'SPOT' : 'CUSTOM';

  // Community Selection State (For Global Context)
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>(initialData?.communityId || (selectableCommunities?.[0]?.id || ''));
  const [showCommunityDropdown, setShowCommunityDropdown] = useState(false);
  const communityRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initialData?.name || '');
  const [desc, setDesc] = useState(initialData?.description || '');
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl || '');
  const [locationType, setLocationType] = useState<'CUSTOM' | 'SPOT'>(initialLocationType);
  const [customLoc, setCustomLoc] = useState(initialData?.locationName || '');
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpotId);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  // Recurrence State
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(initialData?.recurrence?.frequency || 'NONE');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData?.recurrence?.endDate ? new Date(initialData.recurrence.endDate).toISOString().split('T')[0] : '');

  // Privacy State
  const [visibility, setVisibility] = useState<EventVisibility>(initialData?.visibility || EventVisibility.PUBLIC);

  // Custom Dropdown states
  const [showFreqDropdown, setShowFreqDropdown] = useState(false);
  const [showSpotDropdown, setShowSpotDropdown] = useState(false);
  const freqRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);

  // Computed Spots based on selected community
  const activeSpots = useMemo(() => {
      if (selectableCommunities && selectableCommunities.length > 0) {
          const com = selectableCommunities.find(c => c.id === selectedCommunityId);
          return com?.spots || [];
      }
      return spots;
  }, [selectableCommunities, selectedCommunityId, spots]);

  // Reset selected spot if community changes
  useEffect(() => {
      if (selectableCommunities && !activeSpots.find(s => s.id === selectedSpotId)) {
          setSelectedSpotId('');
          if (activeSpots.length === 0) setLocationType('CUSTOM');
      }
  }, [selectedCommunityId, activeSpots]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (freqRef.current && !freqRef.current.contains(event.target as Node)) setShowFreqDropdown(false);
        if (spotRef.current && !spotRef.current.contains(event.target as Node)) setShowSpotDropdown(false);
        if (communityRef.current && !communityRef.current.contains(event.target as Node)) setShowCommunityDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // If initial data has spot name but no ID (legacy/mismatch), default to custom with that name
  useEffect(() => {
      if (initialData && !initialData.spotId) {
          setCustomLoc(initialData.locationName);
      }
  }, [initialData]);

  const handleSubmit = () => {
    let finalLocationName = customLoc;
    let geoLocation = initialData?.geoLocation || { lat: 55.60, lng: 13.00 }; // Default Mock or keep existing
    let spotId = undefined;

    if (locationType === 'SPOT' && selectedSpotId) {
        const spot = activeSpots.find(s => s.id === selectedSpotId);
        if (spot) {
            finalLocationName = spot.name;
            geoLocation = spot.location;
            spotId = spot.id;
        }
    }

    const recurrence = frequency !== 'NONE' ? {
        frequency,
        endDate: recurrenceEndDate ? new Date(recurrenceEndDate).toISOString() : undefined
    } : undefined;

    if (name && finalLocationName && date && time) {
        onSubmit({
            name,
            description: desc || 'No description provided.',
            coverImageUrl: coverImageUrl || undefined,
            startTime: `${date}T${time}`,
            locationName: finalLocationName,
            geoLocation,
            spotId,
            recurrence,
            visibility,
            communityId: selectedCommunityId // Ensure community ID is passed
        });
    }
  };

  const selectedCommunity = selectableCommunities?.find(c => c.id === selectedCommunityId);

  return (
      <div className="absolute inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 max-h-full overflow-y-auto no-scrollbar">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-white tracking-tight">{initialData ? 'Edit Event' : 'New Event'}</h2>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><X size={24}/></button>
              </div>
              
              <div className="space-y-6">
                  {/* Community Selector (Only if selectableCommunities is provided) */}
                  {selectableCommunities && selectableCommunities.length > 0 && (
                      <div className="relative" ref={communityRef}>
                          <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                              <Users size={12} className="text-signal" /> Host Community
                          </label>
                          <button 
                              onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
                              className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-sm font-bold"
                          >
                              <div className="flex items-center gap-3">
                                  {selectedCommunity ? (
                                      <>
                                          <img src={selectedCommunity.iconUrl} className="w-6 h-6 rounded-md object-cover" alt="" />
                                          {selectedCommunity.name}
                                      </>
                                  ) : "Select Community"}
                              </div>
                              <ChevronDown size={16} className={`text-gray-500 transition-transform ${showCommunityDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {showCommunityDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto custom-scrollbar">
                                  {selectableCommunities.map(c => (
                                      <button 
                                          key={c.id}
                                          onClick={() => { setSelectedCommunityId(c.id); setShowCommunityDropdown(false); }}
                                          className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between group"
                                      >
                                          <div className="flex items-center gap-3">
                                              <img src={c.iconUrl} className="w-8 h-8 rounded-lg object-cover border border-white/5" alt="" />
                                              <span className={selectedCommunityId === c.id ? 'text-signal font-bold' : 'text-gray-300 group-hover:text-white'}>{c.name}</span>
                                          </div>
                                          {selectedCommunityId === c.id && <Check size={14} className="text-signal" />}
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}

                  <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Event Topic</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-signal/50 text-base font-bold transition-all" 
                        placeholder="Give it a name" 
                        autoFocus={!selectableCommunities}
                      />
                  </div>
                  <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Description</label>
                      <textarea 
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-signal/50 h-24 resize-none text-sm transition-all" 
                        placeholder="What's happening?" 
                      />
                  </div>

                  <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <ImageIcon size={12} /> Cover Image URL
                      </label>
                      <input 
                        type="text" 
                        value={coverImageUrl}
                        onChange={(e) => setCoverImageUrl(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-signal/50 text-xs font-mono transition-all" 
                        placeholder="https://images.unsplash.com/..." 
                      />
                      {coverImageUrl && (
                        <div className="mt-3 h-24 w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={coverImageUrl} className="w-full h-full object-cover" alt="Preview" />
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Date</label>
                         <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none text-sm font-bold transition-all" />
                      </div>
                      <div>
                         <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">Time</label>
                         <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none text-sm font-bold transition-all" />
                      </div>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <Shield size={12} className="text-signal" /> Privacy
                      </label>
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                          <button 
                            type="button"
                            onClick={() => setVisibility(EventVisibility.PUBLIC)}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex flex-col items-center gap-1 ${visibility === EventVisibility.PUBLIC ? 'bg-signal text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                              <Globe size={12} />
                              <span>Public</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setVisibility(EventVisibility.COMMUNITY_ONLY)}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex flex-col items-center gap-1 ${visibility === EventVisibility.COMMUNITY_ONLY ? 'bg-signal text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                              <Lock size={12} />
                              <span>Members</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => setVisibility(EventVisibility.INVITE_ONLY)}
                            className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all flex flex-col items-center gap-1 ${visibility === EventVisibility.INVITE_ONLY ? 'bg-signal text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                              <LinkIcon size={12} />
                              <span>Link Only</span>
                          </button>
                      </div>
                  </div>

                  {/* Recurrence Settings - Custom Dropdown */}
                  <div className="pt-2">
                      <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block flex items-center gap-2">
                        <Repeat size={12} className="text-signal" /> Repeat Event
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="relative" ref={freqRef}>
                              <button 
                                onClick={() => setShowFreqDropdown(!showFreqDropdown)}
                                className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-sm font-bold"
                              >
                                  {FREQUENCY_LABELS[frequency]}
                                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${showFreqDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              
                              {showFreqDropdown && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
                                          <button 
                                            key={val}
                                            onClick={() => { setFrequency(val as RecurrenceFrequency); setShowFreqDropdown(false); }}
                                            className="w-full px-4 py-3 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
                                          >
                                              <span className={frequency === val ? 'text-signal font-bold' : 'text-gray-300'}>{label}</span>
                                              {frequency === val && <Check size={14} className="text-signal" />}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                          
                          {frequency !== 'NONE' && (
                              <div className="animate-in fade-in slide-in-from-left-2">
                                  <input 
                                    type="date" 
                                    value={recurrenceEndDate} 
                                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-signal/50 text-sm font-bold"
                                    title="Repeat until"
                                  />
                                  <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest block mt-1.5 ml-1">Repeat until (optional)</span>
                              </div>
                          )}
                      </div>
                  </div>
                   
                  {/* Location Selector - Custom Dropdown */}
                  <div className="pt-2">
                      <div className="flex justify-between items-end mb-2">
                        <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">Location</label>
                        {activeSpots.length > 0 && (
                            <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                                <button 
                                    onClick={() => setLocationType('CUSTOM')}
                                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${locationType === 'CUSTOM' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    CUSTOM
                                </button>
                                <button 
                                    onClick={() => setLocationType('SPOT')}
                                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${locationType === 'SPOT' ? 'bg-mint text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    SPOT
                                </button>
                            </div>
                        )}
                      </div>

                      {locationType === 'CUSTOM' ? (
                          <input 
                            type="text" 
                            value={customLoc}
                            onChange={(e) => setCustomLoc(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none focus:border-signal/50 text-sm font-bold transition-all" 
                            placeholder="Address or place name" 
                          />
                      ) : (
                          <div className="relative" ref={spotRef}>
                               <button 
                                  onClick={() => setShowSpotDropdown(!showSpotDropdown)}
                                  className={`w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all text-sm font-bold ${!selectedSpotId ? 'text-gray-500' : 'text-white'}`}
                               >
                                  <div className="flex items-center gap-3">
                                      <MapPin size={18} className={selectedSpotId ? 'text-mint' : 'text-gray-500'} />
                                      {selectedSpotId ? activeSpots.find(s => s.id === selectedSpotId)?.name : 'Select a Community Spot'}
                                  </div>
                                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${showSpotDropdown ? 'rotate-180' : ''}`} />
                               </button>

                               {showSpotDropdown && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1D21] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto no-scrollbar">
                                      {activeSpots.length === 0 ? (
                                          <div className="p-6 text-center text-gray-500 text-xs">No spots defined for this community.</div>
                                      ) : (
                                          activeSpots.map(spot => (
                                              <button 
                                                key={spot.id}
                                                onClick={() => { setSelectedSpotId(spot.id); setShowSpotDropdown(false); }}
                                                className="w-full px-4 py-4 text-left text-sm hover:bg-white/5 transition-colors flex items-center justify-between border-b border-white/5 last:border-0"
                                              >
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-lg bg-mint/10 flex items-center justify-center text-mint border border-mint/20">
                                                          <MapPin size={16} />
                                                      </div>
                                                      <div>
                                                          <span className={selectedSpotId === spot.id ? 'text-mint font-bold' : 'text-gray-200'}>{spot.name}</span>
                                                          <div className="text-[10px] text-gray-500 uppercase tracking-widest">{spot.type} AREA</div>
                                                      </div>
                                                  </div>
                                                  {selectedSpotId === spot.id && <Check size={14} className="text-mint" />}
                                              </button>
                                          ))
                                      )}
                                  </div>
                               )}
                          </div>
                      )}
                  </div>
              </div>

              <div className="mt-10">
                <button 
                    onClick={handleSubmit}
                    disabled={!name || !date || (locationType === 'CUSTOM' ? !customLoc : !selectedSpotId) || (!selectedCommunityId && !initialData?.communityId)}
                    className={`px-6 py-4 rounded-2xl font-black text-base transition-all w-full shadow-2xl active:scale-[0.98] ${(!name || !date || (locationType === 'CUSTOM' ? !customLoc : !selectedSpotId) || (!selectedCommunityId && !initialData?.communityId)) ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 'bg-signal text-white hover:bg-blue-600 shadow-signal/20'}`}
                >
                    {initialData ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
          </div>
      </div>
  );
};