import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { formatPrice, formatRelativeDate } from '@/shared/formatters';
import type { Pricing, PricingComp } from '@/shared/types';

interface Props {
  pricing: Pricing;
  isPro: boolean;
}

const CHART_W = 320;
const CHART_H = 120;

export function MarketPanel({ pricing, isPro }: Props) {
  const series = pricing.series ?? [];
  const visibleComps = isPro ? pricing.recent_comps : pricing.recent_comps.slice(0, 3);
  const capped = !isPro && pricing.recent_comps.length > 3;

  return (
    <View style={styles.wrap}>
      <View style={styles.chartCard}>
        <Text style={styles.eyebrow}>90-day trend</Text>
        <ChartPath series={series} />
      </View>

      <Text style={[styles.eyebrow, styles.compsHeader]}>Recent sold</Text>

      {visibleComps.length === 0 ? (
        <Text style={styles.emptyInline}>No recent sales</Text>
      ) : (
        visibleComps.map((c) => <CompRow key={c.id} comp={c} />)
      )}

      {capped && (
        <Pressable style={styles.unlock} accessibilityRole="button">
          <Text style={styles.unlockText}>Unlock full history →</Text>
        </Pressable>
      )}
    </View>
  );
}

function ChartPath({ series }: { series: Pricing['series'] }) {
  if (series.length < 2) {
    return (
      <View style={[styles.chartPlaceholder, { width: CHART_W, height: CHART_H }]}>
        <Text style={styles.emptyInline}>Not enough data</Text>
      </View>
    );
  }
  const prices = series.map((p) => p.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);
  const stepX = CHART_W / (series.length - 1);
  const d = series
    .map((p, i) => {
      const x = i * stepX;
      const y = CHART_H - ((p.price_cents - min) / span) * (CHART_H - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Path d={d} stroke={colors.accent} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function CompRow({ comp }: { comp: PricingComp }) {
  const onPress = () =>
    WebBrowser.openBrowserAsync(comp.listing_url, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
    });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${comp.title}, ${formatPrice(comp.price_cents)}, ${formatRelativeDate(comp.sold_at)}`}
      style={({ pressed }) => [styles.compRow, pressed && styles.pressed]}
    >
      {comp.image_url ? (
        <Image source={{ uri: comp.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]} />
      )}
      <View style={styles.compMeta}>
        <Text numberOfLines={1} style={styles.compTitle}>
          {comp.title}
        </Text>
        <View style={styles.compSubRow}>
          {comp.condition ? (
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>{comp.condition}</Text>
            </View>
          ) : null}
          <Text style={styles.compSub}>{formatRelativeDate(comp.sold_at)}</Text>
        </View>
      </View>
      <Text style={styles.compPrice}>{formatPrice(comp.price_cents)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chartCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: spacing.xs,
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.dim,
    alignSelf: 'flex-start',
  },
  compsHeader: {
    marginTop: spacing.xs,
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  thumbEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  compMeta: {
    flex: 1,
    gap: 2,
  },
  compTitle: {
    ...type.body,
    fontSize: 14,
    color: colors.text,
  },
  compSubRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  conditionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  conditionText: {
    ...type.eyebrow,
    fontSize: 10,
    color: colors.muted,
  },
  compSub: {
    ...type.meta,
    color: colors.muted,
    fontSize: 12,
  },
  compPrice: {
    fontFamily: type.heroPrice.fontFamily,
    fontSize: 20,
    color: colors.text,
  },
  unlock: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  unlockText: {
    ...type.meta,
    color: colors.accent,
  },
  emptyInline: {
    ...type.meta,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.7,
  },
});
