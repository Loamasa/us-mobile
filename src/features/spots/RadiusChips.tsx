import { View, Text, TouchableOpacity } from 'react-native';
import { COLORS } from '@/config/constants';

const RADIUS_OPTIONS = [50, 100, 150, 200, 300, 500, 750, 1000];

interface RadiusChipsProps {
  value: number;
  onChange: (radius: number) => void;
}

/**
 * Labeled radius picker (chip buttons) — shared by the My Spots editor and
 * the onboarding spots step so both expose identical spot capabilities.
 */
export default function RadiusChips({ value, onChange }: RadiusChipsProps) {
  return (
    <View>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
      >
        <Text
          style={{
            color: 'rgba(242,244,246,0.4)',
            fontSize: 10,
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          Radius
        </Text>
        <Text style={{ color: COLORS.signal, fontSize: 12, fontWeight: '700' }}>
          {value}m
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {RADIUS_OPTIONS.map((r) => (
          <TouchableOpacity
            key={r}
            onPress={() => onChange(r)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: value === r ? COLORS.signal : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor: value === r ? COLORS.signal : 'rgba(255,255,255,0.08)',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: value === r ? '#fff' : 'rgba(242,244,246,0.5)',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {r}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
