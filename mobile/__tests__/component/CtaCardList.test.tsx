/**
 * Run with jest-expo only.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CtaCardList } from '../../src/components/figure/CtaCardList';

describe('CtaCardList', () => {
  it('renders nothing visible when items is empty', () => {
    const { queryByRole } = render(<CtaCardList items={[]} />);
    expect(queryByRole('button')).toBeNull();
  });

  it('renders one card per item with title + subtitle', () => {
    const { getByText } = render(
      <CtaCardList
        items={[
          { id: 'a', title: 'Share this figure', subtitle: 'Send a link', onPress: jest.fn() },
          { id: 'b', title: 'Settings', subtitle: 'Privacy, terms, version', onPress: jest.fn() },
        ]}
      />,
    );
    expect(getByText('Share this figure')).toBeTruthy();
    expect(getByText('Send a link')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('invokes the correct onPress handler when a card is tapped', () => {
    const a = jest.fn();
    const b = jest.fn();
    const { getByLabelText } = render(
      <CtaCardList
        items={[
          { id: 'a', title: 'Share', subtitle: 'one', onPress: a },
          { id: 'b', title: 'Settings', subtitle: 'two', onPress: b },
        ]}
      />,
    );
    fireEvent.press(getByLabelText('Share. one'));
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();

    fireEvent.press(getByLabelText('Settings. two'));
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('concatenates title + subtitle into the accessibility label', () => {
    const { getByLabelText } = render(
      <CtaCardList
        items={[
          {
            id: 'share',
            title: 'Share this figure',
            subtitle: 'Send a link to a friend',
            onPress: jest.fn(),
          },
        ]}
      />,
    );
    expect(getByLabelText('Share this figure. Send a link to a friend')).toBeTruthy();
  });
});
