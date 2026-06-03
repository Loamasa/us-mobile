import { Children, type ReactNode } from 'react';
import { View, Text } from 'react-native';

interface SettingsGroupProps {
  /** Optional uppercase section header above the card. */
  title?: string;
  children: ReactNode;
}

/**
 * Groups SettingRow children into a single glass card with hairline dividers
 * between them (prototype parity: `divide-y` grouped list). The divider is
 * indented to align under the row label, past the icon column.
 */
export default function SettingsGroup({ title, children }: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View className="mb-6">
      {title ? (
        <Text className="text-fog/50 text-xs uppercase tracking-widest mb-2 px-2">
          {title}
        </Text>
      ) : null}
      <View className="bg-glass border border-glass-border rounded-2xl overflow-hidden">
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View className="h-px bg-white/5 ml-14" /> : null}
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}
