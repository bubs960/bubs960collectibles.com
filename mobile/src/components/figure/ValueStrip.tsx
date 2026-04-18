import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { formatPriceDollars } from '@/shared/formatters';
import type { ApiPriceV1 } from '@/shared/types';

interface Props {
  price: ApiPriceV1;
}

export function ValueStrip({ price }: Props) {
  return (
    <View style={styles.grid}>
      <Cell
        label="Avg sold"
        value={formatPriceDollars(price.avgSold)}
        sub={price.soldCount ? `${price.soldCount} comps` : null}
        highlight
      />
      <Cell label="Median" value={formatPriceDollars(price.medianSold)} sub={null} />
      <Cell label="Low" value={formatPriceDollars(price.minSold)} sub={null} />
      <Cell label="High" value={formatPriceDollars(price.maxSold)} sub={null} />
    </View>
  );
}

function Cell({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string | null;
  highlight?: boolean;
}) {
  return (
    <View
      style={[styles.cell, highlight && styles.cellHighlight]}
      accessible
      accessibilityLabel={`${label}, ${value}${sub ? `, ${sub}` : ''}`}
    >
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
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
  cellHighlight: {
    borderColor: colors.accent,
  },
  label: {
    ...type.eyebrow,
    color: colors.dim,
  },
  value: {
    ...type.heroPrice,
    color: colors.text,
  },
  valueHighlight: {
    color: colors.success,
  },
  sub: {
    ...type.meta,
    color: colors.muted,
    fontSize: 12,
  },
});
