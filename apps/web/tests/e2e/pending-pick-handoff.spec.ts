import { expect, test, type Page } from '@playwright/test';

import {
  createE2EClerkIdentity,
  signInE2EClerkIdentity,
} from './helpers/clerk';
import { waitForHydration } from './helpers/hydration';

/**
 * The conversion path, end to end: a stranger builds a full card signed out,
 * signs in, and the card is in the database when they land.
 *
 * Every piece of this was already tested and the path as a whole was not.
 * `PendingPickSubmitter.test.tsx` drives the drain directly with a hand-seeded
 * storage entry and mocked mutations, so it proves the component works in
 * isolation; nothing proved it is *reached*. It is mounted on one branch of a
 * conditional in `__root.tsx` -- signed-out visitors on a public route render a
 * Clerk-free tree that does not contain it, and the tree that does only mounts
 * once `clerkRequired` flips. A refactor that moved the mount outside
 * `AuthCurtainHost`, or that left the anonymous branch rendering after auth
 * landed, would drop every anonymous player's picks on the floor with the unit
 * test still green.
 *
 * That is not a hypothetical failure mode here: it is the bug that shipped
 * once. `HomePage` swaps the public page for the dashboard on the same commit
 * that auth lands, so the in-form recovery both pickers carry never ran, and
 * players who had done the entire card were met by a dashboard asking them to
 * make their picks.
 *
 * It earned its place immediately: it caught `submitH2HPredictions` being sent
 * before the Top 5 it depends on, which silently dropped the Head-to-Head half
 * of every first-time player's card. See `orderTopFiveFirst`.
 *
 * Asserting on storage rather than on the dashboard is deliberate, and it is a
 * stronger check than it looks. The drain clears the draft only after its
 * mutation resolves -- a failed submit clears the intent flag and *keeps* the
 * draft, precisely so the picker can restore it -- so "the draft is gone" is
 * only reachable through a successful write. A dashboard assertion would prove
 * less and break on every copy change.
 */

const DRAFT_KEY_PREFIXES = ['gpp:web:top5:', 'gpp:web:h2h:'];
const PENDING_SUBMIT_SUFFIX = ':pending-submit';

/** Draft keys the landing card has written, whatever race is next today. */
async function readDraftKeys(page: Page) {
  return await page.evaluate((prefixes) => {
    return Object.keys(window.localStorage).filter((key) =>
      prefixes.some((prefix) => key.startsWith(prefix)),
    );
  }, DRAFT_KEY_PREFIXES);
}

async function readPendingKeys(page: Page) {
  return await page.evaluate((suffix) => {
    const keys: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key?.endsWith(suffix)) {
        keys.push(key);
      }
    }
    return keys;
  }, PENDING_SUBMIT_SUFFIX);
}

test.describe('[public] anonymous pick handoff', () => {
  test('saves a card built before sign-in', async ({ page }) => {
    // Three round trips to Clerk plus a full card of picks.
    test.setTimeout(120_000);

    // A new identity every run, which is load-bearing rather than tidy.
    //
    // The gate this protects only rejects a player with no Top 5 on file, so
    // the bug is invisible on any account that has ever submitted one. A stable
    // namespace would fail once, on the day it was written, and pass for the
    // rest of the repository's life -- a guard that stops guarding after its
    // first run. A fresh user puts every run back in the only state that can
    // detect it: a first-ever submission.
    //
    // The prefix keeps them identifiable in the Clerk dev instance, and they
    // are the same order of cost as the namespaced users the seeded scenarios
    // already create.
    const identity = await createE2EClerkIdentity(
      `playwright_pending_pick_handoff_${Date.now()}`,
    );

    await page.goto('/');

    // Server-rendered, so the buttons are clickable well before React attaches
    // the draft handlers that this test is entirely about.
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
    const driverButtons = page.locator(
      'button[data-testid^="driver-"]:not([disabled])',
    );
    await waitForHydration(driverButtons.first());
    for (let pick = 0; pick < 5; pick += 1) {
      await driverButtons.first().click();
    }

    await page
      .getByRole('button', { name: 'Continue to team-mate picks' })
      .click();
    await expect(page.getByText('Step 2 of 2')).toBeVisible();

    // Every duel, because the save wall is what this test needs and it only
    // appears on a complete card. The picker advances itself, so clicking the
    // first live option repeatedly walks the whole set.
    const duelOption = page.locator(
      '[data-testid="h2h-duel-picker"] button[aria-label^="Pick"]',
    );
    const saveWall = page.getByTestId('h2h-save-wall');
    for (let duel = 0; duel < 11; duel += 1) {
      if (await saveWall.isVisible()) {
        break;
      }
      await duelOption.first().click();
    }
    await expect(saveWall).toBeVisible();

    const draftKeys = await readDraftKeys(page);
    expect(
      draftKeys.length,
      'the signed-out card wrote no draft to localStorage',
    ).toBeGreaterThan(0);

    // The real button, not a synthetic flag write: setting the intent is half
    // of what this path has to get right, and it lives in the forms.
    await page.getByRole('button', { name: 'Sign in to submit' }).click();
    await expect
      .poll(async () => (await readPendingKeys(page)).length, {
        message: 'pressing save recorded no pending-submit intent',
      })
      .toBeGreaterThan(0);

    // Stands in for finishing the Clerk modal. The modal itself cannot be
    // driven from a test -- it is Clerk's own UI on Clerk's origin -- and what
    // matters downstream is identical either way: a session arrives in a tab
    // whose storage holds a flagged draft.
    await signInE2EClerkIdentity(page, identity, '/');

    await expect
      .poll(async () => await readDraftKeys(page), {
        message:
          'the picks built before sign-in were never submitted: their drafts are still in localStorage',
        timeout: 30_000,
      })
      .toEqual([]);

    // The intent has to go too, or every page load for the rest of the session
    // re-submits the same card.
    expect(await readPendingKeys(page)).toEqual([]);
  });
});
