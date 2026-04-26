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
import { AuthProvider } from '@/auth/AuthProvider';
import { CollectionSyncDriver } from '@/auth/CollectionSyncDriver';
import { NotificationsDriver } from '@/notifications/NotificationsDriver';
import { FEATURES } from '@/config/features';
import { track, setAnalyticsSink } from '@/analytics/dispatch';
import { createHttpSink } from '@/analytics/httpSink';
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';
import appJson from './app.json';

// Wire the batched HTTP analytics sink at module load. The route is
// engineer-confirmed live in prod (POST /api/v1/analytics/event,
// 2026-04-26). v1 ships anonymous-by-device_id; the optional Bearer
// JWT hookup lands when v2 sign-in flows are real (see CHANGELOG
// Phase 11). Drop-on-failure: a downed worker silently drops events
// rather than building backpressure.
const ANALYTICS_API =
  process.env.EXPO_PUBLIC_FIGUREPINNER_API ?? 'https://figurepinner-api.bubs960.workers.dev';
const analyticsSink = createHttpSink({
  endpoint: ANALYTICS_API,
  appVersion: appJson.expo.version,
});
setAnalyticsSink(analyticsSink.track);

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
      <AuthProvider>
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <AppNavigator />
            {FEATURES.collectionSync && <CollectionSyncDriver />}
            {FEATURES.alerts && <NotificationsDriver />}
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </AuthProvider>
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
