import React, { useState } from 'react';
import { X, Plus, ChevronRight, MapPin, Globe, Hash, Info, Image as ImageIcon, Check, ArrowLeft } from 'lucide-react';
import { CommunityType } from '../../../../types';

interface CreateCommunityModalProps {
  onClose: () => void;
  onSubmit?: (data: any) => void;
  onJoinViaLink?: (link: string) => void; // Added
}

type Step = 'SELECTION' | 'TYPE' | 'BASICS' | 'CHANNELS';

export const CreateCommunityModal: React.FC<CreateCommunityModalProps> = ({ onClose, onSubmit, onJoinViaLink }) => {
  const [step, setStep] = useState<Step>('SELECTION');
  const [inviteLinkInput, setInviteLinkInput] = useState(''); // Added
  
  // Form State
  const [type, setType] = useState<CommunityType>('LOCAL');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [city, setCity] = useState('Malmö');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['general', 'announcements']);

  const channelOptions = [
      { id: 'general', name: 'general', description: 'The hub for all conversation' },
      { id: 'announcements', name: 'announcements', description: 'Official updates only' },
      { id: 'events', name: 'events', description: 'Planning and coordination' },
      { id: 'music', name: 'music-sharing', description: 'Share what you are listening to' },
      { id: 'voice', name: 'Lounge (Voice)', description: 'Drop-in audio chat', type: 'voice' },
  ];

  const toggleChannel = (id: string) => {
      setSelectedChannels(prev => 
          prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
  };

  const handleCreateOwn = () => {
      setStep('TYPE');
  };

  const handleJoinByLink = () => {
      if (onJoinViaLink && inviteLinkInput.trim()) {
          onJoinViaLink(inviteLinkInput.trim());
      }
  };

  const handleFinalSubmit = () => {
      if (onSubmit) {
          const channels = channelOptions
              .filter(o => selectedChannels.includes(o.id))
              .map(o => ({
                  id: `ch-${Date.now()}-${o.id}`,
                  name: o.name,
                  type: o.type || 'text',
                  category: o.type === 'voice' ? 'Voice' : 'Main'
              }));

          onSubmit({
              name,
              description,
              type,
              city,
              iconUrl: iconUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
              channels
          });
      }
      onClose();
  };

  const StepHeader = ({ title, sub }: { title: string; sub?: string }) => (
      <div className="p-6 border-b border-white/5 relative">
           <button 
                onClick={() => {
                    if (step === 'TYPE') setStep('SELECTION');
                    else if (step === 'BASICS') setStep('TYPE');
                    else if (step === 'CHANNELS') setStep('BASICS');
                }}
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-white transition-colors ${step === 'SELECTION' ? 'hidden' : ''}`}
           >
                <ArrowLeft size={20} />
           </button>
           <div className="text-center">
                <h2 className="text-xl font-bold text-white">{title}</h2>
                {sub && <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">{sub}</p>}
           </div>
           <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors">
               <X size={24}/>
           </button>
      </div>
  );

  return (
      <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200 p-6">
          <div className="w-full max-w-lg bg-void border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
               
               {/* STEP 0: SELECTION */}
               {step === 'SELECTION' && (
                   <div className="animate-in slide-in-from-bottom-4 duration-300">
                       <StepHeader title="Add a Community" />
                       <div className="p-8 space-y-6">
                           <button 
                                onClick={handleCreateOwn}
                                className="w-full p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-all flex items-center justify-between group text-left bg-gradient-to-br from-white/5 to-transparent"
                           >
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-signal/20 flex items-center justify-center text-signal group-hover:scale-110 transition-transform">
                                        <Plus size={28} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-lg tracking-tight">Create My Own</h3>
                                        <p className="text-gray-400 text-sm">Clubs, crews, or local neighborhoods</p>
                                    </div>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                           </button>

                           <div className="relative py-4 flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-white/5"></div>
                                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">OR</span>
                                <div className="h-[1px] flex-1 bg-white/5"></div>
                           </div>

                           <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider text-center">Have an invite link?</h3>
                                <div className="flex flex-col gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="https://us.app/join/..."
                                        value={inviteLinkInput}
                                        onChange={(e) => setInviteLinkInput(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-signal/50 text-center font-mono text-sm"
                                    />
                                    <button 
                                        onClick={handleJoinByLink}
                                        disabled={!inviteLinkInput.trim()}
                                        className={`w-full py-4 rounded-xl font-black text-sm transition-all shadow-xl active:scale-[0.98] ${inviteLinkInput.trim() ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                                    >
                                        Join Community
                                    </button>
                                </div>
                           </div>
                       </div>
                   </div>
               )}

               {/* STEP 1: TYPE SELECTION */}
               {step === 'TYPE' && (
                   <div className="animate-in slide-in-from-right-4 duration-300">
                        <StepHeader title="Choose Type" sub="Step 1 of 3" />
                        <div className="p-8 space-y-4">
                            <button 
                                onClick={() => { setType('LOCAL'); setStep('BASICS'); }}
                                className="w-full p-5 border border-white/10 rounded-2xl hover:bg-white/5 transition-all flex items-center gap-5 group text-left"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-mint/20 flex items-center justify-center text-mint">
                                    <MapPin size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg">Local Community</h3>
                                    <p className="text-gray-400 text-sm">For neighborhoods, cities, or physical spots.</p>
                                </div>
                                <ChevronRight className="text-gray-700 group-hover:text-white" />
                            </button>

                            <button 
                                onClick={() => { setType('TOPIC'); setStep('BASICS'); }}
                                className="w-full p-5 border border-white/10 rounded-2xl hover:bg-white/5 transition-all flex items-center gap-5 group text-left"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    <Globe size={28} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg">Culture</h3>
                                    <p className="text-gray-400 text-sm">Find your local community through its culture.</p>
                                </div>
                                <ChevronRight className="text-gray-700 group-hover:text-white" />
                            </button>
                        </div>
                   </div>
               )}

               {/* STEP 2: BASICS */}
               {step === 'BASICS' && (
                   <div className="animate-in slide-in-from-right-4 duration-300 overflow-y-auto">
                        <StepHeader title="The Basics" sub="Step 2 of 3" />
                        <div className="p-8 space-y-6">
                            <div className="flex justify-center mb-4">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center hover:border-signal/50 hover:bg-signal/5 transition-all">
                                        {iconUrl ? (
                                            <img src={iconUrl} className="w-full h-full object-cover rounded-2xl" alt="Preview" />
                                        ) : (
                                            <ImageIcon className="text-gray-600" size={32} />
                                        )}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-signal text-white p-1.5 rounded-lg shadow-lg">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Community Name</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Möllevången Chess Club"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-signal font-bold"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Description</label>
                                    <textarea 
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Tell people what this is about..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-signal h-24 resize-none text-sm"
                                    />
                                </div>
                                {type === 'LOCAL' && (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5"><MapPin size={10} /> Base City</label>
                                        <input 
                                            type="text" 
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-signal text-sm"
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Icon URL (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={iconUrl}
                                        onChange={(e) => setIconUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-signal font-mono text-xs"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep('CHANNELS')}
                                disabled={!name.trim()}
                                className={`w-full py-4 rounded-xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${name.trim() ? 'bg-signal text-white hover:bg-blue-600' : 'bg-white/5 text-gray-500 cursor-not-allowed'}`}
                            >
                                Next: Set Up Channels <ChevronRight size={18} />
                            </button>
                        </div>
                   </div>
               )}

               {/* STEP 3: CHANNELS */}
               {step === 'CHANNELS' && (
                   <div className="animate-in slide-in-from-right-4 duration-300">
                        <StepHeader title="Starter Channels" sub="Step 3 of 3" />
                        <div className="p-8 space-y-6">
                            <p className="text-sm text-gray-400 text-center mb-6">Select a few channels to get your community started. You can always add more later.</p>
                            
                            <div className="space-y-2">
                                {channelOptions.map(opt => (
                                    <button 
                                        key={opt.id}
                                        onClick={() => toggleChannel(opt.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedChannels.includes(opt.id) ? 'bg-signal/10 border-signal' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${selectedChannels.includes(opt.id) ? 'bg-signal text-white' : 'bg-white/5 text-gray-500'}`}>
                                                {opt.type === 'voice' ? <Plus size={16} /> : <Hash size={16} />}
                                            </div>
                                            <div className="text-left">
                                                <div className={`text-sm font-bold ${selectedChannels.includes(opt.id) ? 'text-white' : 'text-gray-300'}`}>{opt.name}</div>
                                                <div className="text-[10px] text-gray-500">{opt.description}</div>
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedChannels.includes(opt.id) ? 'bg-signal border-signal text-white' : 'border-white/10 text-transparent'}`}>
                                            <Check size={12} />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleFinalSubmit}
                                className="w-full py-4 bg-mint text-black hover:bg-emerald-400 rounded-xl font-black text-sm transition-all shadow-xl shadow-mint/10 flex items-center justify-center gap-2 mt-8"
                            >
                                <Check size={20} /> Finish & Create Community
                            </button>
                        </div>
                   </div>
               )}

               {/* Footer Progress (for multi-step) */}
               {step !== 'SELECTION' && (
                   <div className="px-8 pb-6 flex justify-center gap-1.5 shrink-0">
                       <div className={`h-1 rounded-full transition-all duration-300 ${step === 'TYPE' ? 'w-8 bg-signal' : 'w-2 bg-white/10'}`} />
                       <div className={`h-1 rounded-full transition-all duration-300 ${step === 'BASICS' ? 'w-8 bg-signal' : 'w-2 bg-white/10'}`} />
                       <div className={`h-1 rounded-full transition-all duration-300 ${step === 'CHANNELS' ? 'w-8 bg-signal' : 'w-2 bg-white/10'}`} />
                   </div>
               )}
          </div>
      </div>
  );
};