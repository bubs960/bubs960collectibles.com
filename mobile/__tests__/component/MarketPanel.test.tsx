/**
 * Run with jest-expo only.
 *
 * Locks the v1 contract: NO Pro gate, full price history visible, chart only
 * appears with 2+ sales, accessibility label matches spec §10.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { MarketPanel } from '../../src/components/figure/MarketPanel';
import type { ApiPriceV1, ApiSoldComp } from '../../src/shared/types';

function comp(overrides: Partial<ApiSoldComp> = {}): ApiSoldComp {
  return {
    price: 24,
    title: 'Test listing',
    condition: 'Loose',
    sold_date: '2026-04-01T00:00:00Z',
    listing_format: 'fixed',
    ...overrides,
  };
}

function price(overrides: Partial<ApiPriceV1> = {}): ApiPriceV1 {
  return {
    figureId: 'fid',
    avgSold: 24,
    medianSold: 22,
    minSold: 12,
    maxSold: 48,
    soldCount: 17,
    avgFS: null,
    fsCount: 0,
    minFS: null,
    soldHistory: [],
    ...overrides,
  };
}

describe('MarketPanel (v1, no Pro gate)', () => {
  it('renders no chart card when fewer than 2 sales', () => {
    const { queryByText } = render(
      <MarketPanel
        price={price({ soldHistory: [comp({ sold_date: '2026-04-01' })] })}
        ebayUrl={null}
      />,
    );
    expect(queryByText('Recent sold trend')).toBeNull();
  });

  it('renders the chart card when there are 2+ sales', () => {
    const { getByText, getByLabelText } = render(
      <MarketPanel
        price={price({
          soldHistory: [
            comp({ sold_date: '2026-04-01', price: 20 }),
            comp({ sold_date: '2026-04-15', price: 30 }),
          ],
        })}
        ebayUrl={null}
      />,
    );
    expect(getByText('Recent sold trend')).toBeTruthy();
    // Chart label per spec §10.
    expect(getByLabelText(/Price trend chart\. Latest sale \$30/)).toBeTruthy();
  });

  it('shows the empty placeholder when soldHistory is empty', () => {
    const { getByText } = render(
      <MarketPanel price={price({ soldHistory: [] })} ebayUrl={null} />,
    );
    expect(getByText('No recent sales')).toBeTruthy();
  });

  it('renders ALL comps regardless of length (no Pro gate after the v1 cut)', () => {
    const history = Array.from({ length: 10 }, (_, i) =>
      comp({ sold_date: `2026-04-${String(i + 1).padStart(2, '0')}T00:00:00Z`, price: 10 + i }),
    );
    const { queryByText, getAllByLabelText } = render(
      <MarketPanel price={price({ soldHistory: history })} ebayUrl={null} />,
    );
    // The "Unlock full history" CTA must NOT render in v1.
    expect(queryByText(/Unlock/)).toBeNull();
    expect(queryByText(/Pro waitlist/)).toBeNull();
    // Each comp row gets an a11y label of the form "Title. Sold for $X on..."
    expect(getAllByLabelText(/Sold for/).length).toBe(10);
  });

  it('marks an auction comp with the auction tag', () => {
    const { getByText } = render(
      <MarketPanel
        price={price({
          soldHistory: [comp({ listing_format: 'auction', price: 33 })],
        })}
        ebayUrl={null}
      />,
    );
    expect(getByText('Auction')).toBeTruthy();
  });
});
