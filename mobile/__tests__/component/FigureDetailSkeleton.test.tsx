/**
 * Run with jest-expo only.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FigureDetailSkeleton } from '../../src/components/figure/FigureDetailSkeleton';

describe('FigureDetailSkeleton', () => {
  it('exposes a "Loading figure" accessibility label so VoiceOver users know state', () => {
    const { getByLabelText } = render(<FigureDetailSkeleton />);
    expect(getByLabelText('Loading figure')).toBeTruthy();
  });

  it('renders under a stable testID so higher-level tests can find it', () => {
    const { getByTestId } = render(<FigureDetailSkeleton />);
    expect(getByTestId('figure-skeleton')).toBeTruthy();
  });
});
