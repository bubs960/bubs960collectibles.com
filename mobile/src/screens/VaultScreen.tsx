import React from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useVault } from '@/hooks/useCollectionList';
import { collectionStore, type CollectionItem } from '@/collection/localStore';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Vault'>;

export function VaultScreen() {
  const navigation = useNavigation<Nav>();
  const items = useVault();

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Vault</Text>
        <Text style={styles.sub}>
          {items.length === 0 ? 'Nothing here yet' : `${items.length} ${items.length === 1 ? 'figure' : 'figures'}`}
        </Text>
      </View>

      {items.length === 0 ? (
        <EmptyState
          title="Your vault is empty"
          body="Tap Own it on any figure to track what's in your collection. Everything lives on this device until you sign in."
          ctaLabel="Find a figure to add"
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
              onRemove={() => confirmRemove(item, 'vault')}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function confirmRemove(item: CollectionItem, kind: 'vault' | 'wantlist') {
  Alert.alert(
    `Remove ${item.name}?`,
    kind === 'vault' ? 'This figure will no longer be tracked as owned.' : 'This figure will be removed from your wantlist.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void collectionStore.remove(kind, item.figure_id),
      },
    ],
  );
}

export function Row({
  item,
  onPress,
  onRemove,
  trailing,
}: {
  item: CollectionItem;
  onPress: () => void;
  onRemove: () => void;
  trailing?: React.ReactNode;
}) {
  const sub = [item.line, item.series ? `Series ${item.series}` : null, item.brand]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onRemove}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${sub}. Long-press to remove.`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} resizeMode="contain" />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]} />
      )}
      <View style={styles.meta}>
        <Text numberOfLines={2} style={styles.name}>
          {item.name}
        </Text>
        {sub ? (
          <Text numberOfLines={1} style={styles.sub}>
            {sub}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}

export function EmptyState({
  title,
  body,
  ctaLabel,
  onPress,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.85 }]}
      >
        <Text style={styles.emptyBtnText}>{ctaLabel}</Text>
      </Pressable>
    </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 72,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  thumbEmpty: { borderWidth: 1, borderColor: colors.border },
  meta: { flex: 1, gap: 2 },
  name: { ...type.body, color: colors.text, fontSize: 15 },
  empty: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyTitle: { ...type.h1, color: colors.text, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.muted, textAlign: 'center' },
  emptyBtn: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  emptyBtnText: { ...type.h2, color: colors.text, fontSize: 18 },
});
