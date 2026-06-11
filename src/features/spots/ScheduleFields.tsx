import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { COLORS } from '@/config/constants';
import { DAY_LABELS } from '@/features/spots/spotSchedule';

export interface ScheduleFieldsValue {
  scheduled: boolean;
  days: number[]; // ISO weekdays, 1 = Mon … 7 = Sun
  start: string;
  end: string;
}

interface ScheduleFieldsProps {
  value: ScheduleFieldsValue;
  onChange: (patch: Partial<ScheduleFieldsValue>) => void;
}

/**
 * "Active Hours" form section — Always/Scheduled toggle, weekday chips and a
 * time range. Shared by the My Spots editor and the onboarding spots step.
 * Validation (normalizeTime, non-empty days) stays with the caller's save.
 */
export default function ScheduleFields({ value, onChange }: ScheduleFieldsProps) {
  return (
    <View>
      <Text
        style={{
          color: 'rgba(242,244,246,0.4)',
          fontSize: 10,
          fontWeight: '800',
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        Active Hours
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        {([
          { scheduled: false, label: 'Always' },
          { scheduled: true, label: 'Scheduled' },
        ] as const).map(({ scheduled, label }) => (
          <TouchableOpacity
            key={label}
            onPress={() => onChange({ scheduled })}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor:
                value.scheduled === scheduled ? COLORS.signal : 'rgba(255,255,255,0.05)',
              borderWidth: 1,
              borderColor:
                value.scheduled === scheduled ? COLORS.signal : 'rgba(255,255,255,0.08)',
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: value.scheduled === scheduled ? '#fff' : 'rgba(242,244,246,0.5)',
                fontSize: 12,
                fontWeight: '700',
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {value.scheduled && (
        <View style={{ gap: 10 }}>
          {/* Weekday chips */}
          <View style={{ flexDirection: 'row', gap: 5 }}>
            {DAY_LABELS.map((label, i) => {
              const day = i + 1;
              const on = value.days.includes(day);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() =>
                    onChange({
                      days: on
                        ? value.days.filter((d) => d !== day)
                        : [...value.days, day],
                    })
                  }
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: on
                      ? 'rgba(46,92,255,0.18)'
                      : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: on ? COLORS.signal : 'rgba(255,255,255,0.08)',
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={{
                      color: on ? COLORS.signal : 'rgba(242,244,246,0.4)',
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    {label[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Time range */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {(['start', 'end'] as const).map((field, i) => (
              <View
                key={field}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                {i === 1 && (
                  <Text style={{ color: 'rgba(242,244,246,0.35)', fontSize: 12 }}>
                    to
                  </Text>
                )}
                <TextInput
                  value={value[field]}
                  onChangeText={(v) => onChange({ [field]: v })}
                  placeholder={field === 'start' ? '08:00' : '17:00'}
                  placeholderTextColor="rgba(242,244,246,0.2)"
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: COLORS.fog,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={{ color: 'rgba(242,244,246,0.25)', fontSize: 11 }}>
            Outside these hours the place counts as inactive — you won't be
            visible there. An end before the start spans midnight.
          </Text>
        </View>
      )}
    </View>
  );
}
