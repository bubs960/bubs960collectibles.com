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
  // Accessibility labels follow the spec §10 example exactly:
  //   "Median price, $24.50, from 17 sold comps"
  const compsSuffix =
    price.soldCount && price.soldCount > 0 ? `from ${price.soldCount} sold comps` : null;

  return (
    <View style={styles.grid}>
      <Cell
        label="Avg sold"
        a11yLabel="Average sold price"
        value={formatPriceDollars(price.avgSold)}
        sub={compsSuffix}
        highlight
      />
      <Cell
        label="Median"
        a11yLabel="Median price"
        value={formatPriceDollars(price.medianSold)}
        sub={compsSuffix}
      />
      <Cell
        label="Low"
        a11yLabel="Low price"
        value={formatPriceDollars(price.minSold)}
        sub={null}
      />
      <Cell
        label="High"
        a11yLabel="High price"
        value={formatPriceDollars(price.maxSold)}
        sub={null}
      />
    </View>
  );
}

function Cell({
  label,
  a11yLabel,
  value,
  sub,
  highlight,
}: {
  label: string;
  a11yLabel: string;
  value: string;
  sub: string | null;
  highlight?: boolean;
}) {
  const visibleSub = sub ? `${sub.replace('from ', '')}` : null;
  return (
    <View
      style={[styles.cell, highlight && styles.cellHighlight]}
      accessible
      accessibilityLabel={`${a11yLabel}, ${value}${sub ? `, ${sub}` : ''}`}
    >
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, highlight && styles.valueHighlight]}>{value}</Text>
      {visibleSub ? <Text style={styles.sub}>{visibleSub}</Text> : null}
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
