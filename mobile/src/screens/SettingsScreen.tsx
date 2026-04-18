import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { collectionStore } from '@/collection/localStore';
import { clearCache } from '@/cache/persist';
import { resetOnboarding } from '@/onboarding/preferences';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PRIVACY_URL = 'https://figurepinner.com/privacy';
const TERMS_URL = 'https://figurepinner.com/terms';
const APP_VERSION = '0.1.0';

export function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [working, setWorking] = useState<null | 'signout' | 'delete' | 'clear'>(null);

  const resetToRoot = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FigureDetail', params: { figureId: 'mattel-elite-11-rey-mysterio' } }],
      }),
    );
  };

  const onSignOut = () => {
    Alert.alert('Sign out?', 'Your local vault and wantlist will stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setWorking('signout');
          try {
            await signOut();
          } finally {
            setWorking(null);
          }
        },
      },
    ]);
  };

  const onClearLocal = () => {
    Alert.alert(
      'Clear local data?',
      'This removes your vault, wantlist, cached figures, and preferences from this device. Your account (if signed in) stays intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setWorking('clear');
            try {
              await Promise.all([
                AsyncStorage.removeItem('fp:v1:collection:vault'),
                AsyncStorage.removeItem('fp:v1:collection:wantlist'),
                clearCache(),
                resetOnboarding(),
              ]);
              await collectionStore.reset();
            } finally {
              setWorking(null);
            }
            resetToRoot();
          },
        },
      ],
    );
  };

  const onDeleteAccount = () => {
    // Apple requires account deletion be as easy as account creation. Surface
    // it as a destructive action with a two-tap confirm; execution is
    // immediate (no grace period today — add one server-side once backend
    // exposes a cancellable soft-delete).
    Alert.alert(
      'Delete account?',
      "This permanently deletes your Figure Pinner account and all server-synced data. Your vault and wantlist on this device will also be cleared. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setWorking('delete');
            try {
              if (user) await user.delete();
              await Promise.all([
                AsyncStorage.removeItem('fp:v1:collection:vault'),
                AsyncStorage.removeItem('fp:v1:collection:wantlist'),
                clearCache(),
              ]);
              await collectionStore.reset();
            } catch (e) {
              Alert.alert('Could not delete account', (e as Error).message ?? 'Please try again.');
            } finally {
              setWorking(null);
            }
            resetToRoot();
          },
        },
      ],
    );
  };

  const openExternal = (url: string) =>
    WebBrowser.openBrowserAsync(url, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
    });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenTitle}>Settings</Text>

        <Section title="Account">
          {isSignedIn ? (
            <>
              {user?.primaryEmailAddress?.emailAddress ? (
                <Row label="Signed in as" value={user.primaryEmailAddress.emailAddress} />
              ) : null}
              <DestructiveButton
                label="Sign out"
                onPress={onSignOut}
                busy={working === 'signout'}
              />
              <DestructiveButton
                label="Delete account"
                onPress={onDeleteAccount}
                busy={working === 'delete'}
              />
            </>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('SignIn')}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
          )}
        </Section>

        <Section title="App">
          <DestructiveButton
            label="Clear local data"
            sub="Removes vault, wantlist, cache, and preferences from this device"
            onPress={onClearLocal}
            busy={working === 'clear'}
          />
          <Row label="Version" value={APP_VERSION} />
        </Section>

        <Section title="Legal">
          <LinkRow label="Privacy policy" onPress={() => openExternal(PRIVACY_URL)} />
          <LinkRow label="Terms of service" onPress={() => openExternal(TERMS_URL)} />
        </Section>

        {__DEV__ && (
          <Section title="Developer">
            <LinkRow
              label="Reset onboarding"
              onPress={async () => {
                await resetOnboarding();
                resetToRoot();
              }}
            />
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, styles.linkRow, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function DestructiveButton({
  label,
  sub,
  onPress,
  busy,
}: {
  label: string;
  sub?: string;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.destructive, pressed && { opacity: 0.7 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.destructiveText}>{label}</Text>
        {sub ? <Text style={styles.destructiveSub}>{sub}</Text> : null}
      </View>
      {busy ? <ActivityIndicator color={colors.danger} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg },
  screenTitle: {
    ...type.h1,
    color: colors.text,
  },
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
  linkRow: {},
  rowLabel: { ...type.body, color: colors.text, fontSize: 15 },
  rowValue: { ...type.meta, color: colors.muted, flexShrink: 1 },
  chevron: { ...type.h2, color: colors.dim, fontSize: 20 },
  primary: {
    margin: spacing.sm,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...type.h2, color: colors.text, fontSize: 18 },
  destructive: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  destructiveText: { ...type.body, color: colors.danger, fontSize: 15 },
  destructiveSub: { ...type.meta, color: colors.muted, marginTop: 2, fontSize: 12 },
});
