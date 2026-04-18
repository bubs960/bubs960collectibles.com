/** Run with jest-expo only. */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LoreBand } from '../../src/components/figure/LoreBand';
import type { LoreBandResult } from '../../src/shared/renderLoreBand';

const LONG_TEXT = 'A '.repeat(120).trim();

describe('LoreBand', () => {
  it('renders nothing when not visible', () => {
    const lore: LoreBandResult = { segments: [], visible: false };
    const { toJSON } = render(<LoreBand lore={lore} />);
    expect(toJSON()).toBeNull();
  });

  it('renders text + emphasis segments in order', () => {
    const lore: LoreBandResult = {
      visible: true,
      segments: [
        { type: 'text', value: 'Spider-Man was released in ' },
        { type: 'emphasis', value: 'Retro Collection' },
        { type: 'text', value: ', 2020s.' },
      ],
    };
    const { getByText } = render(<LoreBand lore={lore} />);
    // Text is composed of <Text> children; getByText matches the span.
    expect(getByText(/Retro Collection/)).toBeTruthy();
    expect(getByText(/Spider-Man was released in/)).toBeTruthy();
  });

  it('shows "Read more" for long content and toggles expanded state on press', () => {
    const lore: LoreBandResult = {
      visible: true,
      segments: [{ type: 'text', value: LONG_TEXT }],
    };
    const { getByLabelText, queryByLabelText } = render(<LoreBand lore={lore} />);
    const expand = getByLabelText('Expand context');
    expect(expand).toBeTruthy();

    fireEvent.press(expand);
    expect(queryByLabelText('Collapse context')).toBeTruthy();
    expect(queryByLabelText('Expand context')).toBeNull();
  });

  it('does not render the Read more toggle for short content', () => {
    const lore: LoreBandResult = {
      visible: true,
      segments: [{ type: 'text', value: 'Short blurb.' }],
    };
    const { queryByLabelText } = render(<LoreBand lore={lore} />);
    expect(queryByLabelText('Expand context')).toBeNull();
  });
});
