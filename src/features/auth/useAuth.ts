import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  type User,
  type ConfirmationResult,
  type ApplicationVerifier,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { getUserProfile, reserveHandle } from '@/lib/firestore';
import type { UserProfile } from '@/types';

/** Mock verifier for Firebase Auth Emulator (no reCAPTCHA DOM in RN) */
const emulatorVerifier: ApplicationVerifier = {
  type: 'recaptcha',
  verify: () => Promise.resolve('emulator-mock-token'),
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const p = await getUserProfile(firebaseUser.uid);
        setProfile(p);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    // In dev mode, use a mock verifier for the Firebase Auth Emulator.
    // In production, switch to @react-native-firebase/auth (native SDK).
    const confirmation = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      emulatorVerifier as ApplicationVerifier,
    );
    setConfirmationResult(confirmation);
    return confirmation;
  }, []);

  const verifyOtp = useCallback(async (code: string) => {
    if (!confirmationResult) throw new Error('No confirmation result. Send OTP first.');
    const result = await confirmationResult.confirm(code);
    return result.user;
  }, [confirmationResult]);

  const createProfile = useCallback(async (data: {
    displayName: string;
    handle: string;
    avatarUrl?: string;
    bio?: string;
  }) => {
    if (!user) throw new Error('Not authenticated');

    const handle = data.handle.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Reserve handle
    await reserveHandle(handle, user.uid);

    // Create user profile document
    const profileData = {
      displayName: data.displayName,
      handle,
      avatarUrl: data.avatarUrl ?? '',
      bio: data.bio ?? '',
      phoneNumber: user.phoneNumber ?? '',
      createdAt: serverTimestamp(),
      settings: {
        globalLocationSharing: true,
        allowFriendRequests: true,
        showOnlineStatus: true,
      },
      currentSignal: null,
    };

    await setDoc(doc(db, 'users', user.uid), profileData);
    setProfile({ id: user.uid, ...profileData } as unknown as UserProfile);
  }, [user]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setProfile(null);
  }, []);

  return {
    user,
    profile,
    loading,
    sendOtp,
    verifyOtp,
    createProfile,
    signOut,
  };
}
