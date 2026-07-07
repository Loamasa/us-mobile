import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { XIcon, ClockIcon } from '@/components/ui/icons';
import type { UserSignal } from '@/types';

interface ActiveSignalHUDProps {
    signal: UserSignal;
    onClear: () => void;
    /** Tap the pill body to reopen the setter prefilled. */
    onEdit?: () => void;
}

function getTimeLeft(expiresAt: { toDate: () => Date } | Date | string): string {
    const end =
        typeof expiresAt === 'object' && 'toDate' in expiresAt
            ? expiresAt.toDate().getTime()
            : new Date(expiresAt as any).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}

export default function ActiveSignalHUD({ signal, onClear, onEdit }: ActiveSignalHUDProps) {
    const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(signal.expiresAt));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(getTimeLeft(signal.expiresAt));
        }, 60_000);
        return () => clearInterval(timer);
    }, [signal.expiresAt]);

    return (
        <BlurView
            tint="dark"
            intensity={80}
            style={{
                position: 'absolute',
                top: 112,
                alignSelf: 'center',
                zIndex: 40,
                // Clamp: a 30-char signal text would otherwise widen the pill
                // until the clear ✕ slides under the top-right button column
                // (zIndex 50 wins the taps) on narrow screens.
                maxWidth: '60%',
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
                borderWidth: 1,
                borderColor: 'rgba(244,114,182,0.3)',
                borderRadius: 999,
                paddingLeft: 16,
                paddingRight: 4,
                paddingVertical: 4,
                gap: 12,
                overflow: 'hidden',
            }}
        >
            {/* Emoji + text + timer — tap to edit the signal */}
            <TouchableOpacity
                onPress={onEdit}
                disabled={!onEdit}
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 1,
                }}
            >
                <Text style={{ fontSize: 18 }}>{signal.emoji}</Text>
                <View style={{ flexShrink: 1 }}>
                    <Text
                        numberOfLines={1}
                        style={{ color: '#F2F4F6', fontSize: 12, fontWeight: '700' }}
                    >
                        {signal.text}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <ClockIcon size={9} color="#F472B6" />
                        <Text
                            style={{
                                color: '#F472B6',
                                fontSize: 9,
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                            }}
                        >
                            {timeLeft}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Clear button */}
            <TouchableOpacity
                onPress={onClear}
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                activeOpacity={0.7}
            >
                <XIcon size={14} color="#9CA3AF" />
            </TouchableOpacity>
        </BlurView>
    );
}
