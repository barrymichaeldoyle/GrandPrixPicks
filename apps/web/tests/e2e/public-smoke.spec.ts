import { expect, test } from '@playwright/test';

import { applyScenario } from './helpers/scenarios';

test.describe('[public] smoke', () => {
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
    await expect(page.getByText(/Sprint/i)).toBeVisible();
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
    await expect(page.getByTestId('race-results-summary')).toBeVisible();
    await expect(page.getByTestId('race-results-summary')).toContainText(
      'Weekend Total',
    );
    await expect(page.getByTestId('session-points-breakdown')).toBeVisible();
    await expect(page.getByText('Session Points Breakdown')).toBeVisible();
  });
});
