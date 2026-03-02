import React from 'react';
import { X, Navigation } from 'lucide-react';
import { TutorialDef } from '../../features/tutorial/tutorialData';

interface TutorialOverlayProps {
  tutorial: TutorialDef;
  onDismiss: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ tutorial, onDismiss }) => {
  const Icon = tutorial.icon;
  
  // Dynamic color styles
  const getColorClasses = (color: string) => {
      switch (color) {
          case 'mint': return { bg: 'bg-mint', text: 'text-mint', shadow: 'shadow-mint/20', hover: 'hover:bg-emerald-400' };
          case 'purple': return { bg: 'bg-purple-500', text: 'text-purple-500', shadow: 'shadow-purple-500/20', hover: 'hover:bg-purple-600' };
          case 'orange': return { bg: 'bg-orange-500', text: 'text-orange-500', shadow: 'shadow-orange-500/20', hover: 'hover:bg-orange-600' };
          case 'rose': return { bg: 'bg-rose-500', text: 'text-rose-500', shadow: 'shadow-rose-500/20', hover: 'hover:bg-rose-600' };
          default: return { bg: 'bg-signal', text: 'text-signal', shadow: 'shadow-signal/20', hover: 'hover:bg-blue-600' };
      }
  };

  const styles = getColorClasses(tutorial.color);

  // Position Classes
  const getPositionClasses = () => {
      switch (tutorial.alignment) {
          case 'bottom-left': return 'bottom-24 left-6 sm:left-20';
          case 'bottom-right': return 'bottom-24 right-6 sm:right-20';
          case 'top-right': return 'top-20 right-20 mr-4';
          
          // Specific Use Cases
          case 'map-center': 
            // Moved down to be closer to center (was 12rem, now 4rem to maintain visibility of pin but not float too high)
            return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+4rem)]';
            
          case 'nav-communities': 
            // Adjusted to bottom-14 (approx 56px) to anchor closer to nav icons
            // Fixed positioning ensures this is relative to viewport bottom
            return 'bottom-14 right-4 sm:right-auto sm:left-[calc(50%+9rem)] sm:-translate-x-1/2';
            
          case 'nav-chats': 
            // Adjusted to bottom-14
            return 'bottom-14 left-4 sm:left-[calc(50%-9rem)] sm:-translate-x-1/2';
            
          default: return 'inset-0 m-auto'; // Center
      }
  };

  // Arrow Alignment Classes (Overrides default centering if needed)
  const getArrowClasses = () => {
      if (tutorial.alignment === 'nav-chats') {
          return 'left-12 sm:left-1/2 sm:-translate-x-1/2';
      }
      if (tutorial.alignment === 'nav-communities') {
          return 'right-12 left-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2';
      }
      return 'left-1/2 -translate-x-1/2';
  };

  // Dynamic Arrow Stem Length based on spacing
  const getArrowStemHeight = () => {
       if (tutorial.alignment === 'map-center') return 'h-8'; // Reduced stem for map (2rem)
       if (tutorial.alignment?.startsWith('nav-')) return 'h-4'; // Short stem (1rem/16px) for bottom-14 placement relative to nav
       return 'h-8'; // Default
  };

  const positionClass = getPositionClasses();
  const isCentered = !tutorial.alignment || tutorial.alignment === 'center';
  const arrowStemClass = getArrowStemHeight();

  return (
    <div className={`fixed inset-0 z-[500] pointer-events-none ${isCentered ? 'flex items-center justify-center p-6' : ''}`}>
      {/* Dimmed Background */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-500 pointer-events-auto" 
        onClick={onDismiss}
      />

      {/* Card Container */}
      <div className={`
          relative pointer-events-auto bg-[#0F1115] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-3xl p-8 animate-in zoom-in-95 duration-500 slide-in-from-bottom-8 max-w-sm w-full
          ${isCentered ? '' : `absolute ${positionClass}`}
      `}>
           
           {/* Decorative Glow */}
           <div className={`absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-48 ${styles.text} opacity-15 bg-current rounded-full blur-[80px] pointer-events-none`}></div>
           
           {/* Arrow Indicator: Left */}
           {tutorial.arrow === 'left' && (
               <div className="absolute top-1/2 -left-3 -translate-y-1/2 -translate-x-full flex items-center animate-bounce-horizontal">
                   <div className={`w-0 h-0 border-t-[10px] border-t-transparent border-r-[16px] border-r-white/90 border-b-[10px] border-b-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`}></div>
                   <div className="w-12 h-1 bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
               </div>
           )}

           {/* Arrow Indicator: Bottom */}
           {tutorial.arrow === 'bottom' && (
               <div className={`absolute top-full flex flex-col items-center animate-bounce-vertical ${getArrowClasses()}`}>
                   <div className={`w-1 ${arrowStemClass} bg-white/90 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] -mt-1`}></div>
                   <div className={`w-0 h-0 border-l-[10px] border-l-transparent border-t-[16px] border-t-white/90 border-r-[10px] border-r-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]`}></div>
               </div>
           )}

           <div className="relative z-10 flex flex-col items-center text-center">
               <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl group relative overflow-hidden rotate-3">
                    <div className={`absolute inset-0 ${styles.text} opacity-10 bg-current group-hover:opacity-20 transition-opacity`}></div>
                    <Icon size={36} className="text-white relative z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
               </div>

               <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{tutorial.title}</h3>
               <p className="text-gray-400 text-lg leading-relaxed mb-8 font-medium">
                   {tutorial.message}
               </p>

               <button 
                   onClick={onDismiss}
                   className={`w-full py-4 ${styles.bg} ${styles.hover} rounded-xl text-white font-bold text-sm transition-all shadow-lg ${styles.shadow} flex items-center justify-center gap-2 group transform active:scale-95`}
               >
                   {tutorial.actionLabel === 'Start Exploring' && (
                       <Navigation size={16} className="group-hover:-translate-y-1 transition-transform" />
                   )}
                   {tutorial.actionLabel}
               </button>
           </div>
           
           <button 
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-full transition-colors"
           >
                <X size={20} />
           </button>
      </div>
    </div>
  );
};