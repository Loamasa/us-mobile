import type { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRightIcon } from '@/components/ui/icons';

interface SettingRowProps {
  label: string;
  icon?: ReactNode;
  subtitle?: string;
  /** Right-aligned secondary text (e.g. current value). */
  value?: string;
  /** Small pill count (e.g. number of spots). */
  badge?: number;
  /** Custom right accessory; overrides the default value/badge/chevron. */
  right?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** 'danger' tints the label rose for destructive rows (e.g. Sign Out). */
  tint?: 'default' | 'danger';
}

/**
 * A single tappable settings row — icon + label (+ subtitle) on the left,
 * value/badge/chevron on the right. Designed to sit inside a SettingsGroup.
 */
export default function SettingRow({
  label,
  icon,
  subtitle,
  value,
  badge,
  right,
  onPress,
  disabled = false,
  tint = 'default',
}: SettingRowProps) {
  const labelColor = tint === 'danger' ? 'text-rose' : 'text-fog';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-3.5"
    >
      {icon ? <View className="w-7 items-center mr-3">{icon}</View> : null}

      <View className="flex-1">
        <Text className={`${labelColor} font-semibold text-[15px]`}>{label}</Text>
        {subtitle ? (
          <Text className="text-fog/40 text-xs mt-0.5">{subtitle}</Text>
        ) : null}
      </View>

      {right ?? (
        <View className="flex-row items-center gap-2">
          {typeof badge === 'number' && badge > 0 ? (
            <View className="bg-signal/15 rounded-full px-2 py-0.5">
              <Text className="text-signal text-[11px] font-bold">{badge}</Text>
            </View>
          ) : null}
          {value ? <Text className="text-fog/40 text-sm">{value}</Text> : null}
          {onPress ? (
            <ChevronRightIcon size={18} color="rgba(242,244,246,0.3)" />
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
}
