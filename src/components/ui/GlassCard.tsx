import { View, type ViewProps } from 'react-native';

interface GlassCardProps extends ViewProps {
  className?: string;
}

export default function GlassCard({ className = '', children, ...props }: GlassCardProps) {
  return (
    <View
      className={`bg-glass border border-glass-border rounded-2xl p-4 ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
