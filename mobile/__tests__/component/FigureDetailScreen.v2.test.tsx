/**
 * Run with jest-expo only.
 *
 * Sibling to FigureDetailScreen.test.tsx. With FEATURES.collectionSync=true:
 * - CollectionBar slots into StickyActionBar (Own/Want pills visible)
 * - CTA list grows to include "Open your vault" + "Open your wantlist"
 * - Settings CTA subtitle reads "Account, privacy, data" not "Privacy,
 *   terms, version" (the v1 copy).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from 'react-native';
import type { FigureDetail } from '../../src/shared/types';

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ isSignedIn: false, userId: null, getToken: async () => null }),
}));

jest.mock('../../src/hooks/useFigureDetail', () => {
  const data: FigureDetail = {
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
  return {
    useFigureDetail: () => ({
      data,
      loading: false,
      revalidating: false,
      error: null,
      cacheAgeSeconds: null,
      isStale: false,
      refetch: jest.fn(),
    }),
  };
});

beforeEach(() => {
  jest.resetModules();
});

function renderV2() {
  jest.doMock('../../src/config/features', () => ({
    FEATURES: { collectionSync: true, alerts: true },
  }));
  let FigureDetailScreen: React.ComponentType;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    FigureDetailScreen = require('../../src/screens/FigureDetailScreen').FigureDetailScreen;
  });
  const Stack = createNativeStackNavigator();
  return render(
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
              name="FigureDetail"
              /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
              component={FigureDetailScreen!}
              initialParams={{ figureId: 'f1' }}
            />
            <Stack.Screen name="Search">{() => <Text>search</Text>}</Stack.Screen>
            <Stack.Screen name="Vault">{() => <Text>vault</Text>}</Stack.Screen>
            <Stack.Screen name="Wantlist">{() => <Text>wantlist</Text>}</Stack.Screen>
            <Stack.Screen name="Alerts">{() => <Text>alerts</Text>}</Stack.Screen>
            <Stack.Screen name="Settings">{() => <Text>settings</Text>}</Stack.Screen>
            <Stack.Screen name="SignIn">{() => <Text>signin</Text>}</Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>,
  );
}

describe('FigureDetailScreen — v2 variant (collectionSync+alerts)', () => {
  it('slots CollectionBar into the sticky action bar (Own/Want pills visible)', () => {
    const { getByLabelText } = renderV2();
    expect(getByLabelText('Mark as owned')).toBeTruthy();
    expect(getByLabelText('Mark as wanted')).toBeTruthy();
  });

  it('eBay CTA still renders alongside the collection pills', () => {
    const { getByLabelText } = renderV2();
    expect(getByLabelText('Find on eBay')).toBeTruthy();
  });

  it('CTA list grows to include Vault + Wantlist + Alerts when flags are on', () => {
    const { getByText } = renderV2();
    expect(getByText('Open your vault')).toBeTruthy();
    expect(getByText('Open your wantlist')).toBeTruthy();
    expect(getByText('Price alerts')).toBeTruthy();
  });

  it('Settings CTA subtitle matches the v2 "Account, privacy, data" copy', () => {
    const { getByText } = renderV2();
    expect(getByText('Account, privacy, data')).toBeTruthy();
  });
});
