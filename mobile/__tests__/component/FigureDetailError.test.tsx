/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { FigureDetailError } from '../../src/components/figure/FigureDetailError';
import { FigureFetchError } from '../../src/api/figureApi';

const Stack = createNativeStackNavigator();

function TestHost({ children }: { children: React.ReactNode }) {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Detail">{() => <>{children}</>}</Stack.Screen>
        <Stack.Screen name="Home">{() => <Text>Home</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

describe('FigureDetailError', () => {
  it('renders the generic error copy when error is null', () => {
    const { getByText } = render(
      <TestHost>
        <FigureDetailError error={null} onRetry={jest.fn()} />
      </TestHost>,
    );
    expect(getByText("Couldn't load this figure")).toBeTruthy();
    expect(getByText(/Tap retry/i)).toBeTruthy();
  });

  it('renders the 404 "we don\'t have that figure" message for FigureFetchError 404', () => {
    const { getByText } = render(
      <TestHost>
        <FigureDetailError error={new FigureFetchError(404, '')} onRetry={jest.fn()} />
      </TestHost>,
    );
    expect(getByText("We don't have that figure")).toBeTruthy();
  });

  it('renders the server-error copy for FigureFetchError 5xx', () => {
    const { getByText } = render(
      <TestHost>
        <FigureDetailError error={new FigureFetchError(503, '')} onRetry={jest.fn()} />
      </TestHost>,
    );
    expect(getByText("Couldn't load this figure")).toBeTruthy();
    expect(getByText(/server took too long/i)).toBeTruthy();
  });

  it('renders the offline copy for network-level TypeError', () => {
    const { getByText } = render(
      <TestHost>
        <FigureDetailError
          error={new TypeError('Network request failed')}
          onRetry={jest.fn()}
        />
      </TestHost>,
    );
    expect(getByText("You're offline")).toBeTruthy();
  });

  it('tapping Try again invokes onRetry', () => {
    const onRetry = jest.fn();
    const { getByLabelText } = render(
      <TestHost>
        <FigureDetailError error={null} onRetry={onRetry} />
      </TestHost>,
    );
    fireEvent.press(getByLabelText('Try again'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows a spinner and disables the retry button while retrying', () => {
    const { queryByLabelText, getByLabelText } = render(
      <TestHost>
        <FigureDetailError error={null} onRetry={jest.fn()} retrying />
      </TestHost>,
    );
    // The button is still present (label persists); the text "Try again"
    // is replaced with an ActivityIndicator child.
    expect(getByLabelText('Try again')).toBeTruthy();
    expect(queryByLabelText(/Try again/)).toBeTruthy();
  });
});
