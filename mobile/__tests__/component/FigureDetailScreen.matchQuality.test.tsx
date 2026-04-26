/**
 * Run with jest-expo only.
 *
 * Locks the match_quality contract end-to-end on FigureDetailScreen, post
 * 2026-04-25 worker patch (engineer's "update big" — both P0s live):
 *   - direct  → figure_viewed only, no figure_id_resolved, no banner
 *   - moved   → figure_id_resolved fires with canonical id +
 *               alias_source + alias_confidence, route param silently
 *               swaps to canonical, NO banner
 *   - cluster → same shape as moved (Tier-2 — schema is locked even if
 *               worker doesn't ship it for v1)
 *   - not_found_but_logged → miss banner renders, NO route swap,
 *               figure_id_resolved fires with canonical_id: null
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import type { FigureDetail, FigureMatchQuality } from '../../src/shared/types';

// Spy on the analytics dispatcher. setAnalyticsSink is the public swap
// point; tests inject a jest.fn sink and assert on calls.
import { setAnalyticsSink } from '../../src/analytics/dispatch';

// Mocked hook lets each test pre-load state with a specific
// match_quality + canonical_id.
jest.mock('../../src/hooks/useFigureDetail', () => {
  let state: ReturnType<typeof makeDefault> = makeDefault();
  function makeDefault() {
    return {
      data: null as FigureDetail | null,
      loading: false,
      revalidating: false,
      error: null as Error | null,
      cacheAgeSeconds: null as number | null,
      isStale: false,
      refetch: jest.fn(),
    };
  }
  return {
    useFigureDetail: () => state,
    __setState(next: Partial<ReturnType<typeof makeDefault>>) {
      state = { ...state, ...next };
    },
    __reset() {
      state = makeDefault();
    },
  };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const hookMock = require('../../src/hooks/useFigureDetail') as {
  __setState: (n: Partial<ReturnType<() => unknown>>) => void;
  __reset: () => void;
};

import { FigureDetailScreen } from '../../src/screens/FigureDetailScreen';

const Stack = createNativeStackNavigator();

function TestHost({ initialFigureId = 'requested-id' }: { initialFigureId?: string }) {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="FigureDetail"
              component={FigureDetailScreen}
              initialParams={{ figureId: initialFigureId }}
            />
            <Stack.Screen name="Search">{() => <Text testID="search">Search</Text>}</Stack.Screen>
            <Stack.Screen name="Settings">
              {() => <Text testID="settings">Settings</Text>}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>,
  );
}

interface DetailOpts {
  aliasSource?: string;
  aliasConfidence?: number;
  originalFigureId?: string;
}

function detail(
  figureId: string,
  quality: FigureMatchQuality | undefined,
  opts: DetailOpts = {},
): FigureDetail {
  if (quality === 'not_found_but_logged') {
    return {
      match_quality: 'not_found_but_logged',
      original_figure_id: opts.originalFigureId ?? figureId,
    };
  }
  return {
    match_quality: quality ?? 'direct',
    figure: {
      figure_id: figureId,
      name: 'Rey Mysterio',
      brand: 'Mattel',
      line: 'Elite',
      series: '11',
      genre: 'wrestling',
      year: 2021,
      canonical_image_url: null,
      exclusive_to: null,
      pack_size: 1,
      scale: null,
      match_quality: quality === undefined ? undefined : quality,
      ...(opts.aliasSource ? { alias_source: opts.aliasSource } : {}),
      ...(opts.aliasConfidence != null ? { alias_confidence: opts.aliasConfidence } : {}),
      ...(opts.originalFigureId ? { original_figure_id: opts.originalFigureId } : {}),
    },
    price: null,
    rarity_tier: null,
    line_attributes: null,
    character_notes: null,
    collection: null,
    social: null,
    series_siblings: null,
    character_thread: null,
  };
}

let sink: jest.Mock;

beforeEach(() => {
  hookMock.__reset();
  sink = jest.fn();
  setAnalyticsSink(sink);
});

afterEach(() => {
  setAnalyticsSink(() => {});
});

describe('FigureDetailScreen match_quality handling', () => {
  it('direct → figure_viewed fires, NO figure_id_resolved event, NO miss banner', async () => {
    hookMock.__setState({ data: detail('requested-id', 'direct') });
    const { queryByRole } = render(<TestHost />);
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_viewed', { figure_id: 'requested-id' }),
    );
    const resolvedCalls = sink.mock.calls.filter((c) => c[0] === 'figure_id_resolved');
    expect(resolvedCalls).toHaveLength(0);
    // alert role is only set by the miss banner; not present on direct.
    expect(queryByRole('alert')).toBeNull();
  });

  it('moved → figure_viewed uses canonical, figure_id_resolved carries alias_source + confidence', async () => {
    hookMock.__setState({
      data: detail('canonical-id', 'moved', {
        aliasSource: 'figure_id_alias',
        aliasConfidence: 1,
      }),
    });
    render(<TestHost initialFigureId="requested-id" />);
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_viewed', { figure_id: 'canonical-id' }),
    );
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_id_resolved', {
        requested_id: 'requested-id',
        canonical_id: 'canonical-id',
        match_quality: 'moved',
        alias_source: 'figure_id_alias',
        alias_confidence: 1,
      }),
    );
  });

  it('cluster → figure_id_resolved fires with cluster quality + null alias fields when absent', async () => {
    hookMock.__setState({ data: detail('cluster-canonical', 'cluster') });
    render(<TestHost initialFigureId="fuzzy-match-input" />);
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_id_resolved', {
        requested_id: 'fuzzy-match-input',
        canonical_id: 'cluster-canonical',
        match_quality: 'cluster',
        alias_source: null,
        alias_confidence: null,
      }),
    );
  });

  it('not_found_but_logged → miss banner renders + event fires with canonical_id: null', async () => {
    hookMock.__setState({ data: detail('requested-id', 'not_found_but_logged') });
    const { getByText, getByRole } = render(<TestHost initialFigureId="requested-id" />);
    // Banner copy + alert role.
    expect(getByText("We don't have this figure yet")).toBeTruthy();
    expect(getByRole('alert')).toBeTruthy();
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_id_resolved', {
        requested_id: 'requested-id',
        canonical_id: null,
        match_quality: 'not_found_but_logged',
      }),
    );
  });

  it('missing match_quality → treated as direct (backward compat with pre-alias-patch worker)', async () => {
    hookMock.__setState({ data: detail('requested-id', undefined) });
    const { queryByRole } = render(<TestHost />);
    await waitFor(() =>
      expect(sink).toHaveBeenCalledWith('figure_viewed', { figure_id: 'requested-id' }),
    );
    const resolvedCalls = sink.mock.calls.filter((c) => c[0] === 'figure_id_resolved');
    expect(resolvedCalls).toHaveLength(0);
    expect(queryByRole('alert')).toBeNull();
  });
});
