import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';

/**
 * Auth gate. Signed in → map; signed out → onboarding.
 * In dev the root layout's auto-sign-in (ensureDevUser) completes before this
 * renders, so dev builds land on the map as before. In a production build no
 * auto-sign-in exists — real users must pass through onboarding/auth.
 */
export default function Index() {
    const [user, setUser] = useState(() => auth.currentUser);
    const [resolved, setResolved] = useState(() => auth.currentUser !== null);

    useEffect(() => {
        return onAuthStateChanged(auth, (u) => {
            setUser(u);
            setResolved(true);
        });
    }, []);

    if (!resolved) {
        return (
            <View className="flex-1 bg-void items-center justify-center">
                <ActivityIndicator size="large" color="#2E5CFF" />
            </View>
        );
    }

    return <Redirect href={user ? '/(tabs)/map' : '/(auth)/onboarding'} />;
}
