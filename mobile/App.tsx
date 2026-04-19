import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
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
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';

// v1 scope: no auth UI surface — Clerk wiring lives under src/auth/ ready to
// re-enable in v2 when vault/wantlist sync ships. ClerkProvider is removed
// from the tree so no signed-in / signed-out distinction matters here.

export default function App() {
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
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
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
