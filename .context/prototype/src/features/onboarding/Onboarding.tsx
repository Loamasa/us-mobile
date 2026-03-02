import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ArrowRight, Ticket, Heart, Globe, Lock, Users, Calendar, Map as MapIcon, Music, Gamepad, Camera, Ghost } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

enum Step {
  INTRO_CONNECTION, // Anti-Ad
  INTRO_COMMUNITY,  // Local Communities
  INTRO_EVENTS,     // Find Events
  INTRO_MAP,        // Map Feature
  INTRO_TRUST,      // Open Source/Nonprofit
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>(Step.INTRO_CONNECTION);

  // --- REUSABLE COMPONENTS ---

  const OnboardingLayout = ({ 
    children, 
    onNext, 
    nextLabel = "Next", 
    showDots = true, 
    currentDot = 0,
    totalDots = 5,
    backgroundAccent = "signal" // 'signal' | 'mint' | 'rose' | 'orange' | 'purple'
  }: any) => (
    <div className="h-full flex flex-col relative bg-void overflow-hidden text-fog font-sans">
        {/* Ambient Background */}
        <div className={`absolute top-[-20%] right-[-20%] w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000
            ${backgroundAccent === 'signal' ? 'bg-signal' : 
              backgroundAccent === 'mint' ? 'bg-mint' : 
              backgroundAccent === 'rose' ? 'bg-rose-500' :
              backgroundAccent === 'orange' ? 'bg-orange-500' : 'bg-purple-500'}
        `} />
        
        <div className="flex-1 flex flex-col px-6 pt-12 pb-6 z-10">
            {/* Header / Logo */}
            <div className="flex justify-center mb-6">
                <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-md shadow-lg">
                     <span className="font-mono font-black text-xl text-white">us</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center items-center text-center animate-in slide-in-from-bottom-4 fade-in duration-500">
                {children}
            </div>

            {/* Navigation */}
            <div className="mt-8">
                {showDots && (
                    <div className="flex justify-center gap-2 mb-6">
                        {Array.from({ length: totalDots }).map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentDot ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`} />
                        ))}
                    </div>
                )}
                
                <button 
                    onClick={onNext}
                    className={`
                        w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg text-white
                        ${backgroundAccent === 'signal' ? 'bg-signal hover:bg-blue-600 shadow-signal/20' : 
                          backgroundAccent === 'mint' ? 'bg-mint text-black hover:bg-emerald-400 shadow-mint/20' : 
                          backgroundAccent === 'rose' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20' :
                          backgroundAccent === 'orange' ? 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20' :
                          backgroundAccent === 'purple' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20' :
                          'bg-white text-black hover:bg-gray-200'}
                    `}
                >
                    {nextLabel} {nextLabel === 'Next' && <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    </div>
  );

  // --- SLIDE 1: CONNECTION (The Anti-Ad) ---
  if (step === Step.INTRO_CONNECTION) {
    return (
      <OnboardingLayout 
        onNext={() => setStep(Step.INTRO_COMMUNITY)} 
        currentDot={0}
        backgroundAccent="rose"
      >
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
            {/* Background Chaos (Ads) */}
            <div className="absolute inset-0 grid grid-cols-2 gap-2 opacity-20 scale-90 blur-sm">
                <div className="bg-white/10 rounded-lg animate-pulse"></div>
                <div className="bg-white/10 rounded-lg"></div>
                <div className="bg-white/10 rounded-lg"></div>
                <div className="bg-white/10 rounded-lg animate-pulse delay-75"></div>
            </div>
            
            {/* Central Hero */}
            <div className="relative z-10 flex flex-col items-center">
                 <div className="w-24 h-24 rounded-full bg-rose-500 flex items-center justify-center shadow-[0_0_50px_rgba(244,63,94,0.4)] mb-4">
                    <Heart size={40} className="text-white fill-white" />
                 </div>
                 
                 <div className="absolute top-0 right-0 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-full transform rotate-12 shadow-xl border border-white">
                    NO ADS
                 </div>
                 <div className="absolute bottom-0 left-0 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-full transform -rotate-12 shadow-xl border border-white">
                    NO BOTS
                 </div>
            </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            Connect with People.<br/>
            <span className="text-rose-500">Not Ads.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-sm leading-relaxed">
            We built a place for your real friends, and your local communities, not for algorithms selling your attention.
        </p>
      </OnboardingLayout>
    );
  }

  // --- SLIDE 2: COMMUNITY (Build Local) ---
  if (step === Step.INTRO_COMMUNITY) {
    return (
      <OnboardingLayout 
        onNext={() => setStep(Step.INTRO_EVENTS)} 
        currentDot={1}
        backgroundAccent="purple"
      >
        <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
             {/* Interconnected Nodes Visual */}
             <div className="absolute inset-0 flex items-center justify-center animate-[spin_60s_linear_infinite]">
                 {/* Satellites */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-500/50 backdrop-blur-md">
                     <Music size={20} className="text-purple-300" />
                 </div>
                 <div className="absolute bottom-10 right-0 w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center border border-pink-500/50 backdrop-blur-md">
                     <Camera size={20} className="text-pink-300" />
                 </div>
                 <div className="absolute bottom-10 left-0 w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/50 backdrop-blur-md">
                     <Gamepad size={20} className="text-blue-300" />
                 </div>
             </div>
             
             {/* Central Hub */}
             <div className="relative z-10 w-28 h-28 bg-purple-600 rounded-full flex flex-col items-center justify-center shadow-[0_0_60px_rgba(147,51,234,0.4)] border-4 border-white/10">
                 <Users size={40} className="text-white" />
                 <div className="absolute -bottom-6 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20">
                    Local Cultures
                 </div>
             </div>
             
             {/* Connection Lines (SVG) */}
             <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
                 <line x1="50%" y1="50%" x2="50%" y2="10%" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
                 <line x1="50%" y1="50%" x2="85%" y2="80%" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
                 <line x1="50%" y1="50%" x2="15%" y2="80%" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
             </svg>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            Find Your<br/>
            <span className="text-purple-500">Culture.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-sm leading-relaxed">
             Culture bridges the gap between your local community and global movements.
        </p>
      </OnboardingLayout>
    );
  }

  // --- SLIDE 3: EVENTS (Local Events) ---
  if (step === Step.INTRO_EVENTS) {
    return (
      <OnboardingLayout 
        onNext={() => setStep(Step.INTRO_MAP)} 
        currentDot={2}
        backgroundAccent="orange"
      >
         <div className="relative w-72 h-64 mb-10 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl flex items-center justify-center group rotate-3 hover:rotate-0 transition-transform duration-500">
             {/* Fake Map Grid */}
             <div className="absolute inset-0 opacity-20" 
                  style={{ 
                      backgroundImage: 'linear-gradient(#F97316 1px, transparent 1px), linear-gradient(90deg, #F97316 1px, transparent 1px)', 
                      backgroundSize: '20px 20px',
                  }}>
             </div>
             
             {/* The "Event" Marker */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                 <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_30px_#F97316] z-10">
                    <Calendar size={32} className="text-white" />
                 </div>
             </div>

             {/* Overlay Card */}
             <div className="absolute bottom-4 left-4 right-4 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center justify-between">
                 <div className="text-left">
                     <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Tonight • 8 PM</div>
                     <div className="text-sm font-bold text-white">Rooftop Gathering</div>
                 </div>
                 <div className="bg-orange-500 px-3 py-1 rounded-lg text-xs font-bold text-white">RSVP</div>
             </div>
         </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            Events From<br/>
            <span className="text-orange-500">Your Community.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-sm leading-relaxed">
            Stop searching. Find events hosted by the local groups you actually care about. Tonight, tomorrow, whenever.
        </p>
      </OnboardingLayout>
    );
  }

  // --- SLIDE 4: MAP (See Friends IRL) ---
  if (step === Step.INTRO_MAP) {
    return (
      <OnboardingLayout 
        onNext={() => setStep(Step.INTRO_TRUST)} 
        currentDot={3}
        backgroundAccent="signal"
      >
        <div className="relative w-72 h-72 mb-8 flex items-center justify-center">
            {/* Radar Scan Effect */}
            <div className="absolute inset-0 rounded-full border border-signal/20"></div>
            <div className="absolute inset-4 rounded-full border border-signal/10"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-signal/0 via-signal/5 to-signal/20 animate-spin"></div>
            
            {/* Map Pins */}
            <div className="absolute top-1/3 left-1/3 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse"></div>
            <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-mint rounded-full shadow-[0_0_10px_#00E096]"></div>
            <div className="absolute top-1/4 right-1/3 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_#F97316]"></div>
            
            {/* Center User */}
            <div className="relative z-10 w-20 h-20 bg-signal rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(46,92,255,0.6)] border-4 border-void">
                <MapIcon size={32} className="text-white" />
            </div>
            
            {/* Floating Label */}
            <div className="absolute -bottom-4 bg-void border border-signal/50 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                 <span className="text-xs font-bold text-white">LIVE MAP</span>
            </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            Your World.<br/>
            <span className="text-signal">Your Map.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-sm leading-relaxed">
            You decide which places belong on your map. See your friends and the pulse of your local community. Not local ads competing for your attention.
        </p>
      </OnboardingLayout>
    );
  }

  // --- SLIDE 5: TRUST (Control) ---
  if (step === Step.INTRO_TRUST) {
    return (
      <OnboardingLayout 
        onNext={onComplete} 
        currentDot={4}
        backgroundAccent="mint"
        nextLabel="Enter the Void"
      >
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
            {/* Ghost Mode Symbolism - Dotted Lines */}
            <div className="absolute inset-0 border-4 border-dotted border-mint/50 rounded-full animate-[spin_60s_linear_infinite]"></div>
            
            {/* Only the Ghost */}
            <div className="relative z-10 flex items-center justify-center">
                 <Ghost size={100} className="text-mint drop-shadow-[0_0_30px_rgba(0,224,150,0.5)]" strokeWidth={1} />
            </div>
        </div>

        <h1 className="text-4xl font-black text-white mb-4 tracking-tight leading-tight">
            You Are<br/>
            <span className="text-mint">In Control.</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-sm leading-relaxed">
            We are a nonprofit. No shareholders. No AI mining your life. You control your data. You decide who sees what.
        </p>
      </OnboardingLayout>
    );
  }

  return null;
};