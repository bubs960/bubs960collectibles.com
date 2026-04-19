import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing } from '@/theme/tokens';
import { useReduceMotion } from '@/hooks/useReduceMotion';

/**
 * Skeleton placeholder rendered while the detail screen's first fetch is
 * in flight. Matches the real hero + value-strip + market-panel layout so
 * the transition to real content doesn't jump (spec §8.2 — "Skeleton
 * shimmer while loading"). Reduce-motion collapses the shimmer to a
 * static fill — still communicates "loading" without driving the worklet.
 */
export function FigureDetailSkeleton() {
  const reduceMotion = useReduceMotion();
  const shimmer = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = 0.5;
      return;
    }
    shimmer.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [reduceMotion, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <View style={styles.root} testID="figure-skeleton" accessibilityLabel="Loading figure">
      <Animated.View style={[styles.hero, shimmerStyle]} />

      <View style={styles.chipRow}>
        <Animated.View style={[styles.chip, shimmerStyle]} />
        <Animated.View style={[styles.chip, shimmerStyle]} />
      </View>
      <Animated.View style={[styles.title, shimmerStyle]} />
      <Animated.View style={[styles.subtitle, shimmerStyle]} />

      <View style={styles.valueGrid}>
        <Animated.View style={[styles.cell, shimmerStyle]} />
        <Animated.View style={[styles.cell, shimmerStyle]} />
        <Animated.View style={[styles.cell, shimmerStyle]} />
        <Animated.View style={[styles.cell, shimmerStyle]} />
      </View>

      <Animated.View style={[styles.chartCard, shimmerStyle]} />

      <Animated.View style={[styles.compRow, shimmerStyle]} />
      <Animated.View style={[styles.compRow, shimmerStyle]} />
      <Animated.View style={[styles.compRow, shimmerStyle]} />
    </View>
  );
}

const WIDTH = Dimensions.get('window').width;
const HERO_H = Math.round((WIDTH * 5) / 4);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: 120,
  },
  hero: {
    width: WIDTH,
    height: HERO_H,
    backgroundColor: colors.surface1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
  },
  chip: {
    width: 60,
    height: 18,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  title: {
    marginHorizontal: spacing.md,
    height: 36,
    width: '60%',
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  subtitle: {
    marginHorizontal: spacing.md,
    height: 14,
    width: '40%',
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
  },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 92,
    borderRadius: radii.md,
    backgroundColor: colors.surface1,
  },
  chartCard: {
    marginHorizontal: spacing.md,
    height: 140,
    borderRadius: radii.md,
    backgroundColor: colors.surface1,
  },
  compRow: {
    marginHorizontal: spacing.md,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
});
