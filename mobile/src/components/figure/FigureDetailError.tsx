import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { FigureFetchError } from '@/api/figureApi';
import type { RootStackParamList } from '@/navigation/types';

interface Props {
  error: Error | null;
  onRetry: () => void | Promise<void>;
  retrying?: boolean;
}

/**
 * Error fallback for FigureDetailScreen when the first fetch fails and
 * nothing cached is available. Adapts to the error type: 404 (ID drift —
 * see src/shared/figureId.ts for the three-pattern backstory) gets a
 * "Search for this figure" soft-recovery CTA that routes to Search;
 * network / server errors get Try again + Go back.
 */
export function FigureDetailError({ error, onRetry, retrying }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const canGoBack = navigation.canGoBack();
  const { title, body, kind } = messageFor(error);
  const is404 = kind === 'not_found';

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.content} accessible accessibilityRole="alert">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>

        <View style={styles.actions}>
          {is404 ? (
            <Pressable
              onPress={() => navigation.navigate('Search')}
              accessibilityRole="button"
              accessibilityLabel="Search for this figure"
              style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryText}>Search for it</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onRetry}
              disabled={retrying}
              accessibilityRole="button"
              accessibilityLabel="Try again"
              style={({ pressed }) => [
                styles.primary,
                retrying && { opacity: 0.5 },
                pressed && { opacity: 0.85 },
              ]}
            >
              {retrying ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryText}>Try again</Text>
              )}
            </Pressable>
          )}

          {canGoBack && (
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.secondaryText}>Go back</Text>
            </Pressable>
          )}
        </View>

        {/* Dev-only diagnostic so a reviewer can paste the error in a bug
            report. Released builds get a clean UI. */}
        {__DEV__ && error ? (
          <Text style={styles.debug} selectable>
            [{kind}] {error.message}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

type ErrorKind = 'not_found' | 'server' | 'network' | 'unknown';

function messageFor(error: Error | null): { title: string; body: string; kind: ErrorKind } {
  if (error instanceof FigureFetchError) {
    if (error.status === 404) {
      return {
        kind: 'not_found',
        title: "We might know this figure by another name",
        body:
          "We couldn't match that figure id exactly, but it may exist in our database under a sibling id. Tap Search to try with a different query.",
      };
    }
    return {
      kind: 'server',
      title: "Couldn't load this figure",
      body: 'The server took too long or returned an error. Try again in a moment.',
    };
  }
  // fetch() throws TypeError for network-level failures in both browsers and RN.
  if (error && /network|failed to fetch/i.test(error.message)) {
    return {
      kind: 'network',
      title: "You're offline",
      body: "We'll pick up where we left off as soon as the connection comes back.",
    };
  }
  return {
    kind: 'unknown',
    title: "Couldn't load this figure",
    body: 'Something went wrong. Tap retry to give it another shot.',
  };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  primary: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.h2, color: colors.text, fontSize: 18 },
  secondary: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...type.meta, color: colors.text, fontSize: 15 },
  debug: {
    ...type.meta,
    color: colors.dim,
    fontSize: 11,
    marginTop: spacing.md,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
});
