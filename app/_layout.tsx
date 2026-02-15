import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { getUserProfile } from '@/lib/firestore';
import '../global.css';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setHasProfile(!!profile);
      } else {
        setHasProfile(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Auth guard: redirect based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Not signed in, redirect to auth
      router.replace('/(auth)/phone');
    } else if (user && !hasProfile && !inAuthGroup) {
      // Signed in but no profile, redirect to profile creation
      router.replace('/(auth)/profile');
    } else if (user && hasProfile && inAuthGroup) {
      // Signed in with profile, redirect to main app
      router.replace('/(tabs)/map');
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
