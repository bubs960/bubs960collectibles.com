import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { RarityTier } from '@/shared/types';

export function RarityBadge({ tier }: { tier: RarityTier }) {
  if (!tier || tier === 'common') return null;
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel={`${tier} rarity`}
    >
      <Text style={styles.text}>{tier.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accentRare,
    backgroundColor: 'rgba(196, 168, 106, 0.12)',
  },
  text: {
    ...type.eyebrow,
    color: colors.accentRare,
  },
});
