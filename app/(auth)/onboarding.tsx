/**
 * 5-slide onboarding carousel (prototype: features/onboarding/Onboarding.tsx).
 * Slides: anti-ads (rose) → culture (purple) → events (orange) → map (signal) → control (mint).
 * "Enter the Void" hands off to the auth flow.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Svg, Circle, Line, Path } from 'react-native-svg';
import AuthLayout from '@/components/auth/AuthLayout';
import { COLORS } from '@/config/constants';
import {
  HeartIcon,
  UsersIcon,
  MusicIcon,
  GamepadIcon,
  CameraIcon,
  CalendarIcon,
  MapIcon,
  GhostIcon,
} from '@/components/ui/icons';

const TOTAL_SLIDES = 5;

// Colored glow standing in for the prototype's CSS box-shadows
const glow = (color: string, radius = 24) => ({
  shadowColor: color,
  shadowOpacity: 0.5,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: 0 },
  elevation: 12,
});

// Infinite linear rotation (prototype: animate-[spin_60s_linear_infinite])
function useSpin(durationMs: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(value, {
        toValue: 1,
        duration: durationMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [value, durationMs]);
  return value.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
}

// Soft opacity pulse (prototype: animate-pulse)
function usePulse() {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value]);
  return value;
}

function SlideText({
  title,
  accent,
  accentClass,
  body,
}: {
  title: string;
  accent: string;
  accentClass: string;
  body: string;
}) {
  return (
    <>
      <Text className="text-4xl font-black text-white text-center tracking-tight mb-4">
        {title}
        {'\n'}
        <Text className={accentClass}>{accent}</Text>
      </Text>
      <Text className="text-lg text-fog/50 text-center leading-7 px-2">{body}</Text>
    </>
  );
}

// ── Slide 1: Connection (the anti-ad) ──
function SlideConnection({ onNext }: { onNext: () => void }) {
  return (
    <AuthLayout accent="rose" dots={{ current: 0, total: TOTAL_SLIDES }} ctaLabel="Next" onCta={onNext} showCtaArrow>
      <View className="w-64 h-64 mb-10 items-center justify-center">
        {/* Background chaos (ads) */}
        <View
          className="absolute inset-0 flex-row flex-wrap opacity-20"
          style={{ transform: [{ scale: 0.9 }] }}
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-1/2 h-1/2 p-1">
              <View className="flex-1 bg-white/10 rounded-lg" />
            </View>
          ))}
        </View>

        {/* Central hero */}
        <View className="items-center justify-center">
          <View
            className="w-24 h-24 rounded-full bg-rose items-center justify-center"
            style={glow(COLORS.rose)}
          >
            <HeartIcon size={40} color="#FFFFFF" fill="#FFFFFF" />
          </View>
          <View
            className="absolute -top-2 -right-10 bg-white px-2 py-1 rounded-full border border-white"
            style={{ transform: [{ rotate: '12deg' }] }}
          >
            <Text className="text-black text-[10px] font-bold">NO ADS</Text>
          </View>
          <View
            className="absolute -bottom-2 -left-10 bg-white px-2 py-1 rounded-full border border-white"
            style={{ transform: [{ rotate: '-12deg' }] }}
          >
            <Text className="text-black text-[10px] font-bold">NO BOTS</Text>
          </View>
        </View>
      </View>

      <SlideText
        title="Connect with People."
        accent="Not Ads."
        accentClass="text-rose"
        body="We built a place for your real friends, and your local communities, not for algorithms selling your attention."
      />
    </AuthLayout>
  );
}

// ── Slide 2: Community (build local) ──
function SlideCommunity({ onNext }: { onNext: () => void }) {
  const spin = useSpin(60000);
  return (
    <AuthLayout accent="purple" dots={{ current: 1, total: TOTAL_SLIDES }} ctaLabel="Next" onCta={onNext} showCtaArrow>
      <View className="w-72 h-72 mb-8 items-center justify-center">
        {/* Dashed connection lines */}
        <View className="absolute inset-0 opacity-30">
          <Svg width="100%" height="100%">
            <Line x1="50%" y1="50%" x2="50%" y2="10%" stroke="white" strokeWidth={2} strokeDasharray="4 4" />
            <Line x1="50%" y1="50%" x2="85%" y2="80%" stroke="white" strokeWidth={2} strokeDasharray="4 4" />
            <Line x1="50%" y1="50%" x2="15%" y2="80%" stroke="white" strokeWidth={2} strokeDasharray="4 4" />
          </Svg>
        </View>

        {/* Orbiting satellites */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ rotate: spin }],
          }}
        >
          <View className="absolute top-0 left-1/2 -ml-6 w-12 h-12 bg-purple/20 border border-purple/50 rounded-xl items-center justify-center">
            <MusicIcon size={20} color="#D8B4FE" />
          </View>
          <View className="absolute bottom-10 right-0 w-12 h-12 bg-rose/20 border border-rose/50 rounded-xl items-center justify-center">
            <CameraIcon size={20} color="#F9A8D4" />
          </View>
          <View className="absolute bottom-10 left-0 w-12 h-12 bg-signal/20 border border-signal/50 rounded-xl items-center justify-center">
            <GamepadIcon size={20} color="#93C5FD" />
          </View>
        </Animated.View>

        {/* Central hub */}
        <View className="items-center justify-center">
          <View
            className="w-28 h-28 bg-purple rounded-full items-center justify-center border-4 border-white/10"
            style={glow(COLORS.purple, 30)}
          >
            <UsersIcon size={40} color="#FFFFFF" />
          </View>
          <View className="absolute -bottom-6 bg-white/10 px-3 py-1 rounded-full border border-white/20">
            <Text className="text-white text-xs font-bold">Local Cultures</Text>
          </View>
        </View>
      </View>

      <SlideText
        title="Find Your"
        accent="Culture."
        accentClass="text-purple"
        body="Culture bridges the gap between your local community and global movements."
      />
    </AuthLayout>
  );
}

// ── Slide 3: Events (local events) ──
function SlideEvents({ onNext }: { onNext: () => void }) {
  const GRID = 20;
  const W = 288;
  const H = 256;
  return (
    <AuthLayout accent="orange" dots={{ current: 2, total: TOTAL_SLIDES }} ctaLabel="Next" onCta={onNext} showCtaArrow>
      <View
        className="w-72 h-64 mb-10 rounded-2xl overflow-hidden border border-white/10 bg-black/40 items-center justify-center"
        style={{ transform: [{ rotate: '3deg' }] }}
      >
        {/* Fake map grid */}
        <View className="absolute inset-0 opacity-20">
          <Svg width={W} height={H}>
            {Array.from({ length: Math.ceil(W / GRID) }).map((_, i) => (
              <Line key={`v${i}`} x1={i * GRID} y1={0} x2={i * GRID} y2={H} stroke={COLORS.orange} strokeWidth={1} />
            ))}
            {Array.from({ length: Math.ceil(H / GRID) }).map((_, i) => (
              <Line key={`h${i}`} x1={0} y1={i * GRID} x2={W} y2={i * GRID} stroke={COLORS.orange} strokeWidth={1} />
            ))}
          </Svg>
        </View>

        {/* The "event" marker */}
        <View
          className="w-16 h-16 bg-orange rounded-xl items-center justify-center"
          style={glow(COLORS.orange, 18)}
        >
          <CalendarIcon size={32} color="#FFFFFF" />
        </View>

        {/* Overlay card */}
        <View className="absolute bottom-4 left-4 right-4 bg-white/10 p-3 rounded-xl border border-white/10 flex-row items-center justify-between">
          <View>
            <Text className="text-orange text-[10px] font-bold uppercase tracking-wider">
              Tonight • 8 PM
            </Text>
            <Text className="text-white text-sm font-bold">Rooftop Gathering</Text>
          </View>
          <View className="bg-orange px-3 py-1 rounded-lg">
            <Text className="text-white text-xs font-bold">RSVP</Text>
          </View>
        </View>
      </View>

      <SlideText
        title="Events From"
        accent="Your Community."
        accentClass="text-orange"
        body="Stop searching. Find events hosted by the local groups you actually care about. Tonight, tomorrow, whenever."
      />
    </AuthLayout>
  );
}

// ── Slide 4: Map (see friends IRL) ──
function SlideMap({ onNext }: { onNext: () => void }) {
  const sweep = useSpin(4000);
  const pulse = usePulse();
  return (
    <AuthLayout accent="signal" dots={{ current: 3, total: TOTAL_SLIDES }} ctaLabel="Next" onCta={onNext} showCtaArrow>
      <View className="w-72 h-72 mb-8 items-center justify-center">
        {/* Radar rings */}
        <View className="absolute inset-0 rounded-full border border-signal/20" />
        <View className="absolute inset-4 rounded-full border border-signal/10" />

        {/* Radar sweep */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ rotate: sweep }],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 288 288">
            <Path d="M144 144 L144 0 A144 144 0 0 1 288 144 Z" fill={COLORS.signal} opacity={0.12} />
          </Svg>
        </Animated.View>

        {/* Map pins */}
        <Animated.View style={{ position: 'absolute', top: '33%', left: '33%', opacity: pulse }}>
          <View className="w-3 h-3 bg-white rounded-full" style={glow('#FFFFFF', 10)} />
        </Animated.View>
        <View className="absolute bottom-[33%] right-[25%] w-3 h-3 bg-mint rounded-full" style={glow(COLORS.mint, 10)} />
        <View className="absolute top-[25%] right-[33%] w-3 h-3 bg-orange rounded-full" style={glow(COLORS.orange, 10)} />

        {/* Center user */}
        <View
          className="w-20 h-20 bg-signal rounded-full items-center justify-center border-4 border-void"
          style={glow(COLORS.signal, 30)}
        >
          <MapIcon size={32} color="#FFFFFF" />
        </View>

        {/* Floating label */}
        <View className="absolute bottom-0 left-0 right-0 items-center">
          <View className="bg-void border border-signal/50 px-4 py-2 rounded-full flex-row items-center gap-2">
            <Animated.View style={{ opacity: pulse }}>
              <View className="w-2 h-2 bg-mint rounded-full" />
            </Animated.View>
            <Text className="text-white text-xs font-bold">LIVE MAP</Text>
          </View>
        </View>
      </View>

      <SlideText
        title="Your World."
        accent="Your Map."
        accentClass="text-signal"
        body="You decide which places belong on your map. See your friends and the pulse of your local community. Not local ads competing for your attention."
      />
    </AuthLayout>
  );
}

// ── Slide 5: Trust (control / ghost mode) ──
function SlideTrust({ onNext }: { onNext: () => void }) {
  const spin = useSpin(60000);
  return (
    <AuthLayout accent="mint" dots={{ current: 4, total: TOTAL_SLIDES }} ctaLabel="Enter the Void" onCta={onNext}>
      <View className="w-64 h-64 mb-10 items-center justify-center">
        {/* Rotating dotted ring */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ rotate: spin }],
          }}
        >
          <Svg width="100%" height="100%" viewBox="0 0 256 256">
            <Circle
              cx={128}
              cy={128}
              r={124}
              stroke={COLORS.mint}
              strokeOpacity={0.5}
              strokeWidth={4}
              strokeDasharray="2 14"
              strokeLinecap="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        {/* Only the ghost */}
        <View style={glow(COLORS.mint, 30)}>
          <GhostIcon size={100} color={COLORS.mint} strokeWidth={1} />
        </View>
      </View>

      <SlideText
        title="You Are"
        accent="In Control."
        accentClass="text-mint"
        body="We are a nonprofit. No shareholders. No AI mining your life. You control your data. You decide who sees what."
      />
    </AuthLayout>
  );
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const router = useRouter();

  // Testers sign in with accounts they were given; nobody can self-register.
  const handleComplete = () => router.replace('/(auth)/signin');

  switch (step) {
    case 0:
      return <SlideConnection onNext={() => setStep(1)} />;
    case 1:
      return <SlideCommunity onNext={() => setStep(2)} />;
    case 2:
      return <SlideEvents onNext={() => setStep(3)} />;
    case 3:
      return <SlideMap onNext={() => setStep(4)} />;
    default:
      return <SlideTrust onNext={handleComplete} />;
  }
}
