/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertsScreen } from '../../src/screens/AlertsScreen';
import { collectionStore } from '../../src/collection/localStore';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Alerts" component={AlertsScreen} />
        <Stack.Screen name="Wantlist">{() => <Text testID="wantlist">Wantlist</Text>}</Stack.Screen>
        <Stack.Screen name="FigureDetail">{() => <Text testID="detail">Detail</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await collectionStore.reset();
});

describe('AlertsScreen', () => {
  it('renders empty state when no wantlist items have target prices', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:wantlist',
      JSON.stringify([
        {
          figure_id: 'no-target',
          name: 'No Target Figure',
          brand: 'B',
          line: 'L',
          series: '1',
          genre: 'g',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const { getByText, getByLabelText } = render(<TestHost />);
    await waitFor(() => expect(getByText('No targets set yet')).toBeTruthy());
    expect(getByLabelText(/Open wantlist/i)).toBeTruthy();
  });

  it('renders a row for each wantlist figure with target_price > 0', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:wantlist',
      JSON.stringify([
        {
          figure_id: 'f-target',
          name: 'Wolverine',
          brand: 'Hasbro',
          line: 'Marvel Legends',
          series: '5',
          genre: 'marvel',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
          target_price: 25,
        },
        {
          figure_id: 'no-target',
          name: 'Omitted',
          brand: '',
          line: '',
          series: '',
          genre: '',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const { getByText, queryByText } = render(<TestHost />);
    await waitFor(() => expect(getByText('Wolverine')).toBeTruthy());
    expect(queryByText('Omitted')).toBeNull();
  });

  it('tapping a row navigates to the figure detail', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:wantlist',
      JSON.stringify([
        {
          figure_id: 'f-target',
          name: 'Wolverine',
          brand: 'Hasbro',
          line: 'Marvel Legends',
          series: '5',
          genre: 'marvel',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
          target_price: 25,
        },
      ]),
    );
    const { findByText, findByTestId } = render(<TestHost />);
    fireEvent.press(await findByText('Wolverine'));
    await findByTestId('detail');
  });

  it('empty-state "Open wantlist" CTA routes to Wantlist screen', async () => {
    const { getByLabelText, findByTestId } = render(<TestHost />);
    fireEvent.press(getByLabelText(/Open wantlist/i));
    await findByTestId('wantlist');
  });
});
