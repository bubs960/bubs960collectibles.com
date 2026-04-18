import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useWantlist } from '@/hooks/useCollectionList';
import {
  ensurePermission,
  getPermissionStatus,
  registerForPushToken,
  type PermissionStatus,
} from '@/notifications/setup';
import { formatPriceDollars } from '@/shared/formatters';
import type { CollectionItem } from '@/collection/localStore';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Alerts'>;

export function AlertsScreen() {
  const navigation = useNavigation<Nav>();
  const wantlist = useWantlist();
  const withTarget = wantlist.filter((i) => typeof i.target_price === 'number' && i.target_price! > 0);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    void getPermissionStatus().then(setPermission);
  }, []);

  const enable = async () => {
    setRegistering(true);
    try {
      const ok = await ensurePermission();
      setPermission(ok ? 'granted' : 'denied');
      if (ok) await registerForPushToken();
    } finally {
      setRegistering(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Price alerts</Text>
        <Text style={styles.sub}>Get pinged when a wantlist figure drops below your target.</Text>
      </View>

      <PermissionBanner
        status={permission}
        working={registering}
        onEnable={enable}
      />

      {withTarget.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No targets set yet</Text>
          <Text style={styles.emptyBody}>
            Set a target price on a wantlist figure to start watching. Alerts require Pro once it
            ships — we'll let you opt in at that point.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Wantlist')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.primaryText}>Open wantlist</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={withTarget}
          keyExtractor={(i) => i.figure_id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <AlertRow item={item} navigate={navigation.navigate} />}
        />
      )}
    </SafeAreaView>
  );
}

function PermissionBanner({
  status,
  working,
  onEnable,
}: {
  status: PermissionStatus;
  working: boolean;
  onEnable: () => void;
}) {
  if (status === 'granted') return null;
  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>
          {status === 'denied' ? 'Notifications are off' : 'Turn on notifications'}
        </Text>
        <Text style={styles.bannerBody}>
          {status === 'denied'
            ? 'Enable alerts in iOS / Android settings so we can ping you on price drops.'
            : "We'll only notify you when a figure on your wantlist crosses your target."}
        </Text>
      </View>
      <Pressable
        onPress={onEnable}
        disabled={working || status === 'denied'}
        accessibilityRole="button"
        accessibilityLabel="Enable notifications"
        style={({ pressed }) => [
          styles.bannerBtn,
          (working || status === 'denied') && { opacity: 0.5 },
          pressed && { opacity: 0.8 },
        ]}
      >
        {working ? <ActivityIndicator color={colors.text} /> : <Text style={styles.bannerBtnText}>Enable</Text>}
      </Pressable>
    </View>
  );
}

function AlertRow({
  item,
  navigate,
}: {
  item: CollectionItem;
  navigate: Nav['navigate'];
}) {
  const sub = [item.line, item.series ? `Series ${item.series}` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() => navigate('FigureDetail', { figureId: item.figure_id })}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, target ${formatPriceDollars(item.target_price ?? 0)}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={styles.rowName}>
          {item.name}
        </Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.target}>
        <Text style={styles.targetLabel}>TARGET</Text>
        <Text style={styles.targetValue}>{formatPriceDollars(item.target_price ?? 0)}</Text>
      </View>
    </Pressable>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  bannerTitle: { ...type.body, color: colors.text, fontSize: 15 },
  bannerBody: { ...type.meta, color: colors.muted, marginTop: 2 },
  bannerBtn: {
    minHeight: 44,
    minWidth: 80,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBtnText: { ...type.eyebrow, color: colors.text },
  list: { padding: spacing.md, gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    minHeight: 64,
    backgroundColor: colors.surface0,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowName: { ...type.body, color: colors.text, fontSize: 15 },
  rowSub: { ...type.meta, color: colors.muted, fontSize: 12 },
  target: { alignItems: 'flex-end', gap: 2 },
  targetLabel: { ...type.eyebrow, color: colors.dim, fontSize: 10 },
  targetValue: { ...type.heroPrice, fontSize: 18, color: colors.accentWarm },
  empty: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyTitle: { ...type.h1, color: colors.text, textAlign: 'center' },
  emptyBody: { ...type.body, color: colors.muted, textAlign: 'center' },
  primary: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: { ...type.h2, color: colors.text, fontSize: 18 },
});
