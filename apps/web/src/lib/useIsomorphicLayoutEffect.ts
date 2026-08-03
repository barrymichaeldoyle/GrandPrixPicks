import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * For state that only exists in the browser — a `localStorage` draft, a media
 * query — the read cannot happen during render without breaking hydration, so
 * it has to happen in an effect. With `useEffect` the browser paints the
 * server's version first and the restored version a frame later, which is a
 * visible flash; with `useLayoutEffect` React flushes the resulting re-render
 * before the paint, so both land in one frame.
 *
 * `useLayoutEffect` warns when it runs during SSR (it can't do anything there),
 * hence the swap.
 */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
