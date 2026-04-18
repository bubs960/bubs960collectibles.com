import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useWantlist } from '@/hooks/useCollectionList';
import { collectionStore } from '@/collection/localStore';
import { formatPriceDollars } from '@/shared/formatters';
import { EmptyState, Row } from './VaultScreen';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Wantlist'>;

export function WantlistScreen() {
  const navigation = useNavigation<Nav>();
  const items = useWantlist();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Wantlist</Text>
        <Text style={styles.sub}>
          {items.length === 0
            ? 'Nothing here yet'
            : `${items.length} ${items.length === 1 ? 'figure' : 'figures'} you're hunting`}
        </Text>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="No wants tracked yet"
          body="Tap Want it on any figure to track what you're hunting for. Price alerts land with Pro."
          ctaLabel="Find a figure to want"
          onPress={() => navigation.navigate('Search')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.figure_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Row
              item={item}
              onPress={() => navigation.navigate('FigureDetail', { figureId: item.figure_id })}
              onRemove={() =>
                Alert.alert(`Remove ${item.name}?`, 'Remove from wantlist?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => void collectionStore.remove('wantlist', item.figure_id),
                  },
                ])
              }
              trailing={
                item.target_price ? (
                  <View style={styles.target}>
                    <Text style={styles.targetLabel}>TARGET</Text>
                    <Text style={styles.targetValue}>
                      {formatPriceDollars(item.target_price)}
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  title: { ...type.h1, color: colors.text },
  sub: { ...type.meta, color: colors.muted },
  list: { padding: spacing.md, gap: spacing.xs },
  target: {
    alignItems: 'flex-end',
    gap: 2,
    paddingLeft: spacing.sm,
  },
  targetLabel: {
    ...type.eyebrow,
    color: colors.dim,
    fontSize: 10,
  },
  targetValue: {
    ...type.heroPrice,
    fontSize: 18,
    color: colors.accentWarm,
  },
});
