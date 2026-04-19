/**
 * Run with jest-expo only.
 *
 * Sibling to SettingsScreen.test.tsx (v1 defaults). This file covers the
 * v2 variant where FEATURES.collectionSync=true and the Account section
 * renders. Uses jest.doMock + jest.isolateModules so we don't need to
 * flip env vars between tests.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Clerk stub so AccountSection (mounted by v2 Settings) can call the
// auth hooks without a real provider.
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ isSignedIn: false }),
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: async () => {} }),
}));

beforeEach(() => {
  jest.resetModules();
});

function renderWithFlag(collectionSync: boolean) {
  jest.doMock('../../src/config/features', () => ({
    FEATURES: { collectionSync, alerts: false },
  }));
  let SettingsScreen: React.ComponentType;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SettingsScreen = require('../../src/screens/SettingsScreen').SettingsScreen;
  });
  const Stack = createNativeStackNavigator();
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        {/* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */}
        <Stack.Screen name="Settings" component={SettingsScreen!} />
        <Stack.Screen name="SignIn">{() => <Text>signin</Text>}</Stack.Screen>
        <Stack.Screen name="FigureDetail">{() => <Text>detail</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>,
  );
}

describe('SettingsScreen — v2 variant (FEATURES.collectionSync=true)', () => {
  it('renders the Account section above App / Support / Legal', () => {
    const { getByText } = renderWithFlag(true);
    expect(getByText('ACCOUNT')).toBeTruthy();
  });

  it('signed-out: renders a Sign in CTA inside the Account section', () => {
    const { getByLabelText } = renderWithFlag(true);
    expect(getByLabelText('Sign in')).toBeTruthy();
  });

  it('keeps the v1 sections (App, Support, Legal) alongside Account', () => {
    const { getByText } = renderWithFlag(true);
    expect(getByText('APP')).toBeTruthy();
    expect(getByText('SUPPORT')).toBeTruthy();
    expect(getByText('LEGAL')).toBeTruthy();
  });

  it('sanity: with the flag off, Account section does NOT render', () => {
    const { queryByText } = renderWithFlag(false);
    expect(queryByText('ACCOUNT')).toBeNull();
  });
});
