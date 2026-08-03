import { expect, type Locator } from '@playwright/test';

/**
 * Waits until React has hydrated a specific element, so a click on it is a real
 * interaction rather than a no-op on server-rendered markup.
 *
 * The landing page server-renders its driver cards, which means they are
 * present, visible and enabled long before React owns them — measured at 100ms
 * for the markup versus 450ms for hydration on a warm local build. Playwright
 * happily clicks in that window and nothing happens. This was a fixed
 * `waitForTimeout(500)`, which left ~50ms of margin and duly failed on CI's
 * slower runners: the click landed early, no pick registered, and the assertion
 * saw "5 left" instead of "4 left".
 *
 * React tags each hydrated DOM node with a `__reactFiber$<key>` property, so
 * asking the exact element we are about to click is a precise signal — better
 * than a root-level marker, which React sets when the root is created rather
 * than when this node is hydrated.
 */
export async function waitForHydration(locator: Locator, timeout = 15_000) {
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith('__reactFiber$')),
        ),
      {
        timeout,
        message: 'element was never hydrated by React',
      },
    )
    .toBe(true);
}
