import React from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { Check, Shield, Zap, AlertTriangle, CreditCard, Star, UploadCloud, Smile } from 'lucide-react';
import { AllocationSelector } from './AllocationSelector';

export const SubscriptionSettings: React.FC = () => {
  const { tier, plan, status, nextBilling, cancel, upgrade } = useSubscription();

  const isFree = tier === 'FREE';
  const isPremium = tier === 'PREMIUM';

  // Mock usage data for display (in a real app, this would come from the backend)
  const usage = {
    maxUploadSize: Math.floor(plan.limits.maxUploadSizeBytes / (1024 * 1024)) // MB
  };

  const formatDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-bold text-white">Subscription & Billing</h1>
      
      {/* Current Plan Card */}
      <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Current Plan</div>
            <h2 className="text-4xl font-black text-white flex items-center gap-3">
              {plan.name}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-black tracking-wide border ${isFree ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : 'bg-signal/20 text-signal border-signal/30'}`}>
                {status}
              </span>
            </h2>
            <p className="text-gray-400 mt-4 max-w-md leading-relaxed">
              {isFree 
                ? "Basic access. Upgrade to unlock larger uploads, profile flair, and support the platform." 
                : `You are rocking the ${plan.name} plan. Your next billing date is ${formatDate(nextBilling)}.`
              }
            </p>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
             {isFree ? (
               <button 
                 onClick={() => window.dispatchEvent(new CustomEvent('open-upgrade-modal'))}
                 className="px-8 py-4 bg-gradient-to-r from-signal to-blue-600 hover:from-blue-600 hover:to-signal text-white rounded-2xl font-bold shadow-lg shadow-signal/20 transition-all flex items-center justify-center gap-2 transform active:scale-95"
               >
                 <Zap size={18} fill="currentColor" /> Upgrade Plan
               </button>
             ) : (
                <button 
                 onClick={() => { if(window.confirm("Are you sure you want to cancel?")) cancel(); }}
                 className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-red-400 hover:text-red-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
               >
                 Cancel Subscription
               </button>
             )}
          </div>
        </div>

        {/* Decorative Background */}
        <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/3 transition-colors duration-500 ${isFree ? 'bg-white/5' : 'bg-signal/10'}`}></div>
      </div>

      {/* Allocation Selector */}
      <AllocationSelector />

      {/* Feature Limits / Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2.5">
                  <UploadCloud size={20} className="text-purple-400" /> Upload Capacity
              </h3>
              <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-medium">Per File Limit</span>
                  <span className="text-white font-bold">{usage.maxUploadSize} MB</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full w-full opacity-20" />
              </div>
              <p className="text-xs text-gray-500 mt-4">
                  Higher tiers support larger file shares for photos and videos.
              </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2.5">
                  <Smile size={20} className="text-orange-400" /> Profile Customization
              </h3>
              <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                      <span className="text-gray-400 font-medium">Custom Badges</span>
                      <span className={plan.limits.customBadges ? "text-green-400 font-bold" : "text-gray-600"}>
                          {plan.limits.customBadges ? "Unlocked" : "Locked"}
                      </span>
                  </div>
                  <div className="flex justify-between text-sm">
                      <span className="text-gray-400 font-medium">Animated Avatars</span>
                      <span className={plan.limits.animatedAvatars ? "text-green-400 font-bold" : "text-gray-600"}>
                          {plan.limits.animatedAvatars ? "Unlocked" : "Locked"}
                      </span>
                  </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                  Express yourself with enhanced profile features.
              </p>
          </div>
      </div>

      {/* Payment Method Stub (Visible only if Premium) */}
      {!isFree && (
          <div className="border-t border-white/5 pt-8">
              <h3 className="text-lg font-bold text-white mb-4">Payment Method</h3>
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/5 rounded-xl text-gray-300">
                          <CreditCard size={24} />
                      </div>
                      <div>
                          <div className="text-sm font-bold text-white">•••• •••• •••• 4242</div>
                          <div className="text-xs text-gray-500">Expires 12/28</div>
                      </div>
                  </div>
                  <button className="px-4 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                      Update
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};