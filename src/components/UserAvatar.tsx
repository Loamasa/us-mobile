import { View, Text } from 'react-native';
import { COLORS } from '@/config/constants';

type AvatarStatus = 'online' | 'away' | 'offline';
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarTint = 'signal' | 'rose';

interface UserAvatarProps {
    displayName?: string;
    avatarUrl?: string;
    size?: AvatarSize;
    status?: AvatarStatus;
    showStatus?: boolean;
    tint?: AvatarTint;
    className?: string;
}

const TINT_FILL: Record<AvatarTint, string> = {
    signal: 'rgba(46, 92, 255, 0.2)',
    rose: 'rgba(244, 114, 182, 0.2)',
};

const TINT_BORDER: Record<AvatarTint, string> = {
    signal: 'rgba(46, 92, 255, 0.4)',
    rose: 'rgba(244, 114, 182, 0.6)',
};

const SIZE_PX: Record<AvatarSize, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 96,
};

const FONT_SIZE: Record<AvatarSize, number> = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 32,
};

const STATUS_DOT_SIZE: Record<AvatarSize, number> = {
    xs: 6,
    sm: 8,
    md: 10,
    lg: 12,
    xl: 20,
};

const STATUS_COLOR: Record<AvatarStatus, string> = {
    online: COLORS.mint,
    away: '#F59E0B',
    offline: '#6B7280',
};

export default function UserAvatar({
    displayName = '?',
    size = 'md',
    status,
    showStatus = false,
    tint = 'signal',
}: UserAvatarProps) {
    const px = SIZE_PX[size];
    const fontSize = FONT_SIZE[size];
    const dotSize = STATUS_DOT_SIZE[size];
    const initial = (displayName || '?').charAt(0).toUpperCase();

    return (
        <View style={{ position: 'relative', width: px, height: px }}>
            {/* Avatar circle */}
            <View
                style={{
                    width: px,
                    height: px,
                    borderRadius: px / 2,
                    backgroundColor: TINT_FILL[tint],
                    borderWidth: tint === 'rose' ? 2 : 1.5,
                    borderColor: TINT_BORDER[tint],
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text
                    style={{
                        color: COLORS.fog,
                        fontSize,
                        fontWeight: '700',
                        letterSpacing: 0.5,
                    }}
                >
                    {initial}
                </Text>
            </View>

            {/* Status dot */}
            {showStatus && status && (
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor: STATUS_COLOR[status],
                        borderWidth: 2,
                        borderColor: COLORS.void,
                    }}
                />
            )}
        </View>
    );
}
