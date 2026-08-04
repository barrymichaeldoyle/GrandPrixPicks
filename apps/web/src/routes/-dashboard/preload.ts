import { hasClerkSessionCookie } from '@/integrations/clerk/session-cookie';

/**
 * The signed-in dashboard is lazy so the landing page never pays for it: it
 * carries the rail cards, the feed and the weekend picks card behind it, and
 * the logged-out visitor is the one we are optimising for on `/`.
 *
 * The cost of that split used to land on every signed-in mobile load. SSR
 * renders the real dashboard, but hydration reached the `lazy()` boundary
 * before the chunk had even been requested, so React replaced the server's
 * markup with the Suspense fallback and the page visibly went backwards: the
 * weekend card, the Activity heading and the rail cards all vanished for a beat
 * and came back. On a throttled phone that swap was measured at ~1.2s wide, and
 * it was ~98% of the page's cumulative layout shift as well as the thing
 * setting LCP.
 *
 * So: keep the split, but stop discovering it late. {@link preloadDashboardPage}
 * is called at module scope of the `/` route (see `routes/index.tsx`), which
 * lives in the entry chunk and therefore runs several hundred ms before
 * hydration renders `HomePage`. By the time the `lazy()` resolves, the module
 * cache already has it and no fallback is ever committed.
 *
 * Memoised, so the module-scope call and the `lazy()` call share one request.
 */
let dashboardModulePromise: Promise<typeof import('./DashboardPage')> | null =
  null;

export function preloadDashboardPage() {
  dashboardModulePromise ??= import('./DashboardPage');
  return dashboardModulePromise;
}

/**
 * Fetch the dashboard chunk now if this browser is carrying a Clerk session.
 *
 * Gated rather than unconditional: preloading for everyone would put the
 * dashboard's own weight back on the landing page, which is exactly what the
 * `lazy()` exists to prevent. Signed-out visitors are unaffected.
 *
 * No-op during SSR, and safe to call more than once.
 */
export function preloadDashboardForReturningViewer(): void {
  if (!hasClerkSessionCookie()) {
    return;
  }

  void preloadDashboardPage();
}
