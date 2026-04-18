import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { ApiFigureV1 } from '@/shared/types';

// Mirrors the web figure page's right-column "Details" card.
export function DetailsCard({ figure }: { figure: ApiFigureV1 }) {
  const rows: { label: string; value: string }[] = [];
  if (figure.brand) rows.push({ label: 'Brand', value: figure.brand });
  if (figure.line) rows.push({ label: 'Line', value: figure.line });
  if (figure.series) rows.push({ label: 'Series', value: figure.series });
  if (figure.genre) rows.push({ label: 'Genre', value: prettify(figure.genre) });
  if (figure.pack_size && Number(figure.pack_size) > 1) {
    rows.push({ label: 'Pack', value: `${figure.pack_size}-pack` });
  }
  if (figure.exclusive_to && figure.exclusive_to !== 'None') {
    rows.push({ label: 'Exclusive', value: figure.exclusive_to });
  }
  if (figure.scale) rows.push({ label: 'Scale', value: figure.scale });
  if (figure.year != null) rows.push({ label: 'Year', value: String(figure.year) });

  if (rows.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Details</Text>
      <View style={styles.rows}>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value}>{r.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function prettify(s: string): string {
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.dim,
  },
  rows: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  label: {
    ...type.meta,
    color: colors.dim,
  },
  value: {
    ...type.meta,
    color: colors.text,
    textAlign: 'right',
    flexShrink: 1,
  },
});
