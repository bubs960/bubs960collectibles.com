import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { clearCache } from '@/cache/persist';
import { resetOnboarding } from '@/onboarding/preferences';
import { FEATURES } from '@/config/features';
import { Section, Row, LinkRow } from './settings/primitives';
import { AccountSection } from './settings/AccountSection';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://figurepinner.com/privacy';
const TERMS_URL = 'https://figurepinner.com/terms';
const APP_VERSION = '0.1.0';

/**
 * v1 default: legal + version + dev-only onboarding reset.
 * When FEATURES.collectionSync is on, AccountSection renders on top (sign
 * in / sign out / delete account). Keeping that behind the flag means v1
 * never needs ClerkProvider higher in the tree.
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg },
  screenTitle: { ...type.h1, color: colors.text },
});
