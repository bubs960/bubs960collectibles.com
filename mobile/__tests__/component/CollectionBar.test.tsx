/**
 * Run with jest-expo only.
 *
 * CollectionBar only mounts when FEATURES.collectionSync is on. It uses
 * useAuth (Clerk) + useCollection (local store). In jest-expo land both
 * are available; we mock Clerk's ClerkProvider minimally to avoid a
 * publishable-key round-trip.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { CollectionBar } from '../../src/components/figure/CollectionBar';
import type { ApiFigureV1 } from '../../src/shared/types';

// Minimal Clerk mock — inject a signed-out/signed-in provider via
// jest.mock because @clerk/clerk-expo's real ClerkProvider wants a real
// key. Ensure this mock shape matches the sandbox one used in logic tests.
jest.mock('@clerk/clerk-expo', () => {
  let signedIn = false;
  const useAuth = () => ({ isSignedIn: signedIn, userId: 'user_a', getToken: async () => 'jwt' });
  return {
    useAuth,
    __setSignedIn(v: boolean) {
      signedIn = v;
    },
  };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const clerk = require('@clerk/clerk-expo') as { __setSignedIn: (v: boolean) => void };

const Stack = createNativeStackNavigator();

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'mattel-elite-11-rey-mysterio',
    name: 'Rey Mysterio',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    year: null,
    canonical_image_url: null,
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

function TestHost({ children }: { children: React.ReactNode }) {
  // Navigation is needed because CollectionBar calls useNavigation().
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="FigureDetail">
          {() => (
            <View>
              {children}
              <Text testID="probe">ok</Text>
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name="SignIn">{() => <Text>SignIn</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('CollectionBar', () => {
  beforeEach(() => {
    clerk.__setSignedIn(false);
  });

  it('renders Own it / Want it pills when signed out', async () => {
    const { getByLabelText } = render(
      <TestHost>
        <CollectionBar figure={figure()} />
      </TestHost>,
    );
    expect(getByLabelText('Mark as owned')).toBeTruthy();
    expect(getByLabelText('Mark as wanted')).toBeTruthy();
  });

  it('tapping Own it while signed out does not toggle state (navigates to SignIn instead)', async () => {
    const { getByLabelText } = render(
      <TestHost>
        <CollectionBar figure={figure()} />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Mark as owned'));
    // After the navigation, the label should still read "Mark as owned"
    // because the toggle was suppressed.
    await waitFor(() => expect(getByLabelText('Mark as owned')).toBeTruthy());
  });

  it('tapping Own it while signed in flips label to "Owned"', async () => {
    clerk.__setSignedIn(true);
    const { getByLabelText } = render(
      <TestHost>
        <CollectionBar figure={figure()} />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Mark as owned'));
    await waitFor(() => expect(getByLabelText('Owned')).toBeTruthy());
  });
});
