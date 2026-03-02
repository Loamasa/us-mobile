
import React, { useState } from 'react';
import { X, Heart, Check, Loader2, Shield, Zap } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useServerSupport } from '../hooks/useServerSupport';

interface ServerSupportModalProps {
  communityId: string;
  onClose: () => void;
}

export const ServerSupportModal: React.FC<ServerSupportModalProps> = ({ communityId, onClose }) => {
  const { communities } = useData();
  const { isSupporting, support, unsupport } = useServerSupport(communityId);
  const [isProcessing, setIsProcessing] = useState(false);

  const community = communities.find(c => c.id === communityId);

  if (!community) return null;

  const handleAction = () => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      if (isSupporting) {
        unsupport();
      } else {
        support();
      }
      setIsProcessing(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header Art */}
        <div className="h-32 bg-gradient-to-br from-pink-500/20 to-purple-500/10 relative">
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                <div className="relative">
                    <img 
                        src={community.iconUrl} 
                        className="w-20 h-20 rounded-2xl object-cover border-4 border-[#0F1115] shadow-xl" 
                        alt={community.name} 
                    />
                    <div className="absolute -bottom-2 -right-2 bg-pink-500 text-white p-1.5 rounded-full border-4 border-[#0F1115]">
                        <Heart size={14} fill="currentColor" />
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="pt-14 pb-8 px-8 text-center">
            <h2 className="text-2xl font-black text-white mb-1">Support {community.name}</h2>
            <p className="text-gray-400 text-sm mb-8">Help keep the lights on and the vibes flowing.</p>

            <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 bg-pink-500/20 text-pink-400 rounded-lg">
                        <Shield size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm">Supporter Badge</div>
                        <div className="text-xs text-gray-500">Stand out in the member list.</div>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-left p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        <Zap size={20} />
                    </div>
                    <div>
                        <div className="font-bold text-white text-sm">Priority Access</div>
                        <div className="text-xs text-gray-500">Early access to events and features.</div>
                    </div>
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-6">
                <div className="text-3xl font-black text-white mb-1">$2.99</div>
                <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Per Month</div>
            </div>

            <button
                onClick={handleAction}
                disabled={isProcessing}
                className={`
                    w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg
                    ${isSupporting 
                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5' 
                        : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-500/20'
                    }
                `}
            >
                {isProcessing ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : isSupporting ? (
                    "Cancel Support"
                ) : (
                    <>
                        <Heart size={18} fill="currentColor" /> Become a Supporter
                    </>
                )}
            </button>
            
            <p className="text-[10px] text-gray-600 mt-4">
                Secure payment processed by Stripe. Cancel anytime.
            </p>
        </div>
      </div>
    </div>
  );
};
