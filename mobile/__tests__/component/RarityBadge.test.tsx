/** Run with jest-expo only. */
import React from 'react';
import { render } from '@testing-library/react-native';
import { RarityBadge } from '../../src/components/figure/RarityBadge';

describe('RarityBadge', () => {
  it('renders nothing for null rarity', () => {
    const { toJSON } = render(<RarityBadge tier={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing for "common" — the null-matrix rule keeps the hero uncluttered', () => {
    const { toJSON } = render(<RarityBadge tier="common" />);
    expect(toJSON()).toBeNull();
  });

  it('renders with a "<tier> rarity" label for uncommon+', () => {
    const { getByLabelText, getByText } = render(<RarityBadge tier="uncommon" />);
    expect(getByLabelText('uncommon rarity')).toBeTruthy();
    expect(getByText('UNCOMMON')).toBeTruthy();
  });

  it('renders the grail tier in caps', () => {
    const { getByText } = render(<RarityBadge tier="grail" />);
    expect(getByText('GRAIL')).toBeTruthy();
  });
});
