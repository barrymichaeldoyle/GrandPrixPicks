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
    await expect(
      page.getByRole('tab', { name: /Sprint Quali/i }),
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
