import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

interface Props {
  children: React.ReactNode;
  /** Called once per crash with the error + component stack. Wire to your
   *  analytics / crash reporter (Sentry, Bugsnag, etc.). */
  onError?: (err: Error, info: { componentStack: string }) => void;
}

interface State {
  error: Error | null;
}

/**
 * Root error boundary. Any React render/commit/effect error inside the tree
 * gets caught here and displayed as a dismissible fallback UI instead of a
 * white screen. Without this, a single thrown exception from a hook
 * (ActivityIndicator looks the same as "app is stuck") brings the whole app
 * down until the user force-quits.
 *
 * This only catches errors thrown during the React lifecycle — uncaught
 * promise rejections still need a global handler.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    this.props.onError?.(error, info);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return <Fallback error={this.state.error} onReset={this.reset} />;
  }
}

function Fallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <View style={styles.wrap} accessible accessibilityRole="alert">
      <Text style={styles.title}>Something broke</Text>
      <Text style={styles.body}>
        The app hit an error it couldn't recover from. Tap below to try again — if it keeps
        happening, please report the figure you were viewing.
      </Text>
      {__DEV__ && <Text style={styles.debug}>{error.message}</Text>}
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    ...type.h1,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    color: colors.muted,
    textAlign: 'center',
  },
  debug: {
    ...type.meta,
    color: colors.dim,
    fontFamily: 'Inter-Regular',
    marginTop: spacing.sm,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  btnText: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
});
