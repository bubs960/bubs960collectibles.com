import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

interface Props {
  ebayUrl: string | null;
  onEbayTapped?: () => void;
}

/**
 * v1 scope: read-only. The bottom bar is the eBay CTA.
 *
 * Own/Want collection toggles ship in v2 — they require Worker routes
 * (POST/DELETE /api/v1/vault + /api/v1/wantlist) that don't exist yet, and
 * shipping local-only collection state for an account-less app trains users
 * to expect persistence we can't deliver across devices.
 *
 * The component is intentionally minimal so v2 can re-add the collection
 * pills without breaking the eBay CTA's hit-target sizing or haptics.
 */
export function StickyActionBar({ ebayUrl, onEbayTapped }: Props) {
  const insets = useSafeAreaInsets();

  if (!ebayUrl) return null;

  const handleEbay = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onEbayTapped?.();
    await WebBrowser.openBrowserAsync(ebayUrl, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
      dismissButtonStyle: 'close',
    });
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.bar}>
        <Pressable
          onPress={handleEbay}
          accessibilityRole="button"
          accessibilityLabel="Find on eBay"
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Find on eBay →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  primary: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
