
import React, { useState } from 'react';
import { GlassCard } from '../../components/ui/GlassCard';
import { ArrowRight, Smartphone, Zap, User, MapPin, Shield } from 'lucide-react';

interface AuthFlowProps {
  onComplete: () => void;
}

enum AuthStep {
  PHONE_AUTH,
  OTP_VERIFY,
  PROFILE,
  PERMISSIONS
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<AuthStep>(AuthStep.PHONE_AUTH);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');

  // Reusing the visual layout from onboarding for consistency
  const AuthLayout = ({ 
    children, 
    onNext, 
    nextLabel = "Next", 
    backgroundAccent = "signal"
  }: any) => (
    <div className="h-full flex flex-col relative bg-void overflow-hidden text-fog font-sans">
        {/* Ambient Background */}
        <div className={`absolute top-[-20%] right-[-20%] w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000
            ${backgroundAccent === 'signal' ? 'bg-signal' : 'bg-mint'}
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
                <button 
                    onClick={onNext}
                    className={`
                        w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg text-white
                        ${backgroundAccent === 'signal' ? 'bg-signal hover:bg-blue-600 shadow-signal/20' : 
                          'bg-white text-black hover:bg-gray-200'}
                    `}
                >
                    {nextLabel} {nextLabel === 'Next' && <ArrowRight size={20} />}
                </button>
            </div>
        </div>
    </div>
  );

  // --- STEP 1: PHONE INPUT ---
  if (step === AuthStep.PHONE_AUTH) {
    return (
      <AuthLayout 
        onNext={() => setStep(AuthStep.OTP_VERIFY)} 
        nextLabel="Send Code"
        backgroundAccent="signal"
      >
        <div className="w-full max-w-xs text-left">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Enter the<br/>Void.</h2>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-widest mb-8">No passwords. Just you.</p>
            
            <label className="text-xs font-bold text-signal uppercase tracking-widest mb-2 block">Mobile Number</label>
            <GlassCard className="flex items-center gap-3 p-4 bg-white/5 focus-within:bg-white/10 focus-within:border-signal/50 transition-colors">
            <Smartphone className="text-gray-500" size={20} />
            <input 
                type="tel" 
                placeholder="(555) 000-0000" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-transparent text-white placeholder-gray-600 flex-1 outline-none font-mono text-lg"
                autoFocus
            />
            </GlassCard>
        </div>
      </AuthLayout>
    );
  }

  // --- STEP 2: OTP VERIFY ---
  if (step === AuthStep.OTP_VERIFY) {
    return (
      <AuthLayout 
        onNext={() => {}} 
        nextLabel="Verifying..."
        backgroundAccent="signal"
      >
        <div className="w-full max-w-xs text-left">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Verify.</h2>
            <p className="text-gray-400 mb-8 text-sm font-mono">Signal sent to {phone}</p>
            
            <div className="flex gap-3 mb-8 justify-center relative">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`
                        w-16 h-20 rounded-xl flex items-center justify-center text-3xl font-mono transition-all
                        ${otp[i] ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-white'}
                        border
                    `}>
                        {otp[i] || ''}
                    </div>
                ))}
                <input 
                    className="absolute inset-0 opacity-0 cursor-text"
                    value={otp}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 4) {
                            setOtp(val);
                            if (val.length === 4) setTimeout(() => setStep(AuthStep.PROFILE), 500);
                        }
                    }}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                />
            </div>

            <button onClick={() => setStep(AuthStep.PHONE_AUTH)} className="w-full text-xs text-gray-500 hover:text-white text-center">
                Wrong number? Retarget.
            </button>
        </div>
      </AuthLayout>
    );
  }

  // --- STEP 3: PROFILE SETUP ---
  if (step === AuthStep.PROFILE) {
    return (
      <AuthLayout 
        onNext={() => setStep(AuthStep.PERMISSIONS)} 
        nextLabel="Initialize Profile"
        backgroundAccent="signal"
      >
        <div className="w-full max-w-xs text-left">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Identity.</h2>
            <p className="text-gray-400 mb-8 text-sm">Who are you in the dark?</p>
            
            <div className="flex justify-center mb-8">
                <div className="relative group cursor-pointer">
                    <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center hover:border-signal hover:bg-signal/10 transition-all">
                        <User className="text-gray-400 group-hover:text-signal" size={32} />
                    </div>
                    <div className="absolute bottom-0 right-0 bg-signal text-white p-1.5 rounded-full shadow-lg">
                        <Zap size={12} fill="currentColor" />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs text-signal font-bold uppercase tracking-widest">Display Name</label>
                    <GlassCard className="px-4 py-3 bg-white/5">
                        <input 
                            type="text" 
                            placeholder="Jane Doe" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-transparent text-white placeholder-gray-600 outline-none text-lg w-full"
                        />
                    </GlassCard>
                </div>
                <div className="space-y-2">
                    <label className="text-xs text-signal font-bold uppercase tracking-widest">Handle</label>
                    <GlassCard className="px-4 py-3 bg-white/5 flex items-center">
                        <span className="text-gray-500 mr-1 text-lg">@</span>
                        <input 
                            type="text" 
                            placeholder="jane" 
                            value={handle}
                            onChange={(e) => setHandle(e.target.value)}
                            className="bg-transparent text-white placeholder-gray-600 outline-none text-lg w-full"
                        />
                    </GlassCard>
                </div>
            </div>
        </div>
      </AuthLayout>
    );
  }

  // --- STEP 4: PERMISSIONS ---
  if (step === AuthStep.PERMISSIONS) {
    return (
      <div className="h-full flex flex-col p-6 bg-void text-fog relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-signal/10 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_40px_rgba(46,92,255,0.2)]">
                    <MapPin size={40} className="text-white" />
                </div>
                
                <h2 className="text-4xl font-black text-white mb-4 uppercase tracking-tight">
                    Synchronize.
                </h2>
                <p className="text-lg text-gray-400 mb-10 max-w-xs">
                    We need your location to show you the world around you. 
                </p>
                
                <div className="w-full max-w-xs space-y-3">
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 bg-white text-black font-bold text-lg rounded-2xl hover:bg-gray-200 transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                        Allow Location
                    </button>
                    <button 
                        onClick={onComplete}
                        className="w-full py-4 text-gray-500 font-bold text-sm hover:text-white transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
          </div>
          
          <div className="z-10 text-center pb-6">
              <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                  <Shield size={14} className="text-mint" />
                  <span className="text-[10px] font-bold text-gray-400">YOUR DATA STAYS ON YOUR DEVICE</span>
              </div>
          </div>
      </div>
    );
  }

  return null;
};
