/**
 * Run with jest-expo only.
 *
 * AccountSection only mounts when FEATURES.collectionSync is on and is
 * nested under ClerkProvider by AuthProvider. We mock Clerk locally
 * because the real ClerkProvider wants a publishable key.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

jest.mock('@clerk/clerk-expo', () => {
  let signedIn = true;
  let email: string | null = 'test@example.com';
  const userDelete = jest.fn().mockResolvedValue(undefined);
  const signOut = jest.fn().mockResolvedValue(undefined);
  return {
    useAuth: () => ({ isSignedIn: signedIn }),
    useUser: () => ({
      user: signedIn
        ? {
            primaryEmailAddress: email ? { emailAddress: email } : null,
            delete: userDelete,
          }
        : null,
    }),
    useClerk: () => ({ signOut }),
    __setSignedIn(v: boolean) {
      signedIn = v;
    },
    __setEmail(v: string | null) {
      email = v;
    },
    __signOutMock: signOut,
    __userDeleteMock: userDelete,
  };
});
// eslint-disable-next-line @typescript-eslint/no-require-imports
const clerk = require('@clerk/clerk-expo') as {
  __setSignedIn: (v: boolean) => void;
  __setEmail: (v: string | null) => void;
  __signOutMock: jest.Mock;
  __userDeleteMock: jest.Mock;
};

import { AccountSection } from '../../src/screens/settings/AccountSection';

const Stack = createNativeStackNavigator();

function TestHost({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Settings">{() => <>{children}</>}</Stack.Screen>
        <Stack.Screen name="FigureDetail">{() => <Text>Detail</Text>}</Stack.Screen>
        <Stack.Screen name="SignIn">{() => <Text>Sign in</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('AccountSection', () => {
  beforeEach(() => {
    clerk.__setSignedIn(true);
    clerk.__setEmail('test@example.com');
    clerk.__signOutMock.mockClear();
    clerk.__userDeleteMock.mockClear();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the signed-in state with email, sign out, delete', () => {
    const { getByText, getByLabelText } = render(
      <TestHost>
        <AccountSection />
      </TestHost>,
    );
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByLabelText('Sign out')).toBeTruthy();
    expect(getByLabelText('Delete account')).toBeTruthy();
  });

  it('renders a Sign in CTA when signed out', () => {
    clerk.__setSignedIn(false);
    const { getByLabelText, queryByLabelText } = render(
      <TestHost>
        <AccountSection />
      </TestHost>,
    );
    expect(getByLabelText('Sign in')).toBeTruthy();
    expect(queryByLabelText('Sign out')).toBeNull();
  });

  it('Sign out opens a two-tap confirmation via Alert', () => {
    const { getByLabelText } = render(
      <TestHost>
        <AccountSection />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Sign out'));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Sign out?');
  });

  it('Delete account opens a destructive confirmation via Alert with Apple-compliant copy', () => {
    const { getByLabelText } = render(
      <TestHost>
        <AccountSection />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Delete account'));
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const [title, body, buttons] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(title).toBe('Delete account?');
    expect(body).toMatch(/permanently/i);
    expect(buttons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete my account', style: 'destructive' }),
      ]),
    );
  });

  it('confirming delete calls user.delete() on Clerk', async () => {
    const { getByLabelText } = render(
      <TestHost>
        <AccountSection />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Delete account'));
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2] as Array<{
      text: string;
      onPress?: () => void | Promise<void>;
    }>;
    const destructive = buttons.find((b) => b.text === 'Delete my account');
    await destructive?.onPress?.();
    await waitFor(() => expect(clerk.__userDeleteMock).toHaveBeenCalledTimes(1));
  });
});
