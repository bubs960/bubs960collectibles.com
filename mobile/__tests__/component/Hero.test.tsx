/** Run with jest-expo only. */
import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Hero } from '../../src/components/figure/Hero';
import type { ApiFigureV1 } from '../../src/shared/types';

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'mattel-elite-11-rey-mysterio',
    name: 'Rey Mysterio (Elite Series 11)',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    year: 2021,
    canonical_image_url: 'https://cdn.example/rey.jpg',
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  return render(<GestureHandlerRootView>{ui}</GestureHandlerRootView>);
}

describe('Hero', () => {
  it('renders the cleaned character name in uppercase', () => {
    const { getByText } = wrap(<Hero figure={figure()} />);
    expect(getByText('REY MYSTERIO (ELITE SERIES 11)')).toBeTruthy();
  });

  it('renders brand + genre chips', () => {
    const { getByText } = wrap(<Hero figure={figure()} />);
    expect(getByText('Mattel')).toBeTruthy();
    expect(getByText('Wrestling')).toBeTruthy();
  });

  it('renders a subtitle combining line, series, and year', () => {
    const { getByText } = wrap(<Hero figure={figure()} />);
    expect(getByText('Elite · Series 11 · 2021')).toBeTruthy();
  });

  it('renders an accessible photo label matching the spec §10 format', () => {
    const { getByLabelText } = wrap(<Hero figure={figure()} />);
    expect(
      getByLabelText(/Photo of Rey Mysterio \(Elite Series 11\) Elite Series 11 .* action figure/),
    ).toBeTruthy();
  });

  it('falls back to "No image" placeholder when canonical_image_url is null', () => {
    const { getByText } = wrap(
      <Hero figure={figure({ canonical_image_url: null })} />,
    );
    expect(getByText('No image')).toBeTruthy();
  });

  it('surfaces rarity badge only for non-common tiers', () => {
    const { queryByLabelText } = wrap(<Hero figure={figure()} rarity="common" />);
    expect(queryByLabelText(/rarity/)).toBeNull();

    const { getByLabelText } = wrap(<Hero figure={figure()} rarity="grail" />);
    expect(getByLabelText('grail rarity')).toBeTruthy();
  });
});
