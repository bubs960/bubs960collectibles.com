import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { markOnboardingComplete } from '@/onboarding/preferences';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;

interface Slide {
  title: string;
  body: string;
}

// v1 scope: read-only browser. Copy doesn't promise vault/wantlist/alerts —
// those land in v2 once the Worker exposes the sync endpoints. Keep it short:
// every sentence the user reads before the app does something useful is one
// more reason they bounce on first launch.
const SLIDES: Slide[] = [
  {
    title: 'Hunt like a collector',
    body:
      'Figure Pinner shows real eBay sold prices so you know exactly what a figure is worth — no guessing, no padded asking prices.',
  },
  {
    title: 'Search anything',
    body:
      'Find any figure by character, line, or series. Tap to see recent sales, price trends, and where to buy it.',
  },
  {
    title: "Ready to hunt?",
    body:
      "Tap Find on eBay to jump straight to active listings with the right search already filled in.",
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setPage(next);
      Haptics.selectionAsync();
    }
  };

  const next = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
    } else {
      void finish();
    }
  };

  const finish = async () => {
    await markOnboardingComplete();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FigureDetail', params: { figureId: 'mattel-elite-11-rey-mysterio' } }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={12}
          style={styles.skipBtn}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        contentContainerStyle={styles.scroller}
      >
        {SLIDES.map((s, i) => (
          <Slide key={i} slide={s} width={width} />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Step ${page + 1} of ${SLIDES.length}`}
        >
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>
        <Pressable
          onPress={next}
          accessibilityRole="button"
          accessibilityLabel={page === SLIDES.length - 1 ? 'Get started' : 'Next'}
          style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.primaryText}>
            {page === SLIDES.length - 1 ? 'Get started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Slide({ slide, width }: { slide: Slide; width: number }) {
  return (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.title} accessibilityRole="header">
        {slide.title}
      </Text>
      <Text style={styles.body}>{slide.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  skipBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  skipText: {
    ...type.meta,
    color: colors.muted,
  },
  scroller: {
    flexGrow: 0,
  },
  slide: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    justifyContent: 'center',
    flex: 1,
  },
  title: {
    ...type.h1,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.muted,
    fontSize: 17,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface2,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  primary: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    ...type.h2,
    color: colors.text,
    fontSize: 18,
  },
});
