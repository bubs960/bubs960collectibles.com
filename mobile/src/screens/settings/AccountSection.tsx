import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth, useUser, useClerk } from '@clerk/clerk-expo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { collectionStore } from '@/collection/localStore';
import { clearCache } from '@/cache/persist';
import { Row, Section } from './primitives';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Only mounted when FEATURES.collectionSync is on (SettingsScreen guards
 * the render). Safe to call useAuth / useUser / useClerk here — they
 * resolve against the ClerkProvider that AuthProvider mounts when the
 * same flag is on.
 */
export function AccountSection() {
  const navigation = useNavigation<Nav>();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [working, setWorking] = useState<null | 'signout' | 'delete'>(null);

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

  const onDeleteAccount = () => {
    // Apple requires account deletion be as easy to reach as account
    // creation. Two-tap destructive confirm, immediate execution.
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

  return (
    <Section title="Account">
      {isSignedIn ? (
        <>
          {user?.primaryEmailAddress?.emailAddress ? (
            <Row label="Signed in as" value={user.primaryEmailAddress.emailAddress} />
          ) : null}
          <DestructiveButton label="Sign out" onPress={onSignOut} busy={working === 'signout'} />
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
  );
}

function DestructiveButton({
  label,
  onPress,
  busy,
}: {
  label: string;
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
      <Text style={styles.destructiveText}>{label}</Text>
      {busy ? <ActivityIndicator color={colors.danger} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
    padding: spacing.md,
    minHeight: 52,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  destructiveText: { ...type.body, color: colors.danger, fontSize: 15 },
});
