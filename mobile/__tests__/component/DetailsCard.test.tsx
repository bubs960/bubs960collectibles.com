/** Run with jest-expo only. */
import React from 'react';
import { render } from '@testing-library/react-native';
import { DetailsCard } from '../../src/components/figure/DetailsCard';
import type { ApiFigureV1 } from '../../src/shared/types';

function figure(overrides: Partial<ApiFigureV1> = {}): ApiFigureV1 {
  return {
    figure_id: 'f1',
    name: 'Rey Mysterio',
    brand: 'Mattel',
    line: 'Elite',
    series: '11',
    genre: 'wrestling',
    year: 2021,
    canonical_image_url: null,
    exclusive_to: null,
    pack_size: 1,
    scale: null,
    ...overrides,
  };
}

describe('DetailsCard', () => {
  it('renders rows for brand / line / series / genre / year (the always-on KB fields)', () => {
    const { getByText } = render(<DetailsCard figure={figure()} />);
    expect(getByText('Brand')).toBeTruthy();
    expect(getByText('Line')).toBeTruthy();
    expect(getByText('Series')).toBeTruthy();
    expect(getByText('Genre')).toBeTruthy();
    expect(getByText('Year')).toBeTruthy();
    expect(getByText('Wrestling')).toBeTruthy(); // genre prettified
  });

  it('hides pack row when pack_size is 1', () => {
    const { queryByText } = render(<DetailsCard figure={figure({ pack_size: 1 })} />);
    expect(queryByText('Pack')).toBeNull();
  });

  it('shows pack row for multi-packs', () => {
    const { getByText } = render(<DetailsCard figure={figure({ pack_size: 2 })} />);
    expect(getByText('Pack')).toBeTruthy();
    expect(getByText('2-pack')).toBeTruthy();
  });

  it('hides exclusive row when exclusive_to is null or the literal "None"', () => {
    const { queryByText: queryNull } = render(<DetailsCard figure={figure({ exclusive_to: null })} />);
    expect(queryNull('Exclusive')).toBeNull();
    const { queryByText: queryNone } = render(
      <DetailsCard figure={figure({ exclusive_to: 'None' })} />,
    );
    expect(queryNone('Exclusive')).toBeNull();
  });

  it('shows exclusive row with the channel name', () => {
    const { getByText } = render(<DetailsCard figure={figure({ exclusive_to: 'Target' })} />);
    expect(getByText('Exclusive')).toBeTruthy();
    expect(getByText('Target')).toBeTruthy();
  });

  it('shows scale only when present', () => {
    const { queryByText } = render(<DetailsCard figure={figure({ scale: null })} />);
    expect(queryByText('Scale')).toBeNull();
    const { getByText } = render(<DetailsCard figure={figure({ scale: '1:6' })} />);
    expect(getByText('Scale')).toBeTruthy();
    expect(getByText('1:6')).toBeTruthy();
  });

  it('renders nothing when every meaningful field is empty', () => {
    const empty = figure({
      brand: '',
      line: '',
      series: '',
      genre: '',
      year: null,
      pack_size: 1,
      exclusive_to: null,
      scale: null,
    });
    const { toJSON } = render(<DetailsCard figure={empty} />);
    expect(toJSON()).toBeNull();
  });
});
