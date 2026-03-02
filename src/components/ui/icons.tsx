/**
 * SVG icon wrappers using react-native-svg.
 * Used throughout the app instead of emoji placeholders.
 */
import { Svg, Path, Circle, Line } from 'react-native-svg';

type IconProps = {
    size?: number;
    color?: string;
};

// Ghost icon (active ghost mode)
export const GhostIcon = ({ size = 20, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M9 10h.01" />
        <Path d="M15 10h.01" />
        <Path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
    </Svg>
);


// Eye icon (Feather-style)
export const EyeIcon = ({ size = 20, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <Circle cx={12} cy={12} r={3} />
    </Svg>
);

// Eye Off icon
export const EyeOffIcon = ({ size = 20, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <Path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <Line x1={1} y1={1} x2={23} y2={23} />
    </Svg>
);

// Radio / broadcast icon
export const RadioIcon = ({ size = 20, color = '#F472B6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={2} />
        <Path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
        <Path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        <Path d="M7.76 7.76a6 6 0 0 0 0 8.49" />
        <Path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
    </Svg>
);

// Navigation / location icon
export const NavigationIcon = ({ size = 20, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 11l19-9-9 19-2-8-8-2z" />
    </Svg>
);

// X / close icon
export const XIcon = ({ size = 16, color = '#9CA3AF' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Line x1={18} y1={6} x2={6} y2={18} />
        <Line x1={6} y1={6} x2={18} y2={18} />
    </Svg>
);

// Clock icon
export const ClockIcon = ({ size = 12, color = '#F472B6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={10} />
        <Path d="M12 6v6l4 2" />
    </Svg>
);

// Map icon (tab bar)
export const MapIcon = ({ size = 22, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
        <Line x1={9} y1={3} x2={9} y2={18} />
        <Line x1={15} y1={6} x2={15} y2={21} />
    </Svg>
);

// Users icon (friends tab)
export const UsersIcon = ({ size = 22, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle cx={9} cy={7} r={4} />
        <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
);

// Settings icon
export const SettingsIcon = ({ size = 22, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={3} />
        <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
);

// Search icon
export const SearchIcon = ({ size = 18, color = '#9CA3AF' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={11} cy={11} r={8} />
        <Line x1={21} y1={21} x2={16.65} y2={16.65} />
    </Svg>
);

// User Plus icon (add friend)
export const UserPlusIcon = ({ size = 18, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <Circle cx={8.5} cy={7} r={4} />
        <Line x1={20} y1={8} x2={20} y2={14} />
        <Line x1={23} y1={11} x2={17} y2={11} />
    </Svg>
);

// Shield icon
export const ShieldIcon = ({ size = 14, color = '#00E096' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
);

// Map Pin icon
export const MapPinIcon = ({ size = 20, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <Circle cx={12} cy={10} r={3} />
    </Svg>
);

// Message Square icon (chats tab)
export const MessageSquareIcon = ({ size = 22, color = '#F2F4F6' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
);

// User icon (single person)
export const UserIcon = ({ size = 20, color = '#9CA3AF' }: IconProps) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx={12} cy={7} r={4} />
    </Svg>
);
