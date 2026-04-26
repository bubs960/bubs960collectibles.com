/**
 * Run with jest-expo only.
 *
 * End-to-end render test for FigureDetailScreen — mocks useFigureDetail
 * + useReduceMotion so we can rehearse the four render states (loading
 * skeleton, error, empty-pricing, success with all zones) without
 * standing up real fetch / cache / Clerk plumbing.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import type { FigureDetail } from '../../src/shared/types';
import { FigureFetchError } from '../../src/api/figureApi';
import { FigureDetailScreen } from '../../src/screens/FigureDetailScreen';

// Mock the data hook. Each test sets what it returns via __setState.
jest.mock('../../src/hooks/useFigureDetail', () => {
  let state: ReturnType<typeof makeDefault> = makeDefault();
  function makeDefault() {
    return {
      data: null as FigureDetail | null,
      loading: true,
      revalidating: false,
      error: null as Error | null,
      cacheAgeSeconds: null as number | null,
      isStale: false,
      refetch: jest.fn(async () => {}),
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
const useFigureDetailMock = require('../../src/hooks/useFigureDetail') as {
  __setState: (n: Partial<ReturnType<() => unknown>>) => void;
  __reset: () => void;
};

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="FigureDetail"
              component={FigureDetailScreen}
              initialParams={{ figureId: 'f1' }}
            />
            <Stack.Screen name="Search">{() => <Text testID="search">Search</Text>}</Stack.Screen>
            <Stack.Screen name="Settings">{() => <Text testID="settings">Settings</Text>}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function baseDetail(): FigureDetail {
  return {
    match_quality: 'direct',
    figure: {
      figure_id: 'f1',
      name: 'Rey Mysterio (Elite Series 11)',
      brand: 'Mattel',
      line: 'Elite',
      series: '11',
      genre: 'wrestling',
      year: 2021,
      canonical_image_url: null,
      exclusive_to: null,
      pack_size: 1,
      scale: null,
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

beforeEach(() => {
  useFigureDetailMock.__reset();
});

describe('FigureDetailScreen render states', () => {
  it('renders the skeleton while loading + data is null', () => {
    useFigureDetailMock.__setState({ loading: true, data: null });
    const { getByLabelText } = render(<TestHost />);
    expect(getByLabelText('Loading figure')).toBeTruthy();
  });

  it('renders the error screen when the fetch fails and nothing is cached', () => {
    useFigureDetailMock.__setState({
      loading: false,
      data: null,
      error: new FigureFetchError(503, ''),
    });
    const { getByText } = render(<TestHost />);
    expect(getByText("Couldn't load this figure")).toBeTruthy();
  });

  it('renders the empty-pricing placeholder when data has no price', () => {
    useFigureDetailMock.__setState({
      loading: false,
      data: baseDetail(),
    });
    const { getByText } = render(<TestHost />);
    expect(getByText('No price data yet')).toBeTruthy();
  });

  it('renders zone 1 hero with name + brand chip on success', () => {
    useFigureDetailMock.__setState({
      loading: false,
      data: baseDetail(),
    });
    const { getByText } = render(<TestHost />);
    expect(getByText('REY MYSTERIO (ELITE SERIES 11)')).toBeTruthy();
    expect(getByText('Mattel')).toBeTruthy();
    expect(getByText('Wrestling')).toBeTruthy();
  });

  it('renders the Search affordance in the floating top-right nav', () => {
    useFigureDetailMock.__setState({ loading: false, data: baseDetail() });
    const { getByLabelText } = render(<TestHost />);
    expect(getByLabelText('Search figures')).toBeTruthy();
  });

  it('shows the stale pill when isStale is true', () => {
    useFigureDetailMock.__setState({
      loading: false,
      data: baseDetail(),
      isStale: true,
      cacheAgeSeconds: 48 * 3600,
    });
    const { getByText } = render(<TestHost />);
    expect(getByText(/Prices last updated/)).toBeTruthy();
  });

  it('renders the sticky eBay CTA when pricing-context is available', () => {
    useFigureDetailMock.__setState({ loading: false, data: baseDetail() });
    const { getByLabelText } = render(<TestHost />);
    expect(getByLabelText('Find on eBay')).toBeTruthy();
  });

  it('renders the Details card with brand/line/series/genre/year always-on rows', () => {
    useFigureDetailMock.__setState({ loading: false, data: baseDetail() });
    const { getByText } = render(<TestHost />);
    expect(getByText('Brand')).toBeTruthy();
    expect(getByText('Line')).toBeTruthy();
    expect(getByText('Series')).toBeTruthy();
    expect(getByText('Genre')).toBeTruthy();
    expect(getByText('Year')).toBeTruthy();
  });

  it('renders the v1 CTA list: Coming-soon Vault/Wantlist, Share, Settings, Report (no real Vault/Wantlist links)', () => {
    useFigureDetailMock.__setState({ loading: false, data: baseDetail() });
    const { getByText, queryByText } = render(<TestHost />);
    // v1 placeholder copy per engineer Q3.
    expect(getByText('Vault — Coming soon')).toBeTruthy();
    expect(getByText('Wantlist — Coming soon')).toBeTruthy();
    expect(getByText('Share this figure')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Spot something off?')).toBeTruthy();
    // Real v2 links are NOT rendered with collectionSync=false.
    expect(queryByText('Open your vault')).toBeNull();
    expect(queryByText('Open your wantlist')).toBeNull();
  });
});
