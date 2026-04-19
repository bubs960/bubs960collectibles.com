import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { CharacterThreadEntry } from '@/shared/types';

interface Props {
  entries: CharacterThreadEntry[];
  onSelect: (figureId: string) => void;
}

const CARD_W = 180;
const CARD_H = 220;
const PREFETCH_COUNT = 6;

export function CharacterThread({ entries, onSelect }: Props) {
  // Match SeriesContext: warm the platform image cache for the first N
  // thumbs so the carousel paints fully populated when scrolled into view.
  useEffect(() => {
    const urls = entries
      .slice(0, PREFETCH_COUNT)
      .map((e) => e.image_url)
      .filter((u): u is string => !!u);
    for (const url of urls) {
      Image.prefetch(url);
    }
  }, [entries]);

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
              <Image source={{ uri: item.image_url }} style={styles.img} contentFit="contain" />
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
