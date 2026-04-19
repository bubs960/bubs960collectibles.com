/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { SeriesContext } from '../../src/components/figure/SeriesContext';
import type { SeriesSibling } from '../../src/shared/types';

function sibling(overrides: Partial<SeriesSibling> = {}): SeriesSibling {
  return {
    figure_id: 's-1',
    name: 'Sibling 1',
    image_url: null,
    owned: false,
    viewing: false,
    ...overrides,
  };
}

describe('SeriesContext', () => {
  let prefetchSpy: jest.SpyInstance;
  beforeEach(() => {
    prefetchSpy = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });
  afterEach(() => {
    prefetchSpy.mockRestore();
  });

  it('renders a header and a card for each sibling', () => {
    const { getByText } = render(
      <SeriesContext
        siblings={[
          sibling({ figure_id: 'a', name: 'Alpha' }),
          sibling({ figure_id: 'b', name: 'Bravo' }),
        ]}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Rest of series')).toBeTruthy();
    expect(getByText('Alpha')).toBeTruthy();
    expect(getByText('Bravo')).toBeTruthy();
  });

  it('marks the currently-viewing card with the VIEWING label', () => {
    const { getByText } = render(
      <SeriesContext
        siblings={[sibling({ figure_id: 'v', name: 'Viewing me', viewing: true })]}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('VIEWING')).toBeTruthy();
  });

  it('accessibility label includes "owned" + "currently viewing" markers when set', () => {
    const { getByLabelText } = render(
      <SeriesContext
        siblings={[
          sibling({ figure_id: 'x', name: 'Figure X', owned: true, viewing: true }),
        ]}
        onSelect={jest.fn()}
      />,
    );
    expect(getByLabelText('Figure X, owned, currently viewing')).toBeTruthy();
  });

  it('invokes onSelect with the tapped figure_id', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <SeriesContext
        siblings={[sibling({ figure_id: 'tap-me', name: 'Tap me' })]}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByLabelText(/Tap me/));
    expect(onSelect).toHaveBeenCalledWith('tap-me');
  });

  it('prefetches the first N sibling thumbnail URLs on mount (spec §11)', () => {
    render(
      <SeriesContext
        siblings={[
          sibling({ figure_id: 'a', image_url: 'https://cdn/a.jpg' }),
          sibling({ figure_id: 'b', image_url: 'https://cdn/b.jpg' }),
          sibling({ figure_id: 'c', image_url: null }),
        ]}
        onSelect={jest.fn()}
      />,
    );
    // Only the two URL-having ones get prefetched; the null is skipped.
    const calledUrls = prefetchSpy.mock.calls.map((c) => c[0] as string);
    expect(calledUrls).toEqual(
      expect.arrayContaining(['https://cdn/a.jpg', 'https://cdn/b.jpg']),
    );
    expect(calledUrls).not.toContain(null);
  });
});
