import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { formatPrice, formatTrendPct } from '@/shared/formatters';
import type { Pricing } from '@/shared/types';

interface Props {
  pricing: Pricing;
}

export function ValueStrip({ pricing }: Props) {
  const trendPositive = (pricing.trend_pct_90d ?? 0) > 0;
  const trendColor = pricing.trend_pct_90d == null
    ? colors.muted
    : trendPositive
      ? colors.success
      : colors.danger;
  const arrow = pricing.trend_pct_90d == null ? '' : trendPositive ? '▲ ' : '▼ ';

  return (
    <View style={styles.grid}>
      <Cell
        label="Median"
        value={formatPrice(pricing.median_cents)}
        sub={pricing.sold_count_90d != null ? `${pricing.sold_count_90d} sold 90d` : null}
      />
      <Cell
        label="Low"
        value={formatPrice(pricing.low_cents)}
        sub={null}
      />
      <Cell
        label="High"
        value={formatPrice(pricing.high_cents)}
        sub={null}
      />
      <Cell
        label="Trend 90d"
        value={`${arrow}${formatTrendPct(pricing.trend_pct_90d)}`}
        sub={null}
        valueColor={trendColor}
      />
    </View>
  );
}

function Cell({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string;
  value: string;
  sub: string | null;
  valueColor?: string;
}) {
  return (
    <View
      style={styles.cell}
      accessible
      accessibilityLabel={`${label}, ${value}${sub ? `, ${sub}` : ''}`}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 92,
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    ...type.eyebrow,
    color: colors.dim,
  },
  value: {
    ...type.heroPrice,
    color: colors.text,
  },
  sub: {
    ...type.meta,
    color: colors.muted,
    fontSize: 12,
  },
});
