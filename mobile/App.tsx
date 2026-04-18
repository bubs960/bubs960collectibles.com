import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text } from 'react-native';
import { FigureDetailScreen } from '@/screens/FigureDetailScreen';
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';

// Font files must be placed under assets/fonts/. Using require() so Metro
// bundles them. Replace with real .otf/.ttf files.
const FONT_MAP: Record<string, number | null> = {
  'BebasNeue-Regular': null,
  'Inter-Regular': null,
  'Inter-Medium': null,
  'Inter-Bold': null,
};

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [stack, setStack] = useState<string[]>(['demo-figure-id']);

  useEffect(() => {
    // Guard against missing assets during scaffold. Real builds should fail
    // loudly if fonts are missing — remove this filter once assets land.
    const toLoad = Object.entries(FONT_MAP).reduce<Record<string, number>>((acc, [k, v]) => {
      if (v != null) acc[k] = v;
      return acc;
    }, {});
    Font.loadAsync(toLoad)
      .catch(() => {})
      .finally(() => setFontsReady(true));
  }, []);

  const push = useCallback((id: string) => setStack((s) => [...s, id]), []);
  const requireAuth = useCallback(() => {
    // Wire up to Clerk / auth modal. Phase 1 stub.
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
