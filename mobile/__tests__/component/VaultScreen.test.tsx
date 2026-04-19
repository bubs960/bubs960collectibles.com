/**
 * Run with jest-expo only.
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VaultScreen } from '../../src/screens/VaultScreen';
import { collectionStore } from '../../src/collection/localStore';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Vault" component={VaultScreen} />
        <Stack.Screen name="Search">{() => <Text testID="search">Search</Text>}</Stack.Screen>
        <Stack.Screen name="FigureDetail">{() => <Text testID="detail">Detail</Text>}</Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await collectionStore.reset();
});

describe('VaultScreen', () => {
  it('renders the empty state with a Search CTA when the vault is empty', () => {
    const { getByText, getByLabelText } = render(<TestHost />);
    expect(getByText('Your vault is empty')).toBeTruthy();
    expect(getByLabelText('Find a figure to add')).toBeTruthy();
  });

  it('tapping the empty-state CTA navigates to Search', async () => {
    const { getByLabelText, findByTestId } = render(<TestHost />);
    fireEvent.press(getByLabelText('Find a figure to add'));
    await findByTestId('search');
  });

  it('renders rows from the local store', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:vault',
      JSON.stringify([
        {
          figure_id: 'f1',
          name: 'Rey Mysterio',
          brand: 'Mattel',
          line: 'Elite',
          series: '11',
          genre: 'wrestling',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const { getByText } = render(<TestHost />);
    await waitFor(() => expect(getByText('Rey Mysterio')).toBeTruthy());
    expect(getByText('1 figure')).toBeTruthy();
  });

  it('tapping a row navigates to the figure detail', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:vault',
      JSON.stringify([
        {
          figure_id: 'f1',
          name: 'Rey Mysterio',
          brand: 'Mattel',
          line: 'Elite',
          series: '11',
          genre: 'wrestling',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const { findByText, findByTestId } = render(<TestHost />);
    const row = await findByText('Rey Mysterio');
    fireEvent.press(row);
    await findByTestId('detail');
  });

  it('long-press triggers a destructive Alert confirm', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:vault',
      JSON.stringify([
        {
          figure_id: 'f1',
          name: 'Rey Mysterio',
          brand: 'Mattel',
          line: 'Elite',
          series: '11',
          genre: 'wrestling',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText } = render(<TestHost />);
    const row = await findByText('Rey Mysterio');
    fireEvent(row, 'longPress');
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][0]).toBe('Remove Rey Mysterio?');
    alertSpy.mockRestore();
  });
});
