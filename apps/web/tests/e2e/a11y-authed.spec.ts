import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './helpers/a11y';
import { waitForHydration } from './helpers/hydration';
import {
  pickFirstFiveDrivers,
  seedScenarioForAuthenticatedUser,
} from './helpers/smoke';

/**
 * The half of the app `a11y-smoke.spec.ts` cannot reach.
 *
 * That spec runs signed out, and the config excludes it from `auth-chromium`
 * on the grounds that re-running the same four public pages with a session
 * attached would double the runtime to re-check the same DOM. True, and it
 * left every screen that requires an account with no automated coverage at
 * all: the picks flow, the focus overlays, the duel picker. These are not
 * incidental pages. They are the product, and they are by far the most
 * interactive markup in it.
 *
 * Two kinds of gap are closed here, and the second matters more:
 *
 *   1. Signed-in *pages*, which nothing scanned.
 *   2. Signed-in *states*. Every other axe run in this suite fires once, on a
 *      freshly loaded document. A modal that traps focus wrongly, a dialog
 *      with no accessible name, a control whose label only exists while it is
 *      collapsed — none of that is in the first frame of any page. Axe has to
 *      be pointed at the app mid-interaction to see it, so that is what these
 *      do.
 *
 * These seed scenarios, so unlike `sitemap-invariants.spec.ts` they must never
 * be pointed at production.
 */
test.describe('[auth] a11y smoke', () => {
  test('the signed-in dashboard has no WCAG A/AA violations', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_no_picks',
      namespace: 'scenario__a11y_authed__dashboard',
      targetPath: '/',
    });

    const main = page.locator('main');
    await expect(main).toBeVisible();
    await waitForHydration(main);
    await expectNoA11yViolations(page);
  });

  test('the picks overlays have no WCAG A/AA violations while open', async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_no_picks',
      namespace: 'scenario__a11y_authed__picks_overlay',
    });

    // The Top 5 picker, open. This is the drag-and-drop surface, and the one
    // place in the app where the primary interaction is a pointer gesture — so
    // it is where an accessible-name or role defect costs the most.
    await page.getByTestId('top5-start-button').click();
    const overlay = page.getByTestId('picks-focus-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId('your-picks')).toBeVisible();
    await expectNoA11yViolations(page);

    // Then the duel picker, which the Top 5 card hands over to once five
    // drivers are in. A second modal opening on top of a first is exactly the
    // arrangement that produces two dialogs both claiming the document.
    await pickFirstFiveDrivers(page);
    await expect(page.getByTestId('h2h-duel-picker')).toBeVisible();
    await expectNoA11yViolations(page);
  });
});
