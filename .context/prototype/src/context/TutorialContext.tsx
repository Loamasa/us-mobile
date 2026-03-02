
import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import { TUTORIALS, TutorialDef } from '../features/tutorial/tutorialData';

interface TutorialContextType {
  activeTutorial: TutorialDef | null;
  triggerTutorial: (id: string, force?: boolean) => void;
  dismissTutorial: () => void;
  resetTutorials: () => void;
  enableTutorials: () => void;
  setTutorialsEnabled: (enabled: boolean) => void;
  isSystemActive: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export const TutorialProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTutorialId, _setActiveTutorialId] = useState<string | null>(null);
  const activeTutorialIdRef = useRef<string | null>(null);
  
  // Helper to keep state and ref in sync
  const setActiveTutorialId = useCallback((id: string | null) => {
    activeTutorialIdRef.current = id;
    _setActiveTutorialId(id);
  }, []);
  
  // The system is INACTIVE by default to prevent unwanted popups on app start.
  // It is explicitly enabled when the user completes Onboarding or toggles it in Settings.
  const [isSystemActive, setIsSystemActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('us_tutorial_system_active');
    return saved === 'true'; 
  });

  const triggerTutorial = useCallback((id: string, force: boolean = false) => {
    // 1. If system is inactive, ignore all triggers (unless forced)
    if (!isSystemActive && !force) return;

    // 2. Check REF to see if another tutorial is currently active (prevents stale closure issues)
    if (activeTutorialIdRef.current && !force) return;

    // 3. Check if this specific tutorial has already been seen
    const hasSeen = localStorage.getItem(`us_tutorial_seen_${id}`);
    if (hasSeen && !force) return;

    setActiveTutorialId(id);
  }, [isSystemActive, setActiveTutorialId]);

  const dismissTutorial = useCallback(() => {
    const currentId = activeTutorialIdRef.current;
    if (currentId) {
      localStorage.setItem(`us_tutorial_seen_${currentId}`, 'true');
      setActiveTutorialId(null);
    }
  }, [setActiveTutorialId]);

  const setTutorialsEnabled = useCallback((enabled: boolean) => {
    setIsSystemActive(enabled);
    if (enabled) {
      localStorage.setItem('us_tutorial_system_active', 'true');
    } else {
      localStorage.setItem('us_tutorial_system_active', 'false');
      setActiveTutorialId(null);
    }
  }, [setActiveTutorialId]);

  const enableTutorials = useCallback(() => {
    setTutorialsEnabled(true);
  }, [setTutorialsEnabled]);

  const resetTutorials = useCallback(() => {
    // Clear all "seen" flags
    Object.keys(TUTORIALS).forEach(key => {
      localStorage.removeItem(`us_tutorial_seen_${key}`);
    });
    
    // Reset current active tutorial
    setActiveTutorialId(null);
  }, [setActiveTutorialId]);

  const activeTutorial = activeTutorialId ? TUTORIALS[activeTutorialId] : null;

  return (
    <TutorialContext.Provider value={{ 
      activeTutorial, 
      triggerTutorial, 
      dismissTutorial, 
      resetTutorials, 
      enableTutorials,
      setTutorialsEnabled,
      isSystemActive 
    }}>
      {children}
    </TutorialContext.Provider>
  );
};
