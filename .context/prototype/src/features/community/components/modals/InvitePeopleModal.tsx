
import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Check, Clock, Users, RefreshCw, Share2, Link as LinkIcon, ChevronDown } from 'lucide-react';
import { Community } from '../../../../types';
import { useData } from '../../../../context/DataContext';

interface InvitePeopleModalProps {
  community: Community;
  onClose: () => void;
}

const EXPIRATION_OPTIONS = [
    { label: '30 minutes', value: '30m' },
    { label: '1 hour', value: '1h' },
    { label: '6 hours', value: '6h' },
    { label: '12 hours', value: '12h' },
    { label: '1 day', value: '1d' },
    { label: '7 days', value: '7d' },
    { label: 'Never', value: 'never' },
];

const USAGE_OPTIONS = [
    { label: 'No limit', value: 'unlimited' },
    { label: '1 use', value: '1' },
    { label: '5 uses', value: '5' },
    { label: '10 uses', value: '10' },
    { label: '25 uses', value: '25' },
    { label: '50 uses', value: '50' },
    { label: '100 uses', value: '100' },
];

export const InvitePeopleModal: React.FC<InvitePeopleModalProps> = ({ community, onClose }) => {
  const { createInvite } = useData();
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [expiration, setExpiration] = useState('7d');
  const [maxUses, setMaxUses] = useState('unlimited');
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom Dropdown States
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [showUsageDropdown, setShowUsageDropdown] = useState(false);
  const expRef = useRef<HTMLDivElement>(null);
  const usageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (expRef.current && !expRef.current.contains(event.target as Node)) setShowExpDropdown(false);
        if (usageRef.current && !usageRef.current.contains(event.target as Node)) setShowUsageDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate initial link
  useEffect(() => {
      generateLink();
  }, []);

  const generateLink = () => {
      setIsGenerating(true);
      // Simulate API delay for better UX
      setTimeout(() => {
          const uses = maxUses === 'unlimited' ? 'unlimited' : parseInt(maxUses);
          const invite = createInvite(community.id, { 
              maxUses: uses, 
              expiresIn: expiration 
          });
          setInviteLink(`https://us.app/join/${invite.code}`);
          setIsGenerating(false);
          setCopied(false);
      }, 500);
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Join ${community.name} on us`,
                  text: `Hey, come join ${community.name}! Here is an invite link:`,
                  url: inviteLink,
              });
          } catch (err) {
              console.error('Error sharing:', err);
          }
      } else {
          handleCopy();
      }
  };

  // Re-generate when options change? 
  // No, user typically selects options then generates.
  // We'll keep manual regeneration or auto-generation on mount with defaults.

  return (
      <div className="absolute inset-0 z-[160] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                  <div>
                      <h2 className="text-2xl font-black text-white tracking-tight">Invite people</h2>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">to {community.name}</p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
                      <X size={24}/>
                  </button>
              </div>

              <div className="p-8 space-y-8">
                  {/* Link Display */}
                  <div>
                      <label className="text-[10px] font-black text-gray-500 uppercase mb-3 block tracking-widest">Share this unique invite link</label>
                      <div className="flex items-center gap-3">
                          <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-4 flex items-center gap-3 relative overflow-hidden group">
                              <LinkIcon size={18} className="text-gray-500" />
                              <input 
                                  type="text" 
                                  readOnly 
                                  value={inviteLink} 
                                  className="bg-transparent text-white text-sm w-full outline-none font-mono font-bold"
                              />
                              {isGenerating && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                      <RefreshCw size={20} className="animate-spin text-white" />
                                  </div>
                              )}
                          </div>
                          <button 
                              onClick={handleCopy}
                              className={`p-4 rounded-2xl transition-all shadow-xl ${copied ? 'bg-green-500 text-black' : 'bg-signal hover:bg-blue-600 text-white'}`}
                          >
                              {copied ? <Check size={24} /> : <Copy size={24} />}
                          </button>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-3 font-medium">
                          Your link expires in <span className="text-white font-bold">{EXPIRATION_OPTIONS.find(o => o.value === expiration)?.label}</span>.
                      </p>
                  </div>

                  {/* Settings */}
                  <div className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex items-center gap-2 text-gray-400 text-xs font-black uppercase tracking-widest mb-4">
                          <RefreshCw size={14} className="text-signal" /> Link Configuration
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div className="relative" ref={expRef}>
                              <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block flex items-center gap-1.5 tracking-widest">
                                  <Clock size={10} /> Expire After
                              </label>
                              <button 
                                onClick={() => setShowExpDropdown(!showExpDropdown)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white flex items-center justify-between hover:bg-white/10 transition-all font-bold"
                              >
                                  {EXPIRATION_OPTIONS.find(o => o.value === expiration)?.label}
                                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${showExpDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showExpDropdown && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      {EXPIRATION_OPTIONS.map(opt => (
                                          <button 
                                            key={opt.value}
                                            onClick={() => { setExpiration(opt.value); setShowExpDropdown(false); }}
                                            className="w-full px-4 py-3 text-left text-xs hover:bg-white/5 transition-colors flex items-center justify-between"
                                          >
                                              <span className={expiration === opt.value ? 'text-signal font-bold' : 'text-gray-300'}>{opt.label}</span>
                                              {expiration === opt.value && <Check size={12} className="text-signal" />}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                          <div className="relative" ref={usageRef}>
                              <label className="text-[10px] font-black text-gray-600 uppercase mb-2 block flex items-center gap-1.5 tracking-widest">
                                  <Users size={10} /> Max Uses
                              </label>
                              <button 
                                onClick={() => setShowUsageDropdown(!showUsageDropdown)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white flex items-center justify-between hover:bg-white/10 transition-all font-bold"
                              >
                                  {USAGE_OPTIONS.find(o => o.value === maxUses)?.label}
                                  <ChevronDown size={14} className={`text-gray-500 transition-transform ${showUsageDropdown ? 'rotate-180' : ''}`} />
                              </button>
                              {showUsageDropdown && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1D21] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      {USAGE_OPTIONS.map(opt => (
                                          <button 
                                            key={opt.value}
                                            onClick={() => { setMaxUses(opt.value); setShowUsageDropdown(false); }}
                                            className="w-full px-4 py-3 text-left text-xs hover:bg-white/5 transition-colors flex items-center justify-between"
                                          >
                                              <span className={maxUses === opt.value ? 'text-signal font-bold' : 'text-gray-300'}>{opt.label}</span>
                                              {maxUses === opt.value && <Check size={12} className="text-signal" />}
                                          </button>
                                      ))}
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <button 
                          onClick={generateLink}
                          className="text-[10px] text-signal hover:text-blue-400 font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors pt-2"
                      >
                          <RefreshCw size={12} /> Regenerate Link
                      </button>
                  </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/10 flex justify-between items-center">
                  <button 
                      onClick={handleShare}
                      className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/5 transition-all"
                  >
                      <Share2 size={16} /> Share Link
                  </button>
                  <button 
                      onClick={onClose}
                      className="text-sm font-black uppercase tracking-widest bg-white text-black px-6 py-2.5 rounded-xl hover:bg-gray-200 transition-all shadow-xl"
                  >
                      Done
                  </button>
              </div>
          </div>
      </div>
  );
};
