import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import type { CollectionState, SocialStats } from '@/shared/types';

interface Props {
  collection: CollectionState | null;
  social: SocialStats | null;
}

export function CollectionPanel({ collection, social }: Props) {
  const completion = collection?.series_completion ?? null;
  if (!completion && !social) return null;

  return (
    <View style={styles.wrap}>
      {completion && <CompletionBar owned={completion.owned} total={completion.total} />}
      {social && (
        <View style={styles.socialRow}>
          <SocialCell label="Pins" value={social.pin_count} />
          <SocialCell label="Views · 30d" value={social.view_count_30d} />
        </View>
      )}
    </View>
  );
}

function CompletionBar({ owned, total }: { owned: number; total: number }) {
  const pct = total > 0 ? Math.min(1, owned / total) : 0;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Series completion: ${owned} of ${total} owned`}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.eyebrow}>Series completion</Text>
        <Text style={styles.meta}>{owned} / {total}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

function SocialCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.socialCell}>
      <Text style={styles.socialValue}>{value.toLocaleString('en-US')}</Text>
      <Text style={styles.eyebrow}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.dim,
  },
  meta: {
    ...type.meta,
    color: colors.text,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  socialCell: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  socialValue: {
    ...type.heroPrice,
    fontSize: 24,
    color: colors.text,
  },
});
