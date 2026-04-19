import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useCollection } from '@/hooks/useCollection';
import { track } from '@/analytics/dispatch';
import type { ApiFigureV1 } from '@/shared/types';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  figure: ApiFigureV1;
}

/**
 * The Own/Want pill group inside the sticky action bar — mounted only when
 * FEATURES.collectionSync is true. Uses useAuth + useCollection, both of
 * which require ClerkProvider + the local collection store. Parent keeps
 * this component conditional so the Rules of Hooks stay clean.
 */
export function CollectionBar({ figure }: Props) {
  const { isSignedIn } = useAuth();
  const navigation = useNavigation<Nav>();
  const collection = useCollection(() => figure);

  const handleToggle = (next: boolean, kind: 'owned' | 'wanted') => {
    if (!isSignedIn) {
      Haptics.selectionAsync();
      track('auth_required_shown', { figure_id: figure.figure_id, trigger: kind });
      navigation.navigate('SignIn');
      return;
    }
    Haptics.impactAsync(
      next ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Soft,
    );
    const event = kind === 'owned' ? 'figure_own_toggled' : 'figure_want_toggled';
    track(event, { figure_id: figure.figure_id, next_state: next });
    if (kind === 'owned') void collection.toggleOwned();
    else void collection.toggleWanted();
  };

  return (
    <View style={styles.group}>
      <Pill
        active={collection.owned}
        label={collection.owned ? 'Owned' : 'Own it'}
        accessibilityLabel={collection.owned ? 'Owned' : 'Mark as owned'}
        onPress={() => handleToggle(!collection.owned, 'owned')}
      />
      <Pill
        active={collection.wanted}
        label={collection.wanted ? 'Wanted' : 'Want it'}
        accessibilityLabel={collection.wanted ? 'Wanted' : 'Mark as wanted'}
        onPress={() => handleToggle(!collection.wanted, 'wanted')}
      />
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
  group: {
    flexDirection: 'row',
    gap: spacing.xs,
    flex: 1,
  },
  pill: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 6,
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
  pillText: { ...type.meta, color: colors.text },
  pillTextActive: { color: colors.accent },
  pressed: { opacity: 0.85 },
});
