import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { COLORS } from '@/config/constants';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Root error boundary: a JS render crash shows a recoverable dark screen
 * instead of white-screening the app, and reaches Sentry when the build has
 * a DSN (EXPO_PUBLIC_SENTRY_DSN). Class component — hooks can't catch.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Always log — with a DSN set in a dev session the Sentry client exists
    // but is DISABLED (enabled: !__DEV__), and a capture-only branch would
    // swallow the stack entirely.
    console.error('Unhandled render error:', error, info.componentStack);
    if (Sentry.getClient()) {
      Sentry.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.void,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🫠</Text>
        <Text
          style={{
            color: COLORS.fog,
            fontSize: 17,
            fontWeight: '700',
            marginBottom: 6,
          }}
        >
          Something broke
        </Text>
        <Text
          style={{
            color: 'rgba(242,244,246,0.5)',
            fontSize: 13,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Try again, or close and reopen the app if it keeps happening. If it
          does, Settings → Report a Bug helps a lot.
        </Text>
        <TouchableOpacity
          onPress={() => this.setState({ error: null })}
          activeOpacity={0.85}
          style={{
            backgroundColor: COLORS.signal,
            borderRadius: 999,
            paddingHorizontal: 22,
            paddingVertical: 11,
          }}
        >
          <Text style={{ color: COLORS.fog, fontWeight: '700', fontSize: 14 }}>
            Try again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}
