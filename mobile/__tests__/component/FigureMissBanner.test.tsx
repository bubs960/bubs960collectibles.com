/** Run with jest-expo only. */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FigureMissBanner } from '../../src/components/figure/FigureMissBanner';

describe('FigureMissBanner', () => {
  it('renders the miss-log copy + is accessible as an alert region', () => {
    const { getByText, getByRole } = render(<FigureMissBanner />);
    expect(getByText("We don't have this figure yet")).toBeTruthy();
    expect(getByText(/Your query was logged/)).toBeTruthy();
    expect(getByText(/Tap Search/)).toBeTruthy();
    // Screen reader hears this as an alert so users aren't surprised by
    // the "no data" state.
    expect(getByRole('alert')).toBeTruthy();
  });
});
