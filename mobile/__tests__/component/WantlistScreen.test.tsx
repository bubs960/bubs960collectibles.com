/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WantlistScreen } from '../../src/screens/WantlistScreen';
import { collectionStore } from '../../src/collection/localStore';

const Stack = createNativeStackNavigator();

function TestHost() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Wantlist" component={WantlistScreen} />
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

describe('WantlistScreen', () => {
  it('renders empty state with Search CTA when wantlist is empty', () => {
    const { getByText, getByLabelText } = render(<TestHost />);
    expect(getByText('No wants tracked yet')).toBeTruthy();
    expect(getByLabelText('Find a figure to want')).toBeTruthy();
  });

  it('renders rows + a target-price chip when target_price is set', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:wantlist',
      JSON.stringify([
        {
          figure_id: 'f1',
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
    const { getByText } = render(<TestHost />);
    await waitFor(() => expect(getByText('Wolverine')).toBeTruthy());
    expect(getByText('TARGET')).toBeTruthy();
    expect(getByText('$25')).toBeTruthy();
  });

  it('omits the target chip when target_price is absent', async () => {
    await AsyncStorage.setItem(
      'fp:v1:collection:wantlist',
      JSON.stringify([
        {
          figure_id: 'f1',
          name: 'Wolverine',
          brand: 'Hasbro',
          line: 'Marvel Legends',
          series: '5',
          genre: 'marvel',
          image_url: null,
          added_at: Date.now(),
          server_id: null,
        },
      ]),
    );
    const { getByText, queryByText } = render(<TestHost />);
    await waitFor(() => expect(getByText('Wolverine')).toBeTruthy());
    expect(queryByText('TARGET')).toBeNull();
  });

  it('empty-state CTA routes to Search', async () => {
    const { getByLabelText, findByTestId } = render(<TestHost />);
    fireEvent.press(getByLabelText('Find a figure to want'));
    await findByTestId('search');
  });
});
