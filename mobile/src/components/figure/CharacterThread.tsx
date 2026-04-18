import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { CharacterThreadEntry } from '@/shared/types';

interface Props {
  entries: CharacterThreadEntry[];
  onSelect: (figureId: string) => void;
}

const CARD_W = 180;
const CARD_H = 220;

export function CharacterThread({ entries, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Character thread</Text>
      <FlatList
        data={entries}
        horizontal
        keyExtractor={(e) => e.figure_id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_W + spacing.xs}
        decelerationRate="fast"
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.figure_id)}
            accessibilityRole="button"
            accessibilityLabel={`${item.line_name}${item.year ? `, ${item.year}` : ''}`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.img} resizeMode="contain" />
            ) : (
              <View style={[styles.img, styles.imgEmpty]} />
            )}
            {item.year ? <Text style={styles.year}>{item.year}</Text> : null}
            <Text numberOfLines={2} style={styles.line}>{item.line_name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  header: {
    ...type.h2,
    color: colors.text,
    paddingHorizontal: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    gap: 4,
  },
  img: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  imgEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  year: {
    ...type.heroPrice,
    fontSize: 22,
    color: colors.accentWarm,
  },
  line: {
    ...type.meta,
    color: colors.text,
    fontSize: 12,
  },
  pressed: { opacity: 0.8 },
});
