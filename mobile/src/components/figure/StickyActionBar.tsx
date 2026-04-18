import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

interface Props {
  signedIn: boolean;
  owned: boolean;
  wanted: boolean;
  ebayUrl: string | null;
  onToggleOwned: () => void;
  onToggleWanted: () => void;
  onRequireAuth: () => void;
  onEbayTapped?: () => void;
}

export function StickyActionBar(props: Props) {
  const insets = useSafeAreaInsets();
  const { signedIn, owned, wanted, ebayUrl } = props;
  const hasPricingContext = ebayUrl !== null;
  const showCollectionButtons = hasPricingContext || signedIn;

  const handleToggle = (next: boolean, kind: 'owned' | 'wanted') => {
    if (!signedIn) {
      Haptics.selectionAsync();
      props.onRequireAuth();
      return;
    }
    Haptics.impactAsync(
      next ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft,
    );
    if (kind === 'owned') props.onToggleOwned();
    else props.onToggleWanted();
  };

  const handleEbay = async () => {
    if (!ebayUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await WebBrowser.openBrowserAsync(ebayUrl, {
      toolbarColor: colors.bg,
      controlsColor: colors.accent,
      dismissButtonStyle: 'close',
    });
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.bar}>
        {showCollectionButtons && (
          <View style={styles.collectionGroup}>
            <Pill
              active={owned}
              label={owned ? 'Owned' : 'Own it'}
              accessibilityLabel={owned ? 'Owned' : 'Mark as owned'}
              onPress={() => handleToggle(!owned, 'owned')}
            />
            <Pill
              active={wanted}
              label={wanted ? 'Wanted' : 'Want it'}
              accessibilityLabel={wanted ? 'Wanted' : 'Mark as wanted'}
              onPress={() => handleToggle(!wanted, 'wanted')}
            />
          </View>
        )}
        {ebayUrl && (
          <Pressable
            onPress={handleEbay}
            accessibilityRole="button"
            accessibilityLabel="Find on eBay"
            style={({ pressed }) => [
              styles.primary,
              !showCollectionButtons && styles.primaryFull,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>Find on eBay →</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Pill({
  active,
  label,
  accessibilityLabel,
  onPress,
}: {
  active: boolean;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    gap: spacing.xs,
  },
  collectionGroup: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface2,
  },
  pillText: {
    ...type.meta,
    color: colors.text,
  },
  pillTextActive: {
    color: colors.accent,
  },
  primary: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  primaryFull: {
    flex: 1,
  },
  primaryText: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
  pressed: {
    opacity: 0.85,
  },
});
