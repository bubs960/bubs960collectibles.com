import React, { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View, Platform, UIManager } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import type { LoreBandResult } from '@/shared/renderLoreBand';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  lore: LoreBandResult;
}

const COLLAPSED_LINES = 6;

export function LoreBand({ lore }: Props) {
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReduceMotion();

  if (!lore.visible) return null;

  const textContent = lore.segments.map((s, i) => (
    <Text
      key={i}
      style={s.type === 'emphasis' ? styles.emphasis : styles.body}
    >
      {s.value}
    </Text>
  ));

  const approxLong = lore.segments.reduce((n, s) => n + s.value.length, 0) > 220;

  const toggle = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.rule} />
      <View style={styles.content}>
        <Text
          numberOfLines={expanded ? undefined : COLLAPSED_LINES}
          style={styles.body}
          accessibilityLabel="Figure context"
        >
          {textContent}
        </Text>
        {approxLong && (
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse context' : 'Expand context'}
            accessibilityState={{ expanded }}
            hitSlop={12}
            style={styles.moreBtn}
          >
            <Text style={styles.more}>{expanded ? 'Read less ↑' : 'Read more ↓'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  rule: {
    width: 3,
    backgroundColor: colors.accentWarm,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  body: {
    ...type.body,
    color: colors.text,
  },
  emphasis: {
    ...type.body,
    color: colors.accentWarm,
  },
  moreBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  more: {
    ...type.meta,
    color: colors.accent,
  },
});
