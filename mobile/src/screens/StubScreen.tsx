import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Placeholder for screens that exist only to satisfy the Universal Link
 * routing table today (per mobile/native-templates/apple-app-site-association
 * in the Figure Pinner Dev workspace). Tapping a
 * https://figurepinner.com/vault link opens the app directly and lands here
 * until the real screen ships. Without these routes registered, the
 * NavigationContainer throws on deep-link arrival.
 */
export function StubScreen({ title, body }: { title: string; body: string }) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </SafeAreaView>
  );
}

export const VaultScreen = () => (
  <StubScreen title="Vault" body="Your owned figures will live here." />
);
export const WantlistScreen = () => (
  <StubScreen title="Wantlist" body="Figures you're hunting for will live here." />
);
export const SetsScreen = () => (
  <StubScreen title="Sets" body="Series completion tracking will live here." />
);
export const WaitlistScreen = () => (
  <StubScreen
    title="Pro waitlist"
    body="Pro isn't live yet. Leave your email and we'll ping you when it ships — you'll get the first 30 days free and locked-in early-access pricing."
  />
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  title: { ...type.h1, color: colors.text },
  body: { ...type.body, color: colors.muted },
});
