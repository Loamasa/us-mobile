import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import '../global.css';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setHasProfile(false);
        setLoading(false);
      }
      // Profile listening handled by the next effect
    });
    return unsubscribe;
  }, []);

  // Listen to profile document in real-time so hasProfile updates
  // when the profile is created during onboarding
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        setHasProfile(snap.exists());
        setLoading(false);
      },
      (err) => {
        console.warn('Profile listener error:', err);
        setHasProfile(false);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [user]);

  // Auth guard: redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentScreen = (segments as string[])[1]; // e.g. 'phone', 'profile', 'permissions', 'spots'

    if (!user && !inAuthGroup) {
      // Not signed in, redirect to auth
      router.replace('/(auth)/phone');
    } else if (user && !hasProfile && !inAuthGroup) {
      // Signed in but no profile, redirect to profile creation
      router.replace('/(auth)/profile');
    } else if (user && hasProfile && inAuthGroup) {
      // Signed in with profile — only redirect to map if on phone/profile screens.
      // If on permissions or spots, the user is mid-onboarding, let them finish.
      if (currentScreen === 'phone' || currentScreen === 'profile' || currentScreen === 'otp') {
        router.replace('/(tabs)/map');
      }
    }
  }, [user, hasProfile, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 bg-void items-center justify-center">
        <ActivityIndicator size="large" color="#2E5CFF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  );
}
