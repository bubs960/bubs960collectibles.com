/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'expo-image';
import { CharacterThread } from '../../src/components/figure/CharacterThread';
import type { CharacterThreadEntry } from '../../src/shared/types';

function entry(overrides: Partial<CharacterThreadEntry> = {}): CharacterThreadEntry {
  return {
    figure_id: 'e-1',
    year: 2021,
    line_name: 'Elite',
    image_url: null,
    ...overrides,
  };
}

describe('CharacterThread', () => {
  let prefetchSpy: jest.SpyInstance;
  beforeEach(() => {
    prefetchSpy = jest.spyOn(Image, 'prefetch').mockResolvedValue(true);
  });
  afterEach(() => {
    prefetchSpy.mockRestore();
  });

  it('renders the header and a card per entry', () => {
    const { getByText } = render(
      <CharacterThread
        entries={[
          entry({ figure_id: 'a', line_name: 'Elite Legends' }),
          entry({ figure_id: 'b', line_name: 'Retro Wave' }),
        ]}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('Character thread')).toBeTruthy();
    expect(getByText('Elite Legends')).toBeTruthy();
    expect(getByText('Retro Wave')).toBeTruthy();
  });

  it('renders the year badge prominently per spec', () => {
    const { getByText } = render(
      <CharacterThread
        entries={[entry({ figure_id: 'x', year: 1995, line_name: 'Classics' })]}
        onSelect={jest.fn()}
      />,
    );
    expect(getByText('1995')).toBeTruthy();
  });

  it('omits the year when null', () => {
    const { queryByText, getByText } = render(
      <CharacterThread
        entries={[entry({ figure_id: 'x', year: null, line_name: 'Yearless' })]}
        onSelect={jest.fn()}
      />,
    );
    expect(queryByText(/^\d{4}$/)).toBeNull();
    expect(getByText('Yearless')).toBeTruthy();
  });

  it('tap fires onSelect with the figure_id', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <CharacterThread
        entries={[entry({ figure_id: 'pick-me', year: 2020, line_name: 'Pick me' })]}
        onSelect={onSelect}
      />,
    );
    fireEvent.press(getByLabelText(/Pick me/));
    expect(onSelect).toHaveBeenCalledWith('pick-me');
  });

  it('prefetches up to 6 entry thumbnails (spec §11 parity with SeriesContext)', () => {
    render(
      <CharacterThread
        entries={Array.from({ length: 10 }, (_, i) =>
          entry({ figure_id: `e-${i}`, image_url: `https://cdn/${i}.jpg` }),
        )}
        onSelect={jest.fn()}
      />,
    );
    const calledUrls = prefetchSpy.mock.calls.map((c) => c[0] as string);
    expect(calledUrls).toHaveLength(6);
    expect(calledUrls[0]).toBe('https://cdn/0.jpg');
    expect(calledUrls[5]).toBe('https://cdn/5.jpg');
  });
});
