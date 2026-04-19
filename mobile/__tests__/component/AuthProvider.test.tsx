/**
 * Run with jest-expo only.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock @clerk/clerk-expo so we can assert whether ClerkProvider wraps the
// tree. The sandbox Clerk mock is too sparse for this — component-layer
// tests get a dedicated ClerkProvider spy.
jest.mock('@clerk/clerk-expo', () => {
  const ClerkProvider = jest.fn(({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  });
  return { ClerkProvider };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ClerkProvider } = require('@clerk/clerk-expo') as {
  ClerkProvider: jest.Mock;
};

// Mock the feature flag so we can flip it per test.
jest.mock('../../src/config/features', () => ({
  FEATURES: { collectionSync: false, alerts: false },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const features = require('../../src/config/features') as {
  FEATURES: { collectionSync: boolean; alerts: boolean };
};

import { AuthProvider } from '../../src/auth/AuthProvider';

beforeEach(() => {
  ClerkProvider.mockClear();
  features.FEATURES.collectionSync = false;
  features.FEATURES.alerts = false;
});

describe('AuthProvider', () => {
  it('passes children through unchanged when FEATURES.collectionSync is false', () => {
    const { getByText } = render(
      <AuthProvider>
        <Text testID="child">ok</Text>
      </AuthProvider>,
    );
    expect(getByText('ok')).toBeTruthy();
    expect(ClerkProvider).not.toHaveBeenCalled();
  });

  it('wraps children in ClerkProvider when FEATURES.collectionSync is true', () => {
    features.FEATURES.collectionSync = true;
    const { getByText } = render(
      <AuthProvider>
        <Text testID="child">ok</Text>
      </AuthProvider>,
    );
    expect(getByText('ok')).toBeTruthy();
    expect(ClerkProvider).toHaveBeenCalledTimes(1);
  });

  it('reads the publishable key from EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY when mounting Clerk', () => {
    features.FEATURES.collectionSync = true;
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc';
    render(
      <AuthProvider>
        <Text>ok</Text>
      </AuthProvider>,
    );
    expect(ClerkProvider).toHaveBeenCalledWith(
      expect.objectContaining({ publishableKey: 'pk_test_abc' }),
      expect.anything(),
    );
    delete process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  });
});
