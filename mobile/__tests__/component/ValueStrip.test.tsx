/**
 * Run with jest-expo only.
 *
 * Locks in the spec §10 accessibility-label wording for the 4 value cells —
 * VoiceOver users depend on these reading naturally end-to-end.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ValueStrip } from '../../src/components/figure/ValueStrip';
import type { ApiPriceV1 } from '../../src/shared/types';

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

describe('ValueStrip', () => {
  it('renders the four cells with the spec §10 a11y phrasing', () => {
    const { getByLabelText } = render(<ValueStrip price={price()} />);
    expect(getByLabelText('Average sold price, $24, from 17 sold comps')).toBeTruthy();
    expect(getByLabelText('Median price, $22, from 17 sold comps')).toBeTruthy();
    expect(getByLabelText('Low price, $12')).toBeTruthy();
    expect(getByLabelText('High price, $48')).toBeTruthy();
  });

  it('omits the "from N sold comps" tail when soldCount is 0', () => {
    const { getByLabelText } = render(<ValueStrip price={price({ soldCount: 0 })} />);
    expect(getByLabelText('Average sold price, $24')).toBeTruthy();
  });

  it('renders em-dashes when price fields are null', () => {
    const { getByLabelText } = render(
      <ValueStrip price={price({ avgSold: null, medianSold: null, minSold: null, maxSold: null })} />,
    );
    expect(getByLabelText('Average sold price, —, from 17 sold comps')).toBeTruthy();
  });
});
