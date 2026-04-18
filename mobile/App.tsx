import React, { useCallback, useState } from 'react';
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
import { FigureDetailScreen } from '@/screens/FigureDetailScreen';
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';

export default function App() {
  // Both font families fetched from Google Fonts via @expo-google-fonts.
  // The PostScript names used here must match those referenced in
  // src/theme/typography.ts.
  const [bebasReady] = useBebas({
    'BebasNeue-Regular': BebasNeue_400Regular,
  });
  const [interReady] = useInter({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-Bold': Inter_700Bold,
  });
  const fontsReady = bebasReady && interReady;

  const [stack, setStack] = useState<string[]>(['mattel-elite-11-rey-mysterio']);

  const push = useCallback((id: string) => setStack((s) => [...s, id]), []);
  const requireAuth = useCallback(() => {
    // Wire up to Clerk when auth lands. Phase 1 stub.
  }, []);

  if (!fontsReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const currentFigureId = stack[stack.length - 1];

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <FigureDetailScreen
          key={currentFigureId}
          figureId={currentFigureId}
          onNavigateFigure={push}
          onRequireAuth={requireAuth}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
