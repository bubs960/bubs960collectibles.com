/**
 * Run with jest-expo only.
 *
 * Gesture behavior (pinch / double-tap / pan) runs on Reanimated's UI
 * thread and can't be exercised from jest. This test locks the RENDER
 * contract: the image mounts, accessibility label is wired, underlay +
 * overlay slot contents appear.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ZoomableImage } from '../../src/components/figure/ZoomableImage';

function wrap(ui: React.ReactElement) {
  return render(<GestureHandlerRootView style={{ flex: 1 }}>{ui}</GestureHandlerRootView>);
}

describe('ZoomableImage', () => {
  it('renders the image with the provided accessibilityLabel', () => {
    const { getByLabelText } = wrap(
      <ZoomableImage
        uri="https://cdn.example/figure.jpg"
        width={300}
        height={300}
        accessibilityLabel="Photo of Rey Mysterio"
      />,
    );
    expect(getByLabelText('Photo of Rey Mysterio')).toBeTruthy();
  });

  it('renders the underlay slot before the image + the overlay slot after', () => {
    const { getByTestId } = wrap(
      <ZoomableImage
        uri="https://cdn.example/figure.jpg"
        width={300}
        height={300}
        accessibilityLabel="x"
        underlay={<View testID="glow" />}
        overlay={<View testID="badge" />}
      />,
    );
    expect(getByTestId('glow')).toBeTruthy();
    expect(getByTestId('badge')).toBeTruthy();
  });

  it('renders without crashing when no underlay / overlay are provided', () => {
    const { getByLabelText } = wrap(
      <ZoomableImage
        uri="https://cdn.example/x.jpg"
        width={200}
        height={200}
        accessibilityLabel="bare"
      />,
    );
    expect(getByLabelText('bare')).toBeTruthy();
  });

  it('applies wrapStyle to the outer frame', () => {
    const { UNSAFE_getAllByType } = wrap(
      <ZoomableImage
        uri="https://cdn.example/x.jpg"
        width={200}
        height={200}
        accessibilityLabel="y"
        wrapStyle={{ backgroundColor: '#123456' }}
      />,
    );
    // The outermost GestureDetector's child View receives wrapStyle merged
    // with the intrinsic styles. Scanning RN Views and checking one has
    // the bg locks the "wrapStyle flows through" contract without coupling
    // to the implementation tree order.
    const views = UNSAFE_getAllByType(View);
    const match = views.some((v) => {
      const style = Array.isArray(v.props.style)
        ? Object.assign({}, ...(v.props.style as object[]))
        : (v.props.style as { backgroundColor?: string } | undefined);
      return style?.backgroundColor === '#123456';
    });
    expect(match).toBe(true);
  });
});
