import React, { useCallback, useRef } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2;
const SNAP_THRESHOLD = 1.05;

export interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  accessibilityLabel?: string;
  /**
   * Bounded drawing area for the image; children like the rarity badge and
   * glow render inside this frame at fixed positions (they don't scale).
   */
  overlay?: React.ReactNode;
  underlay?: React.ReactNode;
  wrapStyle?: ViewStyle;
  /** Fires whenever the image enters/leaves the zoomed state. */
  onZoomChange?: (zoomed: boolean) => void;
  /**
   * Fires with the current scale when a zoom gesture ends above 1x. Used
   * for the figure_image_zoomed analytics event (§12).
   */
  onZoomed?: (scale: number) => void;
}

/**
 * Pinch-to-zoom + double-tap + pan for the hero image. Gesture resolution
 * per spec §14:
 *   - Scale locked between 1x and 4x.
 *   - Double-tap toggles between 1x and 2x.
 *   - Pan only activates when zoomed (so vertical drag at 1x still scrolls
 *     the outer list). Parent should also set scrollEnabled=false on the
 *     outer ScrollView while zoomed for belt-and-braces gesture isolation.
 *   - Reduce Motion: still zoom, but skip the spring-back/snap animation.
 */
export function ZoomableImage({
  uri,
  width,
  height,
  accessibilityLabel,
  overlay,
  underlay,
  wrapStyle,
  onZoomChange,
  onZoomed,
}: ZoomableImageProps) {
  const reduceMotion = useReduceMotion();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // Track peak zoom so parent analytics can report it instead of just the
  // last-released value. Updated on pinch end and double-tap zoom-in.
  const peakRef = useRef(1);

  const reportZoom = useCallback(
    (level: number) => {
      if (level > peakRef.current) peakRef.current = level;
      onZoomed?.(peakRef.current);
    },
    [onZoomed],
  );

  const notifyZoomed = useCallback(
    (zoomed: boolean) => {
      onZoomChange?.(zoomed);
    },
    [onZoomChange],
  );

  const easeTo = (sv: Animated.SharedValue<number>, to: number) => {
    'worklet';
    sv.value = reduceMotion ? to : withTiming(to, { duration: 180 });
  };

  const clampTranslation = (targetScale: number, tx: number, ty: number) => {
    'worklet';
    const maxX = (width * (targetScale - 1)) / 2;
    const maxY = (height * (targetScale - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value < SNAP_THRESHOLD) {
        easeTo(scale, 1);
        easeTo(translateX, 0);
        easeTo(translateY, 0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(notifyZoomed)(false);
      } else {
        savedScale.value = scale.value;
        // Clamp any translation that fell outside bounds.
        const clamped = clampTranslation(scale.value, translateX.value, translateY.value);
        easeTo(translateX, clamped.x);
        easeTo(translateY, clamped.y);
        savedTx.value = clamped.x;
        savedTy.value = clamped.y;
        runOnJS(notifyZoomed)(true);
        runOnJS(reportZoom)(scale.value);
      }
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      // Only apply translation when already zoomed — otherwise defer to the
      // outer ScrollView.
      if (scale.value <= 1) return;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      translateX.value = savedTx.value + e.translationX;
      translateY.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= 1) return;
      const clamped = clampTranslation(scale.value, translateX.value, translateY.value);
      easeTo(translateX, clamped.x);
      easeTo(translateY, clamped.y);
      savedTx.value = clamped.x;
      savedTy.value = clamped.y;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      if (scale.value > 1) {
        easeTo(scale, 1);
        easeTo(translateX, 0);
        easeTo(translateY, 0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
        runOnJS(notifyZoomed)(false);
      } else {
        easeTo(scale, DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(notifyZoomed)(true);
        runOnJS(reportZoom)(DOUBLE_TAP_SCALE);
      }
    });

  // Race: double-tap short-circuits pinch+pan so a quick double-tap never
  // starts a phantom pinch.
  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.wrap, { width, height }, wrapStyle]}
        accessible
        accessibilityLabel={accessibilityLabel}
      >
        {underlay}
        <Animated.Image
          source={{ uri }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
        {overlay}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
