import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { cleanFigureName } from '@/shared/cleanFigureName';
import type { ApiFigureV1, RarityTier } from '@/shared/types';
import { RarityBadge } from './RarityBadge';
import { ZoomableImage } from './ZoomableImage';

interface Props {
  figure: ApiFigureV1;
  rarity?: RarityTier;
  /** Fires whenever the hero image enters / leaves its zoomed state. Parent
   *  uses this to disable the outer ScrollView while zoomed (spec §14). */
  onZoomChange?: (zoomed: boolean) => void;
  /** Fires at the end of a zoom gesture with the peak scale reached. */
  onZoomed?: (scale: number) => void;
}

const WIDTH = Dimensions.get('window').width;
const HEIGHT = Math.round((WIDTH * 5) / 4); // 4:5 per spec §8.2

export function Hero({ figure, rarity = null, onZoomChange, onZoomed }: Props) {
  const name = cleanFigureName(figure.name);
  const subtitleParts = [figure.line, figure.series ? `Series ${figure.series}` : null, figure.year]
    .filter(Boolean)
    .map((v) => String(v));
  const subtitle = subtitleParts.join(' · ');
  const chips = [figure.brand, prettifyGenre(figure.genre)].filter(Boolean) as string[];

  const label = `Photo of ${name} ${figure.line} Series ${figure.series} action figure`;

  const rarityOverlay =
    rarity && rarity !== 'common' ? (
      <View style={styles.rarity} pointerEvents="none">
        <RarityBadge tier={rarity} />
      </View>
    ) : null;
  const glow = <View style={styles.glow} pointerEvents="none" />;

  return (
    <View>
      {figure.canonical_image_url ? (
        <ZoomableImage
          uri={figure.canonical_image_url}
          width={WIDTH}
          height={HEIGHT}
          accessibilityLabel={label}
          underlay={glow}
          overlay={rarityOverlay}
          wrapStyle={styles.imageWrap}
          onZoomChange={onZoomChange}
          onZoomed={onZoomed}
        />
      ) : (
        <View style={[styles.imageWrap, { width: WIDTH, height: HEIGHT }]}>
          {glow}
          <Text style={styles.placeholderText}>No image</Text>
          {rarityOverlay}
        </View>
      )}

      <View style={styles.meta}>
        {chips.length > 0 && (
          <View style={styles.chipRow}>
            {chips.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.name} accessibilityRole="header">
          {name.toUpperCase()}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function prettifyGenre(genre: string): string {
  return genre.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  imageWrap: {
    backgroundColor: colors.surface0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    top: '25%',
    left: '15%',
    right: '15%',
    bottom: '25%',
    backgroundColor: colors.accent,
    opacity: 0.18,
    borderRadius: 9999,
  },
  placeholderText: {
    ...type.eyebrow,
    color: colors.dim,
  },
  rarity: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  meta: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  chipText: {
    ...type.eyebrow,
    color: colors.muted,
  },
  name: {
    ...type.h1,
    color: colors.text,
    letterSpacing: 1.2,
  },
  subtitle: {
    ...type.meta,
    color: colors.muted,
  },
});
