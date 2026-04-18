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
import { formatPriceDollars } from '@/shared/formatters';
import { buildEbayUrl } from '@/api/figureApi';
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

interface Props {
  figureId: string;
  isPro?: boolean;
  onNavigateFigure: (figureId: string) => void;
  onRequireAuth: () => void;
}

export function FigureDetailScreen({
  figureId,
  isPro = false,
  onNavigateFigure,
  onRequireAuth,
}: Props) {
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

  const { figure, price, collection, social, series_siblings, character_thread, rarity_tier } =
    data;
  const name = cleanFigureName(figure.name);
  const ebayUrl = buildEbayUrl(figure);
  const signedIn = collection !== null;

  const showSeries = (series_siblings?.length ?? 0) > 0;
  const showThread = (character_thread?.length ?? 0) > 0;
  const showCollection =
    !!(collection?.series_completion && collection.series_completion.total > 0) || !!social;

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

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Zone 1 */}
        <Hero figure={figure} rarity={rarity_tier} />

        {/* Zone 2 — value strip. Hide when no pricing. */}
        {price ? (
          <View style={styles.section}>
            <ValueStrip price={price} />
          </View>
        ) : (
          <View style={styles.section}>
            <EmptyPricingCard />
          </View>
        )}

        {/* Zone 3 — lore band. Hides via null-matrix until content ships. */}
        {lore?.visible && (
          <View style={styles.section}>
            <LoreBand lore={lore} />
          </View>
        )}

        {/* Zone 4 — market panel. Only when pricing exists. */}
        {price && (
          <View style={styles.section}>
            <MarketPanel price={price} ebayUrl={ebayUrl} isPro={isPro} />
          </View>
        )}

        {/* Details card — always visible since KB fields always exist. */}
        <View style={styles.section}>
          <DetailsCard figure={figure} />
        </View>

        {/* Zone 5 */}
        {showCollection && (
          <View style={styles.section}>
            <CollectionPanel collection={collection} social={social} />
          </View>
        )}

        {/* Zone 6 */}
        {showSeries && (
          <View style={styles.section}>
            <SeriesContext siblings={series_siblings!} onSelect={onNavigateFigure} />
          </View>
        )}

        {/* Zone 7 */}
        {showThread && (
          <View style={styles.section}>
            <CharacterThread entries={character_thread!} onSelect={onNavigateFigure} />
          </View>
        )}

        {/* Zone 8 */}
        <View style={styles.section}>
          <CtaCardList items={ctas} />
        </View>
      </Animated.ScrollView>

      <StickyActionBar
        signedIn={signedIn}
        owned={collection?.owned ?? false}
        wanted={collection?.wanted ?? false}
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
