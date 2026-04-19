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
}

const CHART_W = 320;
const CHART_H = 100;

// Per the v1 scope decision: no Pro tier exists, so we ship the full price
// history unlocked rather than manufacturing fake friction with a waitlist
// CTA. When Pro actually ships (with a price, feature set, and payment
// pipe), reintroduce a real gate here — not a placeholder.
export function MarketPanel({ price, ebayUrl }: Props) {
  const history = price.soldHistory ?? [];

  return (
    <View style={styles.wrap}>
      {history.length >= 2 ? (
        <View style={styles.chartCard}>
          <Text style={styles.eyebrow}>Recent sold trend</Text>
          <ChartPath history={history} />
        </View>
      ) : null}

      <Text style={[styles.eyebrow, styles.compsHeader]}>Recent eBay sales</Text>

      {history.length === 0 ? (
        <Text style={styles.emptyInline}>No recent sales</Text>
      ) : (
        history.map((c, i) => <CompRow key={`${c.sold_date}-${i}`} comp={c} ebayUrl={ebayUrl} />)
      )}
    </View>
  );
}

function ChartPath({ history }: { history: ApiSoldComp[] }) {
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

  // Per spec §10: "90-day price chart. Current $X, down Y percent from 90 days ago."
  const first = prices[0];
  const last = prices[prices.length - 1];
  const pct = first === 0 ? 0 : ((last - first) / first) * 100;
  const direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const label =
    direction === 'flat'
      ? `Price trend chart. Latest sale $${last.toFixed(0)} across ${prices.length} sales. Price flat.`
      : `Price trend chart. Latest sale $${last.toFixed(0)}, ${direction} ${Math.abs(pct).toFixed(1)} percent from the earliest of ${prices.length} tracked sales.`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={CHART_W} height={CHART_H}>
        <Path d={d} stroke={colors.accent} strokeWidth={2} fill="none" />
      </Svg>
    </View>
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
      accessibilityLabel={`${comp.title}. Sold for ${formatPriceDollars(comp.price)} on ${formatShortDate(comp.sold_date)}, condition ${comp.condition}${auction ? ', auction' : ''}.`}
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
    minHeight: 48,
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
  emptyInline: {
    ...type.meta,
    color: colors.muted,
  },
  pressed: {
    opacity: 0.7,
  },
});
