import React, { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { SeriesSibling } from '@/shared/types';

interface Props {
  siblings: SeriesSibling[];
  onSelect: (figureId: string) => void;
}

const CARD_W = 140;
const CARD_H = 200;
const PREFETCH_COUNT = 8;

export function SeriesContext({ siblings, onSelect }: Props) {
  // Spec §11: prefetch sibling thumbnails eagerly so the carousel paints
  // fully populated when scrolled into view. Image.prefetch warms the
  // platform image cache (SDWebImage on iOS, Fresco on Android) without
  // blocking anything; failures are non-fatal.
  useEffect(() => {
    const urls = siblings
      .slice(0, PREFETCH_COUNT)
      .map((s) => s.image_url)
      .filter((u): u is string => !!u);
    for (const url of urls) {
      Image.prefetch(url).catch(() => {});
    }
  }, [siblings]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Rest of series</Text>
      <FlatList
        data={siblings}
        horizontal
        keyExtractor={(s) => s.figure_id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        snapToInterval={CARD_W + spacing.xs}
        decelerationRate="fast"
        renderItem={({ item }) => <SiblingCard item={item} onPress={() => onSelect(item.figure_id)} />}
      />
    </View>
  );
}

function SiblingCard({ item, onPress }: { item: SeriesSibling; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.owned ? ', owned' : ''}${item.viewing ? ', currently viewing' : ''}`}
      style={({ pressed }) => [
        styles.card,
        item.viewing && styles.cardViewing,
        pressed && styles.pressed,
      ]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.img} contentFit="contain" />
      ) : (
        <View style={[styles.img, styles.imgEmpty]} />
      )}
      <Text numberOfLines={2} style={styles.name}>{item.name}</Text>
      {item.viewing && <Text style={styles.viewingLabel}>VIEWING</Text>}
      {item.owned && <View style={styles.ownedDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
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
    gap: spacing.xs,
  },
  cardViewing: {
    borderColor: colors.accentWarm,
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
  name: {
    ...type.meta,
    color: colors.text,
    fontSize: 12,
  },
  viewingLabel: {
    ...type.eyebrow,
    color: colors.accentWarm,
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
  },
  ownedDot: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  pressed: {
    opacity: 0.8,
  },
});
