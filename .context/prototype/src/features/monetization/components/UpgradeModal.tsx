
import React, { useState } from 'react';
import { X, Check, Zap, Star, Shield, Loader2 } from 'lucide-react';
import { useMonetization } from '../../../context/MonetizationContext';
import { SubscriptionTier } from '../../../types';

interface UpgradeModalProps {
  onClose: () => void;
}

const TIERS: SubscriptionTier[] = ['FREE', 'BASIC', 'PREMIUM'];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose }) => {
  const { subscription, upgradeSubscription, getPlanDetails } = useMonetization();
  const [processingTier, setProcessingTier] = useState<SubscriptionTier | null>(null);

  const handleSelect = (tier: SubscriptionTier) => {
    if (tier === subscription.tier) return;
    
    setProcessingTier(tier);
    // Simulate API call / Checkout
    setTimeout(() => {
      upgradeSubscription(tier);
      setProcessingTier(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 md:p-8 flex justify-between items-center bg-white/[0.02] border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Zap className="text-signal fill-signal" size={28} /> 
              Level Up Your Experience
            </h2>
            <p className="text-gray-400 mt-1 text-sm md:text-base">Support independent development and unlock powerful features.</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map(tier => {
              const plan = getPlanDetails(tier);
              const isCurrent = subscription.tier === tier;
              const isProcessing = processingTier === tier;
              const isFree = tier === 'FREE';
              const isPremium = tier === 'PREMIUM';
              const isBasic = tier === 'BASIC';

              return (
                <div 
                  key={tier}
                  className={`
                    relative flex flex-col p-6 rounded-3xl border transition-all duration-300
                    ${isCurrent 
                        ? 'bg-white/5 border-white/10 opacity-70 scale-95' 
                        : isPremium 
                            ? 'bg-gradient-to-b from-signal/10 to-transparent border-signal/50 hover:border-signal hover:shadow-2xl hover:shadow-signal/20 scale-100 hover:scale-[1.02]' 
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                    }
                  `}
                >
                  {isPremium && (
                    <div className="absolute top-0 right-0 p-3">
                      <div className="bg-signal text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg shadow-signal/20">
                        Best Value
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`
                        w-12 h-12 rounded-2xl flex items-center justify-center mb-4
                        ${isFree ? 'bg-gray-800 text-gray-400' : ''}
                        ${isBasic ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${isPremium ? 'bg-signal text-white shadow-lg shadow-signal/40' : ''}
                    `}>
                        {isFree && <Shield size={24} />}
                        {isBasic && <Star size={24} />}
                        {isPremium && <Zap size={24} fill="currentColor" />}
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-wide">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">
                            ${plan.price}
                        </span>
                        <span className="text-gray-500 font-medium text-sm">/ month</span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 p-0.5 rounded-full ${isPremium ? 'bg-signal/20 text-signal' : 'bg-white/10 text-gray-400'}`}>
                            <Check size={10} strokeWidth={4} />
                        </div>
                        <span className="text-sm text-gray-300 leading-tight">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={isCurrent || processingTier !== null}
                    onClick={() => handleSelect(tier)}
                    className={`
                        w-full py-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                        ${isCurrent 
                            ? 'bg-white/5 text-gray-500 cursor-default' 
                            : isPremium 
                                ? 'bg-signal hover:bg-blue-600 text-white shadow-lg shadow-signal/20 hover:shadow-signal/40' 
                                : 'bg-white text-black hover:bg-gray-200'
                        }
                    `}
                  >
                    {isProcessing ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : isCurrent ? (
                        "Current Plan"
                    ) : (
                        tier === 'FREE' ? "Downgrade" : "Subscribe"
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-6 border-t border-white/5 bg-white/[0.02] text-center">
            <p className="text-xs text-gray-500">
                Payments are processed securely. You can cancel at any time from your settings.
                <br/>By subscribing, you agree to our Terms of Service.
            </p>
        </div>
      </div>
    </div>
  );
};
