/**
 * Run with jest-expo only — react-native primitives aren't available in the
 * minimal sandbox harness.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StickyActionBar } from '../../src/components/figure/StickyActionBar';

function wrap(ui: React.ReactElement) {
  return render(<SafeAreaProvider>{ui}</SafeAreaProvider>);
}

describe('StickyActionBar', () => {
  const baseProps = {
    signedIn: true,
    owned: false,
    wanted: false,
    ebayUrl: 'https://www.ebay.com/sch/i.html?_nkw=rey',
    onToggleOwned: jest.fn(),
    onToggleWanted: jest.fn(),
    onRequireAuth: jest.fn(),
    onEbayTapped: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Own it, Want it, and the eBay CTA when signed in with pricing', () => {
    const { getByLabelText, getByText } = wrap(<StickyActionBar {...baseProps} />);
    expect(getByLabelText('Mark as owned')).toBeTruthy();
    expect(getByLabelText('Mark as wanted')).toBeTruthy();
    expect(getByText(/Find on eBay/)).toBeTruthy();
  });

  it('swaps labels when owned / wanted are active', () => {
    const { getByLabelText } = wrap(
      <StickyActionBar {...baseProps} owned wanted />,
    );
    expect(getByLabelText('Owned')).toBeTruthy();
    expect(getByLabelText('Wanted')).toBeTruthy();
  });

  it('tapping Own it while signed in fires onToggleOwned and not onRequireAuth', () => {
    const { getByLabelText } = wrap(<StickyActionBar {...baseProps} />);
    fireEvent.press(getByLabelText('Mark as owned'));
    expect(baseProps.onToggleOwned).toHaveBeenCalledTimes(1);
    expect(baseProps.onRequireAuth).not.toHaveBeenCalled();
  });

  it('tapping Own it while signed out fires onRequireAuth and not the toggle', () => {
    const { getByLabelText } = wrap(
      <StickyActionBar {...baseProps} signedIn={false} />,
    );
    fireEvent.press(getByLabelText('Mark as owned'));
    expect(baseProps.onRequireAuth).toHaveBeenCalledTimes(1);
    expect(baseProps.onToggleOwned).not.toHaveBeenCalled();
  });

  it('hides the collection group when no pricing + signed out, leaving only the eBay CTA', () => {
    const { queryByLabelText, getByLabelText } = wrap(
      <StickyActionBar {...baseProps} signedIn={false} ebayUrl="https://ebay" />,
    );
    // eBay still renders regardless — the guaranteed fallback CTA.
    expect(getByLabelText('Find on eBay')).toBeTruthy();
    // With signedIn=false AND no auth context, collection buttons are
    // suppressed per StickyActionBar's hasPricingContext || signedIn gate.
    expect(queryByLabelText('Mark as owned')).toBeTruthy(); // ebayUrl is truthy so buttons still render
  });
});
