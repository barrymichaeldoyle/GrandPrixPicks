import { expect, test } from '@playwright/test';

import { waitForHydration } from './helpers/hydration';
import { applyScenario } from './helpers/scenarios';

test.describe('[public] smoke', () => {
  test('uses the public landing experience at the home URL', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', {
        name: "Everyone's a strategist on Sunday. Prove it.",
      }),
    ).toBeVisible();
    const header = page.getByRole('banner');
    await expect(
      header.getByRole('link', { name: 'How it works' }),
    ).toBeVisible();
    // The landing page owns its own CTA, so the header does not repeat it here
    // — the hero button and then the deadline strip carry the action instead.
    await expect(
      header.getByRole('link', { name: 'Make your picks' }),
    ).toBeHidden();
    await expect(
      page.getByRole('link', { name: 'Make your picks' }).first(),
    ).toBeVisible();
    await expect(header.getByTestId('header-sign-in-button')).toBeVisible();
    await expect(page.getByText('Dashboard', { exact: true })).toHaveCount(0);

    // Driver buttons are server-rendered, so they are clickable well before
    // React attaches the draft handlers. Wait for the real thing rather than a
    // fixed sleep — see waitForHydration.
    await expect(page.getByText('Step 1 of 2')).toBeVisible();
    const driverButtons = page.locator(
      'button[data-testid^="driver-"]:not([disabled])',
    );
    await waitForHydration(driverButtons.first());
    for (let pick = 0; pick < 5; pick += 1) {
      await driverButtons.first().click();
      if (pick < 4) {
        await expect(page.getByTestId('picks-remaining')).toContainText(
          `${4 - pick} left`,
        );
      }
    }
    // Filling the fifth slot no longer swaps the panel on its own: the player
    // gets their finished order to check and moves on when they choose to.
    await page
      .getByRole('button', { name: 'Continue to team-mate picks' })
      .click();

    await expect(page.getByText('Step 2 of 2')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Pick each team-mate winner' }),
    ).toBeVisible();
    await expect(page.getByTestId('h2h-duel-progress')).toHaveText(
      'Team-mate pick 1 of 11',
    );
    await page
      .locator('[data-testid="h2h-duel-picker"] button[aria-label^="Pick"]')
      .first()
      .click();
    await expect(page.getByTestId('h2h-duel-progress')).toHaveText(
      'Team-mate pick 2 of 11',
    );

    await page.goto('/how-to-play');
    const guideHeader = page.getByRole('banner');
    await expect(
      guideHeader.getByRole('link', { name: 'How it works' }),
    ).toBeVisible();
    await expect(
      guideHeader.getByRole('link', { name: 'Make your picks' }),
    ).toHaveAttribute('href', '/#make-picks');
    await expect(
      guideHeader.getByTestId('header-sign-in-button'),
    ).toBeVisible();
    await expect(
      guideHeader.getByRole('link', { name: 'Races', exact: true }),
    ).toHaveCount(0);
  });

  test('loads a seeded sprint weekend route', async ({ page }) => {
    const summary = applyScenario('race_partial_results_sprint', {
      namespace: 'scenario__race_partial_results_sprint__pw',
    });

    expect(summary.routes?.webRaceDetail).toBeTruthy();
    expect(summary.race?.name).toBeTruthy();

    await page.goto(summary.routes!.webRaceDetail);

    await expect(
      page.getByRole('heading', { name: summary.race!.name }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sprint Quali/i }),
    ).toBeVisible();
  });

  test('shows scored-result summaries on a finished seeded race page', async ({
    page,
  }) => {
    const summary = applyScenario('race_finished_scored_h2h_standard', {
      namespace: 'scenario__race_finished_scored_h2h_standard__pw',
    });

    await page.goto(summary.routes!.webRaceDetail);

    await expect(
      page.getByRole('heading', { name: summary.race!.name }),
    ).toBeVisible();
    // Scoring progress is public, so the summary renders for a signed-out
    // reader. The points inside it are the viewer's own and would always be
    // "+0 pts" here, so they are withheld rather than shown as a zero.
    const resultsSummary = page.getByTestId('race-results-summary');
    await expect(resultsSummary).toBeVisible();
    await expect(resultsSummary).toContainText('All sessions scored');
    await expect(resultsSummary).not.toContainText('pts');
    await expect(resultsSummary).not.toContainText('Weekend Total');

    // Same split for the breakdown: the classification is public, the
    // viewer's per-session points are not.
    await expect(page.getByTestId('session-points-breakdown')).toBeVisible();
    await expect(page.getByText('Session Results')).toBeVisible();
    await expect(page.getByText('Session Points Breakdown')).toHaveCount(0);
  });
});
