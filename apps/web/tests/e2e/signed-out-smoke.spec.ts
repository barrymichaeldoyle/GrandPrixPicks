import { expect, test, type Page } from '@playwright/test';

/**
 * Every public route must render for a visitor who is not signed in.
 *
 * This exists because `/races/*` and `/leaderboard?scope=following` shipped
 * completely broken for signed-out visitors and stayed that way for a week.
 * Components in both subtrees mounted Clerk's own `SignInButton` / `useAuth`
 * on routes that deliberately render without a `ClerkProvider`; Clerk's
 * components throw rather than degrade, so the throw took the whole route into
 * the error boundary. A reminder email deep-linking to a race landed on "It's
 * broken".
 *
 * Nothing caught it. SSR returns a healthy 200 with the full driver grid, so
 * curl and the SEO checks were happy — the page only died on hydration, and
 * only for visitors without a session. The rest of the suite never opened a
 * real race page signed out (only `/races/not-a-real-race`), and no spec
 * anywhere asserted on uncaught errors.
 *
 * So this sweep is deliberately shallow and wide: it asserts almost nothing
 * about what a page says, only that it renders at all. Depth belongs in the
 * per-page specs. What is not covered here is any route that needs a session
 * to be interesting — those are the auth suite's, and a signed-out visitor
 * gets the sign-in gate on them, which is a successful render, not a failure.
 *
 * `lint:clerk-free` catches the same class of bug statically and runs in a
 * fraction of the time; it cannot see a component reached dynamically, or any
 * other reason a route might throw for an anonymous viewer. This is the
 * runtime backstop.
 */

/**
 * Uncaught errors that are about the harness rather than the page. Kept
 * deliberately short: every entry is a hole in the check.
 */
const IGNORED_ERROR_PATTERNS = [
  // A navigation that starts while the previous one is still settling. An
  // artefact of driving pages back to back, not something a visitor hits.
  /Execution context was destroyed/i,
  // Third-party script or chunk fetch killed by the network. Sentry drops
  // these in production for the same reason (see beforeSend in router.tsx).
  /failed to load script/i,
  /failed_to_load_clerk_ui/i,
];

/**
 * Routes reachable by a signed-out visitor: everything a search result, a
 * shared link or a reminder email can drop someone onto.
 *
 * The gated routes are here on purpose. A signed-out visitor is meant to get
 * `SignInPrompt` on the route's own URL rather than a redirect, so "does it
 * render" is exactly the right question for them too — and `/feed` and
 * `/notifications` render viewer-scoped shells that are prime candidates for
 * the same mistake.
 */
const PUBLIC_ROUTES = [
  '/',
  '/races',
  '/leaderboard',
  // The Following tab was one of the two crashes: a scope only a signed-in
  // viewer can have data for, on a route that renders without Clerk.
  '/leaderboard?scope=following',
  '/leaderboard?time=weekend',
  '/leagues',
  '/guides',
  '/how-to-play',
  '/about',
  '/pricing',
  '/support',
  '/sign-in',
  '/f1-standings',
  '/f1-team-mate-battles',
  '/f1-2027-calendar',
  '/circuits',
  '/terms',
  '/privacy',
  '/refund-policy',
  '/results-policy',
  '/feed',
  '/notifications',
  '/settings',
  '/me',
];

/**
 * Loads a route as an anonymous visitor and fails if anything threw or if the
 * router fell through to its error component.
 *
 * `networkidle` rather than `load`: the failure this guards against happens
 * when the client boots and React hydrates, which is after `load` fires. A
 * check that runs any earlier passes on exactly the markup that was never the
 * problem.
 */
async function expectRendersSignedOut(page: Page, route: string) {
  const errors: string[] = [];
  const onPageError = (error: Error) => {
    const message = error.message || String(error);
    if (!IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
      errors.push(message);
    }
  };

  page.on('pageerror', onPageError);
  try {
    const response = await page.goto(route, { waitUntil: 'networkidle' });
    expect(response?.status(), `${route} responded ${response?.status()}`).toBe(
      200,
    );

    await expect(
      page.getByTestId('error-fallback'),
      `${route} rendered the error boundary for a signed-out visitor`,
    ).toHaveCount(0);

    // A rendered page fills the root landmark. Without this the check would
    // pass on a blank body, which is the other shape this failure takes.
    await expect(
      page.locator('#main-content'),
      `${route} rendered no main`,
    ).toBeVisible();

    // `__root` owns the only `<main>`. Four pages used to nest a second one
    // inside it — invalid HTML, and two landmarks where a screen reader
    // expects one. Cheap to assert here, and nothing else was checking it:
    // the a11y suite covers four routes, none of which were among them.
    await expect(
      page.locator('main'),
      `${route} rendered more than one <main>`,
    ).toHaveCount(1);

    expect(errors, `${route} threw for a signed-out visitor`).toEqual([]);
  } finally {
    page.off('pageerror', onPageError);
  }
}

test.describe('[public] signed-out smoke', () => {
  // The public project carries no storage state, so these pages are already
  // anonymous. Clearing cookies keeps that true even if a shared context picks
  // one up from an earlier navigation.
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders signed out`, async ({ page }) => {
      await expectRendersSignedOut(page, route);
    });
  }
});

test.describe('[public] signed-out race detail', () => {
  test('the next race renders its signed-out preview', async ({
    page,
    context,
  }) => {
    await context.clearCookies();

    // Deliberately not seeded. The preview only renders for the race that is
    // *next*, so seeding one here would make this spec the next race for every
    // spec that runs after it -- which is exactly what happened: the flow smoke
    // tests started failing with "Team-mate battles are only open for the next
    // race" because they were pointed at a race this file had displaced.
    //
    // A smoke sweep should observe the app, not reshape it. The calendar
    // already names the next race, so read it from there.
    await page.goto('/races', { waitUntil: 'networkidle' });
    const nextRaceLink = page
      .getByRole('link')
      .filter({ hasText: 'Next Race' })
      .first();
    await expect(
      nextRaceLink,
      'the race calendar named no next race',
    ).toBeVisible();
    const nextRaceHref = await nextRaceLink.getAttribute('href');
    expect(nextRaceHref).toBeTruthy();

    await expectRendersSignedOut(page, nextRaceHref!);

    // The preview is the point of leaving this route Clerk-free: a signed-out
    // visitor gets real content and a way in, not a gate.
    await expect(
      page.getByRole('button', { name: 'Make your free picks' }),
    ).toBeVisible();

    // Prompting for sign-in must not need a provider on the page. This is the
    // call that used to throw.
    await page
      .getByRole('button', { name: 'Already playing? Sign in' })
      .click();
    await expect(page.getByTestId('error-fallback')).toHaveCount(0);
  });
});
