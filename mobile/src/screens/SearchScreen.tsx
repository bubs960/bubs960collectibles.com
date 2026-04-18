import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useSearch } from '@/hooks/useSearch';
import type { SearchResult } from '@/api/searchApi';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Search'>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const { results, loading, error } = useSearch(query);

  const onSelect = (figureId: string) => {
    Keyboard.dismiss();
    navigation.navigate('FigureDetail', { figureId });
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search figures, characters, lines"
          placeholderTextColor={colors.dim}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search"
          autoFocus
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clear}>×</Text>
          </Pressable>
        )}
      </View>

      {loading && (
        <View style={styles.state}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {error && !loading && (
        <View style={styles.state}>
          <Text style={styles.stateText}>Search failed. Try again.</Text>
        </View>
      )}

      {!loading && !error && query.trim().length < 2 && (
        <View style={styles.state}>
          <Text style={styles.stateText}>Type at least two characters to search.</Text>
        </View>
      )}

      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <View style={styles.state}>
          <Text style={styles.stateText}>No figures match that search.</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(r) => r.figure_id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ResultRow item={item} onPress={() => onSelect(item.figure_id)} />}
      />
    </SafeAreaView>
  );
}

function ResultRow({ item, onPress }: { item: SearchResult; onPress: () => void }) {
  const sub = [item.line, item.series ? `Series ${item.series}` : null, item.brand]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${sub}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumb} contentFit="contain" />
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    paddingVertical: 4,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
  clear: {
    ...type.h2,
    color: colors.muted,
    fontSize: 22,
    paddingHorizontal: spacing.xs,
  },
  state: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  stateText: {
    ...type.meta,
    color: colors.muted,
  },
  list: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    backgroundColor: colors.surface1,
  },
  thumbEmpty: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...type.body,
    color: colors.text,
    fontSize: 15,
  },
  sub: {
    ...type.meta,
    color: colors.muted,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
});
