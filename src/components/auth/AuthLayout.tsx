/**
 * Shared layout for onboarding + auth screens (prototype: Onboarding.tsx / AuthFlow.tsx).
 * Ambient accent glow blob, "us" logo chip, optional step dots, full-width CTA.
 */
import { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { COLORS } from '@/config/constants';
import { ArrowRightIcon } from '@/components/ui/icons';

export type AuthAccent = 'signal' | 'mint' | 'rose' | 'orange' | 'purple';

const ACCENTS: Record<
  AuthAccent,
  { hex: string; ctaClass: string; ctaTextClass: string }
> = {
  signal: { hex: COLORS.signal, ctaClass: 'bg-signal', ctaTextClass: 'text-white' },
  mint: { hex: COLORS.mint, ctaClass: 'bg-mint', ctaTextClass: 'text-black' },
  rose: { hex: COLORS.rose, ctaClass: 'bg-rose', ctaTextClass: 'text-white' },
  orange: { hex: COLORS.orange, ctaClass: 'bg-orange', ctaTextClass: 'text-white' },
  purple: { hex: COLORS.purple, ctaClass: 'bg-purple', ctaTextClass: 'text-white' },
};

// Soft radial glow standing in for the prototype's blur-[100px] blob
export function GlowBlob({ hex, position }: { hex: string; position: 'corner' | 'center' }) {
  const size = position === 'center' ? 500 : 384;
  const containerStyle =
    position === 'center'
      ? { top: '50%' as const, left: '50%' as const, marginTop: -size / 2, marginLeft: -size / 2 }
      : { top: -size * 0.25, right: -size * 0.25 };

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', width: size, height: size, ...containerStyle }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={hex} stopOpacity={0.22} />
            <Stop offset="60%" stopColor={hex} stopOpacity={0.1} />
            <Stop offset="100%" stopColor={hex} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

type AuthLayoutProps = {
  children: ReactNode;
  accent?: AuthAccent;
  blobPosition?: 'corner' | 'center';
  showLogo?: boolean;
  dots?: { current: number; total: number };
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  ctaVariant?: 'accent' | 'white';
  showCtaArrow?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function AuthLayout({
  children,
  accent = 'signal',
  blobPosition = 'corner',
  showLogo = true,
  dots,
  ctaLabel,
  onCta,
  ctaDisabled = false,
  ctaVariant = 'accent',
  showCtaArrow = false,
  secondaryLabel,
  onSecondary,
}: AuthLayoutProps) {
  const accentDef = ACCENTS[accent];
  const ctaClass =
    ctaVariant === 'white' ? 'bg-white' : accentDef.ctaClass;
  const ctaTextClass =
    ctaVariant === 'white' ? 'text-black' : accentDef.ctaTextClass;
  const arrowColor = ctaVariant === 'white' || accent === 'mint' ? '#0F1115' : '#FFFFFF';

  return (
    <SafeAreaView className="flex-1 bg-void">
      <GlowBlob hex={accentDef.hex} position={blobPosition} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-6 pb-6">
          {/* Header / Logo */}
          {showLogo && (
            <View className="items-center mb-6">
              <View className="w-12 h-12 bg-glass border border-glass-border rounded-xl items-center justify-center">
                <Text className="text-white text-xl font-black">us</Text>
              </View>
            </View>
          )}

          {/* Main Content */}
          <View className="flex-1 justify-center items-center">{children}</View>

          {/* Navigation */}
          <View className="mt-8">
            {dots && (
              <View className="flex-row justify-center gap-2 mb-6">
                {Array.from({ length: dots.total }).map((_, i) => (
                  <View
                    key={i}
                    className={`h-1.5 rounded-full ${
                      i === dots.current ? 'w-6 bg-white' : 'w-1.5 bg-white/20'
                    }`}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              className={`w-full py-4 rounded-2xl flex-row items-center justify-center gap-2 ${ctaClass} ${
                ctaDisabled ? 'opacity-50' : ''
              }`}
              onPress={onCta}
              disabled={ctaDisabled}
              activeOpacity={0.8}
            >
              <Text className={`font-bold text-lg ${ctaTextClass}`}>{ctaLabel}</Text>
              {showCtaArrow && <ArrowRightIcon size={20} color={arrowColor} />}
            </TouchableOpacity>

            {secondaryLabel && (
              <TouchableOpacity className="py-4" onPress={onSecondary} activeOpacity={0.7}>
                <Text className="text-fog/40 text-sm font-bold text-center">
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
