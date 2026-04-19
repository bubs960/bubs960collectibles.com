/**
 * Run with jest-expo only. Defaults test the v1 shape (no AccountSection).
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { SettingsScreen } from '../../src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Onboarding">{() => <Text>onboarding</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('SettingsScreen — v1 defaults (FEATURES.collectionSync=false)', () => {
  it('renders the App section with version', () => {
    const { getByText } = render(<TestHost />);
    expect(getByText('APP')).toBeTruthy();
    expect(getByText('Version')).toBeTruthy();
    expect(getByText('0.1.0')).toBeTruthy();
  });

  it('renders Legal with Privacy + Terms links', () => {
    const { getByLabelText } = render(<TestHost />);
    expect(getByLabelText('Privacy policy')).toBeTruthy();
    expect(getByLabelText('Terms of service')).toBeTruthy();
  });

  it('does NOT render the Account section in v1', () => {
    const { queryByText } = render(<TestHost />);
    expect(queryByText('ACCOUNT')).toBeNull();
  });

  it('renders the Developer section in __DEV__ builds', () => {
    // jest-expo sets __DEV__=true by default.
    const { getByText } = render(<TestHost />);
    expect(getByText('DEVELOPER')).toBeTruthy();
    expect(getByText('Reset onboarding + clear local data')).toBeTruthy();
  });
});
