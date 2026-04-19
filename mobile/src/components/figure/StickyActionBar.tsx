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
  /**
   * Optional collection-bar slot. v1 leaves this null and the bar is the
   * eBay CTA only. v2 passes a CollectionBar element containing Own/Want
   * pills. Isolating the hook call inside the slotted component keeps the
   * Rules of Hooks clean — StickyActionBar itself doesn't touch Clerk or
   * the collection store.
   */
  collectionSlot?: React.ReactNode;
}

export function StickyActionBar({ ebayUrl, onEbayTapped, collectionSlot }: Props) {
  const insets = useSafeAreaInsets();
  const hasSlot = !!collectionSlot;

  if (!ebayUrl && !hasSlot) return null;

  const handleEbay = async () => {
    if (!ebayUrl) return;
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
        {collectionSlot}
        {ebayUrl && (
          <Pressable
            onPress={handleEbay}
            accessibilityRole="button"
            accessibilityLabel="Find on eBay"
            style={({ pressed }) => [
              styles.primary,
              !hasSlot && styles.primaryFull,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>Find on eBay →</Text>
          </Pressable>
        )}
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
    gap: spacing.xs,
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
  primaryFull: { flex: 1 },
  primaryText: { ...type.h2, color: colors.text, fontSize: 18 },
  pressed: { opacity: 0.85 },
});
