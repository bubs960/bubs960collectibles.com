import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { clearCache } from '@/cache/persist';
import { resetOnboarding } from '@/onboarding/preferences';
import { FEATURES } from '@/config/features';
import { AccountSection } from './settings/AccountSection';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://figurepinner.com/privacy';
const TERMS_URL = 'https://figurepinner.com/terms';
const APP_VERSION = '0.1.0';

/**
 * v1 default: legal + version + dev-only onboarding reset.
 * When FEATURES.collectionSync is on, the AccountSection is rendered on
 * top — sign in / sign out / delete account. Keeping it behind the flag
 * means we don't need ClerkProvider in the tree during v1 builds.
 */
export function SettingsScreen() {
  const navigation = useNavigation<Nav>();

  const openExternal = (url: string) =>
    WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
    });

  const onResetOnboarding = async () => {
    await Promise.all([resetOnboarding(), clearCache(), AsyncStorage.clear().catch(() => {})]);
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings</Text>

        {FEATURES.collectionSync && <AccountSection />}

        <Section title="App">
          <Row label="Version" value={APP_VERSION} />
        </Section>

        <Section title="Legal">
          <LinkRow label="Privacy policy" onPress={() => openExternal(PRIVACY_URL)} />
          <LinkRow label="Terms of service" onPress={() => openExternal(TERMS_URL)} />
        </Section>

        {__DEV__ && (
          <Section title="Developer">
            <LinkRow label="Reset onboarding + clear local data" onPress={onResetOnboarding} />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg },
  screenTitle: { ...type.h1, color: colors.text },
  section: { gap: spacing.xs },
  sectionTitle: {
    ...type.eyebrow,
    color: colors.dim,
    paddingHorizontal: spacing.xs,
  },
  sectionBody: {
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { ...type.body, color: colors.text, fontSize: 15 },
  rowValue: { ...type.meta, color: colors.muted, flexShrink: 1 },
  chevron: { ...type.h2, color: colors.dim, fontSize: 20 },
});

export { styles as settingsStyles };
