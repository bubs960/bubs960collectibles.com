import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

export interface CtaItem {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function CtaCardList({ items }: { items: CtaItem[] }) {
  return (
    <View style={styles.wrap}>
      {items.map((it) => (
        <Pressable
          key={it.id}
          onPress={it.onPress}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}. ${it.subtitle}`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.title}>{it.title}</Text>
          <Text style={styles.sub}>{it.subtitle}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    ...type.h2,
    color: colors.text,
  },
  sub: {
    ...type.meta,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.85,
  },
});
