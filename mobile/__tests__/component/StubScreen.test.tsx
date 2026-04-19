/**
 * Run with jest-expo only. Stubs are tiny — lock their copy so a rename
 * elsewhere doesn't silently change what users see when a deep link
 * resolves to one of these.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SetsScreen, WaitlistScreen } from '../../src/screens/StubScreen';

function wrap(ui: React.ReactElement) {
  return render(<SafeAreaProvider>{ui}</SafeAreaProvider>);
}

describe('StubScreen', () => {
  it('SetsScreen renders the series-completion placeholder copy', () => {
    const { getByText } = wrap(<SetsScreen />);
    expect(getByText('Sets')).toBeTruthy();
    expect(getByText('Series completion tracking will live here.')).toBeTruthy();
  });

  it('WaitlistScreen explains Pro is not live yet + promises first-30-days-free', () => {
    const { getByText } = wrap(<WaitlistScreen />);
    expect(getByText('Pro waitlist')).toBeTruthy();
    expect(getByText(/Pro isn't live yet/)).toBeTruthy();
    expect(getByText(/first 30 days free/)).toBeTruthy();
  });
});
