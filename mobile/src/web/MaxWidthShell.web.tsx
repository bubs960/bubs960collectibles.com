import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

/**
 * Caps the app to a 600px-wide centered column on desktop. On mobile-
 * width screens (≤600px CSS px) renders edge-to-edge so the PWA on a
 * phone browser still feels right.
 *
 * Why 600 specifically:
 *   - Wide enough that long figure names + market panel rows don't
 *     wrap awkwardly.
 *   - Narrow enough that the portrait-phone-shaped UI still reads
 *     as a single column rather than a too-wide chat-app layout.
 *   - Matches the rough widthBreakpoint where Tailwind / iOS Human
 *     Interface Guidelines transition from "phone-class" to
 *     "tablet-class" layouts.
 *
 * Outside the column is a flat background — no two-pane content
 * fill on either side (yet). A future "desktop-redesign" pass could
 * add a side gallery or market-context panel.
 */
export function MaxWidthShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.outer}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    backgroundColor: colors.bg,
    // Soft shadow on either side hints at the "phone in the middle
    // of a desktop window" gestalt without going overboard.
    // RN-Web emits this as a box-shadow which webview2 / wkwebview /
    // webkit2gtk all render fine.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
