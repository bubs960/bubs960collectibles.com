/**
 * Run with jest-expo only (uses AccessibilityInfo from react-native).
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { useReduceMotion } from '../../src/hooks/useReduceMotion';

type Listener = (enabled: boolean) => void;

function Probe() {
  const reduce = useReduceMotion();
  return <Text testID="reduce">{reduce ? 'reduce' : 'normal'}</Text>;
}

describe('useReduceMotion', () => {
  let listeners: Listener[] = [];

  beforeEach(() => {
    listeners = [];
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      // @ts-expect-error — the real type returns EmitterSubscription, our
      // stub returns the minimal { remove } shape the hook uses.
      .mockImplementation((event, cb) => {
        if (event === 'reduceMotionChanged') listeners.push(cb as Listener);
        return { remove: () => {} };
      });
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts false, then reflects the OS preference once the Promise resolves', async () => {
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    const { findByText } = render(<Probe />);
    expect(await findByText('reduce')).toBeTruthy();
  });

  it('updates when the OS fires a reduceMotionChanged event', async () => {
    const { findByText, getByTestId } = render(<Probe />);
    // Initial state after Promise resolves with false.
    expect(await findByText('normal')).toBeTruthy();

    // Flip via the listener.
    act(() => {
      for (const cb of listeners) cb(true);
    });
    expect(getByTestId('reduce').props.children).toBe('reduce');

    act(() => {
      for (const cb of listeners) cb(false);
    });
    expect(getByTestId('reduce').props.children).toBe('normal');
  });

  it('does not call setState after unmount (no React warnings)', async () => {
    const { unmount } = render(<Probe />);
    unmount();
    // Firing a late event post-unmount must not throw or warn.
    act(() => {
      for (const cb of listeners) cb(true);
    });
  });
});
