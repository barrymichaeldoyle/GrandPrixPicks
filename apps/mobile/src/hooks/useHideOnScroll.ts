import { useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { nextHideOffset, snapHideOffset } from '../lib/hideOnScroll';

const SNAP_MS = 160;

/**
 * Hide-on-scroll for the tab chrome. The bar tracks the finger, snaps when
 * the gesture ends, and always returns when the list is back at the top.
 *
 * Pair with `CollapsingChrome` + the returned `scrollProps` on the screen's
 * list. The chrome is a sibling of the list, not inside it: collapsing it
 * must reclaim the space, not leave a gap and not scroll away with the hero.
 *
 * `sheetStyle` is a transform, never a layout property. The first version set
 * a negative `marginTop` on the bar, which resized the list on every scroll
 * frame while the bar moved: each resize re-laid out the list, re-measured its
 * viewport and clamped its offset, so content moved twice as far as the
 * finger and the rows stuttered. Sliding the whole sheet (bar + list, drawn
 * one bar taller than the screen) costs nothing on the UI thread and the list
 * never learns the bar moved.
 */
export function useHideOnScroll() {
  const hiddenPx = useSharedValue(0);
  const lastY = useRef(0);
  const offset = useRef(0);

  function apply(next: number, snap: boolean) {
    offset.current = next;
    // Reanimated shared values are mutated by assignment; that is the API.
    // oxlint-disable-next-line react/immutability
    hiddenPx.value = snap ? withTiming(next, { duration: SNAP_MS }) : next;
  }

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const y = Math.max(0, contentOffset.y);
    const dy = y - lastY.current;
    lastY.current = y;
    const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
    apply(nextHideOffset({ y, dy, current: offset.current, maxY }), y <= 8);
  }

  function onScrollEndDrag(event: NativeSyntheticEvent<NativeScrollEvent>) {
    // Momentum will keep scrolling; snap once it actually stops, or the snap
    // fights the next onScroll ticks.
    if (Math.abs(event.nativeEvent.velocity?.y ?? 0) < 0.2) {
      apply(snapHideOffset(offset.current), true);
    }
  }

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -hiddenPx.value }],
  }));

  return {
    sheetStyle,
    scrollProps: {
      onMomentumScrollEnd: () => apply(snapHideOffset(offset.current), true),
      onScroll,
      onScrollEndDrag,
      onScrollToTop: () => apply(0, true),
      scrollEventThrottle: 16 as const,
    },
  };
}
