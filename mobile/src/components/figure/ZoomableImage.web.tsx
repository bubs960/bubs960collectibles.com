import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import { useReduceMotion } from '@/hooks/useReduceMotion';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const WHEEL_STEP = 0.15;
const ZOOM_THRESHOLD = 1.05;

export interface ZoomableImageProps {
  uri: string;
  width: number;
  height: number;
  accessibilityLabel?: string;
  overlay?: React.ReactNode;
  underlay?: React.ReactNode;
  wrapStyle?: ViewStyle;
  onZoomChange?: (zoomed: boolean) => void;
  onZoomed?: (scale: number) => void;
}

/**
 * Web variant of ZoomableImage. Replaces Reanimated worklets +
 * pinch/double-tap/pan gestures with their desktop equivalents:
 *   - mouse wheel / trackpad scroll → zoom in / out (around cursor)
 *   - double-click → toggle 1x ↔ 2x
 *   - click-drag while zoomed → pan
 *   - Esc → reset to 1x
 *
 * Reduce Motion (prefers-reduced-motion media query) skips the CSS
 * transition during snap-back. The wheel handler is debounced via
 * raf so we don't spam zoom events on a high-DPI trackpad.
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
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const peakRef = useRef(1);
  const draggingRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const clampTranslate = useCallback(
    (target: number, x: number, y: number) => {
      const maxX = (width * (target - 1)) / 2;
      const maxY = (height * (target - 1)) / 2;
      return {
        x: Math.max(-maxX, Math.min(maxX, x)),
        y: Math.max(-maxY, Math.min(maxY, y)),
      };
    },
    [width, height],
  );

  const reportZoom = useCallback(
    (level: number) => {
      if (level > peakRef.current) peakRef.current = level;
      onZoomed?.(peakRef.current);
    },
    [onZoomed],
  );

  const applyScale = useCallback(
    (next: number, anchorX?: number, anchorY?: number) => {
      const target = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
      const wasZoomed = scale >= ZOOM_THRESHOLD;
      const isZoomed = target >= ZOOM_THRESHOLD;
      if (target < ZOOM_THRESHOLD) {
        setScale(1);
        setTx(0);
        setTy(0);
      } else {
        // Zoom around cursor position when provided so the point under
        // the mouse stays fixed (standard browser pan-zoom behaviour).
        let newTx = tx;
        let newTy = ty;
        if (anchorX != null && anchorY != null) {
          const factor = target / scale;
          newTx = anchorX - (anchorX - tx) * factor;
          newTy = anchorY - (anchorY - ty) * factor;
        }
        const clamped = clampTranslate(target, newTx, newTy);
        setScale(target);
        setTx(clamped.x);
        setTy(clamped.y);
      }
      if (wasZoomed !== isZoomed) onZoomChange?.(isZoomed);
      if (target > 1) reportZoom(target);
    },
    [scale, tx, ty, clampTranslate, onZoomChange, reportZoom],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const cx = e.clientX - rect.left - rect.width / 2;
      const cy = e.clientY - rect.top - rect.height / 2;
      const delta = -Math.sign(e.deltaY) * WHEEL_STEP;
      applyScale(scale + delta, cx, cy);
    },
    [scale, applyScale],
  );

  const onDoubleClick = useCallback(() => {
    applyScale(scale >= ZOOM_THRESHOLD ? 1 : 2);
  }, [scale, applyScale]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (scale < ZOOM_THRESHOLD) return;
      draggingRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    },
    [scale, tx, ty],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const d = draggingRef.current;
      if (!d) return;
      const nextTx = d.tx + (e.clientX - d.x);
      const nextTy = d.ty + (e.clientY - d.y);
      const clamped = clampTranslate(scale, nextTx, nextTy);
      setTx(clamped.x);
      setTy(clamped.y);
    },
    [scale, clampTranslate],
  );

  const onMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && scale > 1) applyScale(1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scale, applyScale]);

  // RN-Web maps style.transform → CSS transform. Wrap in a DOM div for
  // the wheel/mouse handlers — RN-Web's Pressable doesn't expose
  // onWheel, and we need stopPropagation/preventDefault native on the
  // wheel event to prevent page scroll while zooming.
  const transitionStyle = reduceMotion
    ? undefined
    : ({ transition: 'transform 120ms ease-out' } as React.CSSProperties);

  return (
    <View style={[styles.wrap, wrapStyle, { width, height }]} accessible accessibilityLabel={accessibilityLabel}>
      {underlay}
      <div
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={{ width, height, overflow: 'hidden', cursor: scale > 1 ? 'grab' : 'zoom-in', ...(transitionStyle as any) }}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <Image
          source={{ uri }}
          style={[
            styles.image,
            // RN-Web translates this to CSS `transform: scale(...) translate(...)`.
            { transform: [{ translateX: tx }, { translateY: ty }, { scale }] },
            { width, height },
          ]}
          resizeMode="cover"
        />
      </div>
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
