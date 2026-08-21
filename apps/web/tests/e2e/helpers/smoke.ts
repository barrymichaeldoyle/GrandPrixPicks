import { expect, type Page } from '@playwright/test';

import { createE2EClerkIdentity } from './clerk';
import { applyScenario } from './scenarios';

export const PLAYWRIGHT_AUTH_NAMESPACE = 'playwright_auth_primary';

type SignInScenarioOptions = {
  scenario: string;
  namespace: string;
  targetPath?: string;
};

export async function seedScenarioForAuthenticatedUser(
  page: Page,
  options: SignInScenarioOptions,
) {
  await clearScenarioClientState(page);

  const clerkIdentity = await createE2EClerkIdentity(PLAYWRIGHT_AUTH_NAMESPACE);
  const summary = applyScenario(options.scenario, {
    namespace: options.namespace,
    primaryClerkUserId: clerkIdentity.userId,
    primaryEmail: clerkIdentity.email,
    primaryDisplayName: clerkIdentity.displayName,
  });

  await page.goto(options.targetPath ?? summary.routes!.webRaceDetail);
  await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
  if (!options.targetPath) {
    await waitForRacePageReady(page);
  }
  return { clerkIdentity, summary };
}

/**
 * Waits for the race page to stop loading.
 *
 * It paints an `InlineLoader` in place of the whole body until the viewer's own
 * Convex subscriptions resolve -- the weekend predictions and the H2H picks --
 * and immediately after seeding a scenario those start cold, against data that
 * was written milliseconds ago. Every assertion about the body was therefore
 * racing that resolve on a 5s default, which is where the H2H flake came from:
 * the failure was always "race-h2h-section not visible", and the snapshot
 * always showed a page with a header, a footer and nothing in between.
 *
 * This waits on the loader going away rather than on any particular thing
 * arriving, because what arrives depends on the race: a viewer with picks gets
 * the sections, a viewer with none gets the start-picks CTA, and a finished
 * race gets the results view. Waiting for one of those is waiting for the wrong
 * one two times in three.
 *
 * Safe to check for absence: the caller has already waited on
 * `header-user-authenticated`, so the app has hydrated and the route has
 * committed either its loader or its content by now.
 */
async function waitForRacePageReady(page: Page) {
  await expect(page.getByTestId('race-page-loading')).toHaveCount(0, {
    timeout: 30_000,
  });
}

export async function pickFirstFiveDrivers(page: Page) {
  const driverCodes = ['NOR', 'PIA', 'LEC', 'HAM', 'VER'] as const;

  for (const code of driverCodes) {
    await page.getByTestId(`driver-${code}`).click();
  }
}

async function clearScenarioClientState(page: Page) {
  await page.addInitScript(() => {
    for (const key of Object.keys(window.localStorage)) {
      if (
        key === 'gpp:dev-now' ||
        key.startsWith('gpp:web:h2h:') ||
        key.startsWith('gpp:web:top5:')
      ) {
        window.localStorage.removeItem(key);
      }
    }
  });
}
