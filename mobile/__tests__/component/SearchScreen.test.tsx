/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchScreen } from '../../src/screens/SearchScreen';
import { HISTORY_KEY } from '../../src/search/history';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="FigureDetail">{() => <Text testID="detail">Detail</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(async () => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  await AsyncStorage.clear();
});
afterEach(() => {
  global.fetch = originalFetch;
});

describe('SearchScreen', () => {
  it('shows the type-hint empty state with no history', async () => {
    const { getByText } = render(<TestHost />);
    expect(getByText(/Type at least two characters to search/)).toBeTruthy();
  });

  it('shows the Recent section when history has entries', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['wolverine', 'rey mysterio']));
    const { getByText } = render(<TestHost />);
    await waitFor(() => expect(getByText('Recent')).toBeTruthy());
    expect(getByText('wolverine')).toBeTruthy();
    expect(getByText('rey mysterio')).toBeTruthy();
  });

  it('tapping a recent entry repopulates the query input', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['wolverine']));
    const { getByLabelText } = render(<TestHost />);
    const recall = await waitFor(() => getByLabelText('Search wolverine again'));
    fireEvent.press(recall);
    const input = getByLabelText('Search');
    expect((input.props as { value: string }).value).toBe('wolverine');
  });

  it('per-row × removes the entry', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['wolverine', 'rey mysterio']));
    const { getByLabelText, queryByText } = render(<TestHost />);
    const remove = await waitFor(() => getByLabelText('Remove wolverine from recent searches'));
    fireEvent.press(remove);
    await waitFor(() => expect(queryByText('wolverine')).toBeNull());
  });

  it('Clear empties the history', async () => {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(['a', 'bb', 'cc']));
    const { getByLabelText, queryByText } = render(<TestHost />);
    const clear = await waitFor(() => getByLabelText('Clear recent searches'));
    fireEvent.press(clear);
    await waitFor(() => expect(queryByText('Recent')).toBeNull());
  });
});
