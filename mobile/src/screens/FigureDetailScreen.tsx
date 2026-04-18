import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, heroCollapseThreshold, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { useFigureDetail } from '@/hooks/useFigureDetail';
import { renderLoreBand } from '@/shared/renderLoreBand';
import { cleanFigureName } from '@/shared/cleanFigureName';
import { formatPrice } from '@/shared/formatters';
import { Hero } from '@/components/figure/Hero';
import { ValueStrip } from '@/components/figure/ValueStrip';
import { LoreBand } from '@/components/figure/LoreBand';
import { MarketPanel } from '@/components/figure/MarketPanel';
import { CollectionPanel } from '@/components/figure/CollectionPanel';
import { SeriesContext } from '@/components/figure/SeriesContext';
import { CharacterThread } from '@/components/figure/CharacterThread';
import { CtaCardList, CtaItem } from '@/components/figure/CtaCardList';
import { StickyActionBar } from '@/components/figure/StickyActionBar';

interface Props {
  figureId: string;
  isPro?: boolean;
  onNavigateFigure: (figureId: string) => void;
  onRequireAuth: () => void;
}

export function FigureDetailScreen({ figureId, isPro = false, onNavigateFigure, onRequireAuth }: Props) {
  const { data, loading, error } = useFigureDetail(figureId);
  const [scrollY] = useState(new Animated.Value(0));
  const dims = useWindowDimensions();

  const lore = useMemo(() => (data ? renderLoreBand(data) : null), [data]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loading} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.loading} edges={['top']}>
        <Text style={styles.errorText}>Couldn't load this figure.</Text>
      </SafeAreaView>
    );
  }

  const name = cleanFigureName(data.name, data.slug);
  const ebayUrl = buildEbayUrl(data);
  const signedIn = data.collection !== null;
  const showSeries = (data.series_siblings?.length ?? 0) > 0;
  const showThread = (data.character_thread?.length ?? 0) > 0;
  const showCollection =
    (data.collection?.series_completion && data.collection.series_completion.total > 0) ||
    !!data.social;

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
      subtitle: 'Send a branded card to a friend',
      onPress: () => {},
    },
  ];

  const headerOpacity = scrollY.interpolate({
    inputRange: [heroCollapseThreshold - 60, heroCollapseThreshold],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.root}>
      {/* Collapsing header overlay */}
      <Animated.View
        pointerEvents="none"
        style={[styles.stickyHeader, { opacity: headerOpacity, width: dims.width }]}
      >
        <SafeAreaView edges={['top']} style={styles.stickyHeaderInner}>
          <Text numberOfLines={1} style={styles.stickyTitle}>{name}</Text>
          {data.pricing?.median_cents != null && (
            <Text style={styles.stickyPrice}>{formatPrice(data.pricing.median_cents)}</Text>
          )}
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Hero figure={data} />

        {/* Zone 2 — value strip. Hide entirely if no pricing. */}
        {data.pricing ? (
          <View style={styles.section}>
            <ValueStrip pricing={data.pricing} />
          </View>
        ) : (
          <View style={styles.section}>
            <EmptyPricingCard />
          </View>
        )}

        {/* Zone 3 — lore band */}
        {lore?.visible && (
          <View style={styles.section}>
            <LoreBand lore={lore} />
          </View>
        )}

        {/* Zone 4 — market panel. Only when pricing exists. */}
        {data.pricing && (
          <View style={styles.section}>
            <MarketPanel pricing={data.pricing} isPro={isPro} />
          </View>
        )}

        {/* Zone 5 — collection + social */}
        {showCollection && (
          <View style={styles.section}>
            <CollectionPanel collection={data.collection} social={data.social} />
          </View>
        )}

        {/* Zone 6 — series context */}
        {showSeries && (
          <View style={styles.section}>
            <SeriesContext siblings={data.series_siblings!} onSelect={onNavigateFigure} />
          </View>
        )}

        {/* Zone 7 — character thread */}
        {showThread && (
          <View style={styles.section}>
            <CharacterThread entries={data.character_thread!} onSelect={onNavigateFigure} />
          </View>
        )}

        {/* Zone 8 — CTAs */}
        <View style={styles.section}>
          <CtaCardList items={ctas} />
        </View>
      </Animated.ScrollView>

      <StickyActionBar
        signedIn={signedIn}
        owned={data.collection?.owned ?? false}
        wanted={data.collection?.wanted ?? false}
        ebayUrl={ebayUrl}
        onToggleOwned={() => {}}
        onToggleWanted={() => {}}
        onRequireAuth={onRequireAuth}
      />
    </View>
  );
}

function EmptyPricingCard() {
  return (
    <View style={emptyStyles.card}>
      <Text style={emptyStyles.title}>No market data yet</Text>
      <Text style={emptyStyles.body}>
        We haven't seen enough recent sales to estimate a price. Check eBay directly below.
      </Text>
    </View>
  );
}

function buildEbayUrl(d: ReturnType<typeof useFigureDetail>['data']): string | null {
  if (!d) return null;
  const q = [cleanFigureName(d.name, d.slug), d.line_attributes?.line_name, d.series]
    .filter(Boolean)
    .join(' ');
  if (!q.trim()) return null;
  // Affiliate params should be injected by the backend or added here once
  // EPN campid is configured in app env.
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`;
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
