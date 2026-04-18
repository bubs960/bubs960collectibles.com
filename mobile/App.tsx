import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
import { ClerkProvider } from '@clerk/clerk-expo';
import { useFonts as useBebas, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { AppNavigator } from '@/navigation/AppNavigator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { track } from '@/analytics/dispatch';
import { tokenCache } from '@/auth/tokenCache';
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export default function App() {
  // Google-fonts-hosted assets. The PostScript names here must match
  // src/theme/typography.ts references.
  const [bebasReady] = useBebas({
    'BebasNeue-Regular': BebasNeue_400Regular,
  });
  const [interReady] = useInter({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });
  const fontsReady = bebasReady && interReady;

  if (!fontsReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary
      onError={(err, info) =>
        track('app_error', {
          message: err.message,
          component_stack: info.componentStack,
        })
      }
    >
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...type.meta,
    color: colors.muted,
  },
});
