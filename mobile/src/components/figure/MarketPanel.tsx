import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { formatPriceDollars, formatShortDate } from '@/shared/formatters';
import type { ApiPriceV1, ApiSoldComp } from '@/shared/types';

interface Props {
  price: ApiPriceV1;
  ebayUrl: string | null;
  isPro: boolean;
}

const CHART_W = 320;
const CHART_H = 100;
const FREE_COMP_LIMIT = 3;

export function MarketPanel({ price, ebayUrl, isPro }: Props) {
  const history = price.soldHistory ?? [];
  const visible = isPro ? history : history.slice(0, FREE_COMP_LIMIT);
  const capped = !isPro && history.length > FREE_COMP_LIMIT;

  return (
    <View style={styles.wrap}>
      {history.length >= 2 ? (
        <View style={styles.chartCard}>
          <Text style={styles.eyebrow}>Recent sold trend</Text>
          <ChartPath history={history} />
        </View>
      ) : null}

      <Text style={[styles.eyebrow, styles.compsHeader]}>Recent eBay sales</Text>

      {visible.length === 0 ? (
        <Text style={styles.emptyInline}>No recent sales</Text>
      ) : (
        visible.map((c, i) => <CompRow key={`${c.sold_date}-${i}`} comp={c} ebayUrl={ebayUrl} />)
      )}

      {capped && (
        <Pressable style={styles.unlock} accessibilityRole="button">
          <Text style={styles.unlockText}>Unlock full history →</Text>
        </Pressable>
      )}
    </View>
  );
}

function ChartPath({ history }: { history: ApiSoldComp[] }) {
  // Sort chronologically ascending for the path.
  const sorted = [...history].sort((a, b) => {
    const ta = new Date(a.sold_date).getTime();
    const tb = new Date(b.sold_date).getTime();
    return ta - tb;
  });
  const prices = sorted.map((p) => p.price).filter((n) => Number.isFinite(n));
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);
  const stepX = CHART_W / (prices.length - 1);
  const d = prices
    .map((p, i) => {
      const x = i * stepX;
      const y = CHART_H - ((p - min) / span) * (CHART_H - 8) - 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Path d={d} stroke={colors.accent} strokeWidth={2} fill="none" />
    </Svg>
  );
}

function CompRow({ comp, ebayUrl }: { comp: ApiSoldComp; ebayUrl: string | null }) {
  const onPress = ebayUrl
    ? () =>
        WebBrowser.openBrowserAsync(ebayUrl, {
          toolbarColor: colors.bg,
          controlsColor: colors.accent,
        })
    : undefined;
  const auction = comp.listing_format === 'auction';
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${comp.title}, ${formatPriceDollars(comp.price)}, ${comp.condition}, ${formatShortDate(comp.sold_date)}`}
      style={({ pressed }) => [styles.compRow, pressed && styles.pressed]}
    >
      <View style={styles.compLeft}>
        <Text style={styles.compDate}>{formatShortDate(comp.sold_date)}</Text>
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionText}>{comp.condition}</Text>
        </View>
        {auction && <Text style={styles.auctionTag}>Auction</Text>}
      </View>
      <Text style={styles.compPrice}>{formatPriceDollars(comp.price)}</Text>
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
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
  },
  compLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  compDate: {
    ...type.meta,
    color: colors.dim,
    fontSize: 12,
    minWidth: 52,
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
  auctionTag: {
    ...type.eyebrow,
    color: colors.accentWarm,
    fontSize: 10,
  },
  compPrice: {
    fontFamily: type.heroPrice.fontFamily,
    fontSize: 18,
    color: colors.success,
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
