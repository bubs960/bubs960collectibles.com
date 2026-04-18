import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { colors, heroCollapseThreshold, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useFigureDetail } from '@/hooks/useFigureDetail';
import { useCollection } from '@/hooks/useCollection';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { renderLoreBand } from '@/shared/renderLoreBand';
import { cleanFigureName } from '@/shared/cleanFigureName';
import { formatPriceDollars } from '@/shared/formatters';
import { shareFigure } from '@/shared/share';
import { buildEbayUrl } from '@/api/figureApi';
import { track } from '@/analytics/dispatch';
import { Hero } from '@/components/figure/Hero';
import { ValueStrip } from '@/components/figure/ValueStrip';
import { LoreBand } from '@/components/figure/LoreBand';
import { MarketPanel } from '@/components/figure/MarketPanel';
import { CollectionPanel } from '@/components/figure/CollectionPanel';
import { SeriesContext } from '@/components/figure/SeriesContext';
import { CharacterThread } from '@/components/figure/CharacterThread';
import { CtaCardList, CtaItem } from '@/components/figure/CtaCardList';
import { DetailsCard } from '@/components/figure/DetailsCard';
import { StickyActionBar } from '@/components/figure/StickyActionBar';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FigureDetail'>;
type RouteP = RouteProp<RootStackParamList, 'FigureDetail'>;

const SCROLL_DEPTHS: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];

export function FigureDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { figureId } = route.params;
  const { isSignedIn } = useAuth();
  const reduceMotion = useReduceMotion();

  const { data, loading, error, revalidating, isStale, cacheAgeSeconds, refetch } =
    useFigureDetail(figureId);
  const scrollY = useRef(new Animated.Value(0)).current;
  const maxDepthRef = useRef<number>(0);
  const emittedDepthsRef = useRef<Set<number>>(new Set());
  const dims = useWindowDimensions();

  const lore = useMemo(() => (data ? renderLoreBand(data) : null), [data]);
  const collection = useCollection(() => data?.figure ?? null);
  const [heroZoomed, setHeroZoomed] = useState(false);

  const onHeroZoomChange = useCallback((zoomed: boolean) => {
    setHeroZoomed(zoomed);
  }, []);
  const onHeroZoomed = useCallback(
    (zoomScale: number) => {
      track('figure_image_zoomed', { figure_id: figureId, max_zoom_level: zoomScale });
    },
    [figureId],
  );

  useEffect(() => {
    if (data) track('figure_viewed', { figure_id: figureId });
  }, [data, figureId]);

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.loading} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if ((error && !data) || !data) {
    return (
      <SafeAreaView style={styles.loading} edges={['top']}>
        <Text style={styles.errorText}>Couldn't load this figure.</Text>
      </SafeAreaView>
    );
  }

  const { figure, price, social, series_siblings, character_thread, rarity_tier } = data;
  const name = cleanFigureName(figure.name);
  const ebayUrl = buildEbayUrl(figure);

  const showSeries = (series_siblings?.length ?? 0) > 0;
  const showThread = (character_thread?.length ?? 0) > 0;
  const showCollection = !!social;

  const ctas: CtaItem[] = [
    {
      id: 'report',
      title: 'Spot something off?',
      subtitle: 'Flag missing or incorrect data',
      onPress: () => {},
    },
    {
      id: 'share',
      title: 'Share this figure',
      subtitle: 'Send a link to a friend',
      onPress: async () => {
        const result = await shareFigure(figure).catch(() => 'dismissed' as const);
        if (result === 'shared') {
          track('figure_share_tapped', { figure_id: figureId, share_destination: 'system' });
        }
      },
    },
  ];

  // With reduce-motion off, the header crossfades with scroll. With it on,
  // snap directly based on a threshold so there's no animated interpolation.
  const headerOpacity = reduceMotion
    ? scrollY.interpolate({
        inputRange: [heroCollapseThreshold - 1, heroCollapseThreshold],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : scrollY.interpolate({
        inputRange: [heroCollapseThreshold - 60, heroCollapseThreshold],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.setValue(e.nativeEvent.contentOffset.y);
    const y = e.nativeEvent.contentOffset.y;
    const h = e.nativeEvent.layoutMeasurement.height;
    const total = e.nativeEvent.contentSize.height;
    if (total <= h || total === 0) return;
    const pct = Math.min(100, Math.round(((y + h) / total) * 100));
    if (pct <= maxDepthRef.current) return;
    maxDepthRef.current = pct;
    for (const mark of SCROLL_DEPTHS) {
      if (pct >= mark && !emittedDepthsRef.current.has(mark)) {
        emittedDepthsRef.current.add(mark);
        track('figure_scroll_depth', { figure_id: figureId, max_depth_pct: mark });
      }
    }
  };

  const onPullToRefresh = async () => {
    Haptics.selectionAsync();
    track('figure_pull_refresh', {
      figure_id: figureId,
      cache_age_seconds: cacheAgeSeconds,
    });
    await refetch();
  };

  const onRequireAuth = (trigger: 'own' | 'want') => {
    track('auth_required_shown', { figure_id: figureId, trigger });
    navigation.navigate('SignIn');
  };

  const onToggleOwned = () => {
    if (!isSignedIn) {
      onRequireAuth('own');
      return;
    }
    track('figure_own_toggled', { figure_id: figureId, next_state: !collection.owned });
    void collection.toggleOwned();
  };

  const onToggleWanted = () => {
    if (!isSignedIn) {
      onRequireAuth('want');
      return;
    }
    track('figure_want_toggled', { figure_id: figureId, next_state: !collection.wanted });
    void collection.toggleWanted();
  };

  const onEbayTapped = () => {
    track('figure_ebay_tapped', { figure_id: figureId });
  };

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.stickyHeader, { opacity: headerOpacity, width: dims.width }]}
      >
        <SafeAreaView edges={['top']} style={styles.stickyHeaderInner}>
          <Text numberOfLines={1} style={styles.stickyTitle}>
            {name}
          </Text>
          {price?.avgSold != null && (
            <Text style={styles.stickyPrice}>{formatPriceDollars(price.avgSold)}</Text>
          )}
        </SafeAreaView>
      </Animated.View>

      <SafeAreaView edges={['top']} style={styles.floatingNav} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.navigate('Search')}
          accessibilityRole="button"
          accessibilityLabel="Search figures"
          hitSlop={12}
          style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.searchBtnText}>Search</Text>
        </Pressable>
      </SafeAreaView>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={!heroZoomed}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={revalidating && !loading}
            onRefresh={onPullToRefresh}
            tintColor={colors.accent}
            progressBackgroundColor={colors.surface0}
            colors={[colors.accent]}
          />
        }
      >
        <Hero
          figure={figure}
          rarity={rarity_tier}
          onZoomChange={onHeroZoomChange}
          onZoomed={onHeroZoomed}
        />

        {isStale && (
          <View style={styles.stalePill}>
            <Text style={styles.staleText}>
              Prices last updated {formatAge(cacheAgeSeconds)} — pull to refresh
            </Text>
          </View>
        )}

        {price ? (
          <View style={styles.section}>
            <ValueStrip price={price} />
          </View>
        ) : (
          <View style={styles.section}>
            <EmptyPricingCard />
          </View>
        )}

        {lore?.visible && (
          <View style={styles.section}>
            <LoreBand lore={lore} />
          </View>
        )}

        {price && (
          <View style={styles.section}>
            <MarketPanel
              price={price}
              ebayUrl={ebayUrl}
              isPro={false}
              onUnlockTap={() => navigation.navigate('Waitlist')}
            />
          </View>
        )}

        <View style={styles.section}>
          <DetailsCard figure={figure} />
        </View>

        {showCollection && (
          <View style={styles.section}>
            <CollectionPanel collection={null} social={social} />
          </View>
        )}

        {showSeries && (
          <View style={styles.section}>
            <SeriesContext
              siblings={series_siblings!}
              onSelect={(id) => navigation.push('FigureDetail', { figureId: id })}
            />
          </View>
        )}

        {showThread && (
          <View style={styles.section}>
            <CharacterThread
              entries={character_thread!}
              onSelect={(id) => navigation.push('FigureDetail', { figureId: id })}
            />
          </View>
        )}

        <View style={styles.section}>
          <CtaCardList items={ctas} />
        </View>
      </Animated.ScrollView>

      <StickyActionBar
        signedIn={!!isSignedIn}
        owned={collection.owned}
        wanted={collection.wanted}
        ebayUrl={ebayUrl}
        onToggleOwned={onToggleOwned}
        onToggleWanted={onToggleWanted}
        onRequireAuth={() => onRequireAuth('own')}
        onEbayTapped={onEbayTapped}
      />
    </View>
  );
}

function formatAge(seconds: number | null): string {
  if (seconds == null) return '';
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.max(1, Math.round(seconds / 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function EmptyPricingCard() {
  return (
    <View style={emptyStyles.card}>
      <Text style={emptyStyles.title}>No price data yet</Text>
      <Text style={emptyStyles.body}>
        This figure hasn't been matched to recent eBay listings yet. Tap Find on eBay below to
        search directly.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...type.body,
    color: colors.muted,
  },
  scrollContent: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: colors.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  stickyHeaderInner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stickyTitle: {
    ...type.h2,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  stickyPrice: {
    ...type.heroPrice,
    fontSize: 20,
    color: colors.accent,
  },
  floatingNav: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 11,
  },
  searchBtn: {
    marginTop: spacing.xs,
    marginRight: spacing.md,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(10, 13, 28, 0.6)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBtnText: {
    ...type.eyebrow,
    color: colors.text,
  },
  stalePill: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(240, 160, 75, 0.12)',
    borderWidth: 1,
    borderColor: colors.accentWarm,
  },
  staleText: {
    ...type.eyebrow,
    color: colors.accentWarm,
  },
});

const emptyStyles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface0,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  title: {
    ...type.h2,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.muted,
  },
});
