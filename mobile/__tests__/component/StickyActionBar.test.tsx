/**
 * Run with jest-expo only — react-native primitives aren't available in the
 * minimal sandbox harness.
 *
 * v1 scope: the bottom bar is the eBay CTA only. Own/Want pills return in
 * v2 with the auth + sync work.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StickyActionBar } from '../../src/components/figure/StickyActionBar';

function wrap(ui: React.ReactElement) {
  return render(<SafeAreaProvider>{ui}</SafeAreaProvider>);
}

describe('StickyActionBar (v1)', () => {
  it('renders the eBay CTA when an ebayUrl is provided', () => {
    const { getByLabelText, getByText } = wrap(
      <StickyActionBar ebayUrl="https://www.ebay.com/sch/i.html?_nkw=rey" />,
    );
    expect(getByLabelText('Find on eBay')).toBeTruthy();
    expect(getByText(/Find on eBay/)).toBeTruthy();
  });

  it('renders nothing when ebayUrl is null (full null-matrix collapse)', () => {
    const { toJSON } = wrap(<StickyActionBar ebayUrl={null} />);
    expect(toJSON()).toBeNull();
  });

  it('fires onEbayTapped before opening the in-app browser', () => {
    const onEbayTapped = jest.fn();
    const { getByLabelText } = wrap(
      <StickyActionBar
        ebayUrl="https://www.ebay.com/sch/i.html?_nkw=rey"
        onEbayTapped={onEbayTapped}
      />,
    );
    fireEvent.press(getByLabelText('Find on eBay'));
    expect(onEbayTapped).toHaveBeenCalledTimes(1);
  });
});
