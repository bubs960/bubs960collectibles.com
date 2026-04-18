import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSignIn } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

export function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!isLoaded || submitting) return;
    setErr(null);
    setSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        navigation.goBack();
      } else {
        setErr('Additional verification required. Complete sign-in on the web.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-in failed';
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.sub}>To pin figures, track what you own, and get price alerts.</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.dim}
            secureTextEntry
            autoComplete="password"
            value={password}
            onChangeText={setPassword}
            accessibilityLabel="Password"
          />

          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={submitting || !email || !password}
            style={({ pressed }) => [
              styles.primary,
              (submitting || !email || !password) && styles.primaryDisabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryText}>Sign in</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.dismiss}>Not now</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...type.h1,
    color: colors.text,
  },
  sub: {
    ...type.body,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  input: {
    ...type.body,
    color: colors.text,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  err: {
    ...type.meta,
    color: colors.danger,
  },
  primary: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  primaryDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
  dismiss: {
    ...type.meta,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
});
