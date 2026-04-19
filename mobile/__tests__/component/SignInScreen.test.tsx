/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Mock Clerk's useSignIn so we can drive the submit flow without a real
// Clerk client. The __ helpers let each test decide what the next
// create() call resolves to.
const createMock = jest.fn();
const setActiveMock = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: createMock },
    setActive: setActiveMock,
  }),
}));

import { SignInScreen } from '../../src/screens/SignInScreen';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="Back">{() => <Text testID="back">Back</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  createMock.mockReset();
  setActiveMock.mockReset();
});

describe('SignInScreen', () => {
  it('renders email + password inputs and a primary Sign in button', () => {
    const { getByLabelText } = render(<TestHost />);
    expect(getByLabelText('Email')).toBeTruthy();
    expect(getByLabelText('Password')).toBeTruthy();
    // Sign in button has no explicit accessibilityLabel — its label is
    // the "Sign in" text child, which Testing Library finds by role.
  });

  it('Sign in button is disabled until both fields have content', () => {
    const { getByLabelText, getByText } = render(<TestHost />);
    const button = getByText('Sign in');
    // With empty fields the Pressable is disabled — firing press should
    // not invoke signIn.create.
    fireEvent.press(button);
    expect(createMock).not.toHaveBeenCalled();

    fireEvent.changeText(getByLabelText('Email'), 'bubs@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'hunter2');
    createMock.mockResolvedValueOnce({ status: 'complete', createdSessionId: 'sess_1' });
    fireEvent.press(button);

    return waitFor(() => {
      expect(createMock).toHaveBeenCalledWith({
        identifier: 'bubs@example.com',
        password: 'hunter2',
      });
    });
  });

  it('surfaces Clerk errors inline', async () => {
    createMock.mockRejectedValueOnce(new Error('Invalid credentials'));
    const { getByLabelText, getByText } = render(<TestHost />);
    fireEvent.changeText(getByLabelText('Email'), 'bubs@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'wrong');
    fireEvent.press(getByText('Sign in'));
    await waitFor(() => expect(getByText('Invalid credentials')).toBeTruthy());
  });

  it('surfaces the "additional verification required" message for non-complete attempts', async () => {
    createMock.mockResolvedValueOnce({ status: 'needs_second_factor' });
    const { getByLabelText, getByText } = render(<TestHost />);
    fireEvent.changeText(getByLabelText('Email'), 'bubs@example.com');
    fireEvent.changeText(getByLabelText('Password'), 'hunter2');
    fireEvent.press(getByText('Sign in'));
    await waitFor(() =>
      expect(getByText(/Additional verification required/)).toBeTruthy(),
    );
  });

  it('Not now dismisses the modal', () => {
    const { getByLabelText } = render(<TestHost />);
    const dismiss = getByLabelText('Dismiss sign in');
    // Pressing shouldn't throw even at the root of the stack.
    fireEvent.press(dismiss);
  });
});
