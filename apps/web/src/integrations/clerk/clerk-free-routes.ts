/**
 * Routes a signed-out visitor can be served without Clerk on the page at all.
 *
 * A logged-out visitor to a content page was downloading about 365 kB of auth
 * runtime to be told they are logged out. The home page already avoided it, and
 * everything that made that possible is route-agnostic: the anonymous branch in
 * `__root` supplies the viewer session, anonymous Convex auth and a sign-in
 * modal that boots on demand. The only thing tying the saving to `/` was this
 * list not existing.
 *
 * ## Why an allowlist
 *
 * Getting this wrong in the permissive direction throws: Clerk's own components
 * (`SignInButton` and friends) require a provider, so a route that renders one
 * and is wrongly marked Clerk-free is a blank page, not a slow one. Listing the
 * safe routes means a new route is only ever too slow until someone adds it,
 * which is the failure worth having.
 *
 * A route belongs here when it renders no Clerk component directly. Prompting
 * for sign-in does not count against it: `SignInPrompt`, the pick forms and
 * `SignInActionButton` all go through `requestSignIn`, which is the
 * provider-free path. What disqualifies a route is mounting one of Clerk's own
 * components, which need a provider around them, or reading viewer-scoped data
 * that only exists once Clerk has booted.
 *
 * /sign-in is on the list and is not a contradiction: the page is a button that
 * opens the modal, and the modal has never needed the page to be wrapped.
 *
 * Signed-in visitors never reach this list — `clerkRequired` short-circuits on
 * `initialSignedIn` before consulting it — so these are the anonymous renders
 * only.
 */
const CLERK_FREE_EXACT = new Set([
  '/',
  '/about',
  '/f1-2026-italian-grand-prix-predictions',
  '/f1-2027-calendar',
  '/f1-standings',
  '/f1-team-mate-battles',
  '/guides',
  '/how-to-play',
  '/leaderboard',
  '/leagues',
  '/pricing',
  '/privacy',
  '/races',
  '/refund-policy',
  '/results-policy',
  '/sign-in',
  '/support',
  '/terms',
]);

/** Prefixes whose whole subtree is public content: race pages, guides. */
const CLERK_FREE_PREFIXES = ['/races/', '/guides/'];

/** Trailing slashes and casing vary by how a link was written or pasted. */
function normalize(pathname: string): string {
  const lower = pathname.toLowerCase();
  return lower.length > 1 ? lower.replace(/\/+$/, '') : lower;
}

export function isClerkFreeRoute(pathname: string): boolean {
  const path = normalize(pathname);
  if (CLERK_FREE_EXACT.has(path)) {
    return true;
  }
  return CLERK_FREE_PREFIXES.some((prefix) => path.startsWith(prefix));
}
