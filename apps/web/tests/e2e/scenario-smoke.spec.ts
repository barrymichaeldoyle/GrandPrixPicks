import { expect, test } from '@playwright/test';

import { applyScenario } from './helpers/scenarios';

test.describe('scenario smoke', () => {
  test('loads a seeded sprint weekend route', async ({ page }) => {
    const summary = applyScenario(
      'race_partial_results_sprint',
      'scenario__race_partial_results_sprint__pw',
    );

    expect(summary.routes?.webRaceDetail).toBeTruthy();
    expect(summary.race?.name).toBeTruthy();

    await page.goto(summary.routes!.webRaceDetail);

    await expect(
      page.getByRole('heading', { name: summary.race!.name }),
    ).toBeVisible();
    await expect(page.getByText(/Sprint/i)).toBeVisible();
  });

  test('reacts to dev time overrides on a public seeded race page', async ({
    page,
  }) => {
    const summary = applyScenario(
      'race_finished_scored_standard',
      'scenario__race_finished_scored_standard__pw',
    );

    await page.goto(summary.routes!.webRaceDetail);

    const devTimeButton = page.getByTestId('dev-now-trigger');
    await expect(devTimeButton).toBeVisible();
    await expect(page.getByTestId('dev-now-panel')).toHaveAttribute(
      'data-override-active',
      'false',
    );

    const overrideTimestamp = Date.now() + 60 * 60 * 1000;
    await page.evaluate((timestamp) => {
      window.localStorage.setItem('gpp:dev-now', String(timestamp));
      window.dispatchEvent(new CustomEvent('gpp:dev-now-change'));
    }, overrideTimestamp);

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('gpp:dev-now')))
      .toBe(String(overrideTimestamp));
    await expect(page.getByTestId('dev-now-panel')).toHaveAttribute(
      'data-override-active',
      'true',
    );

    await page.getByTestId('dev-now-trigger').click();
    await expect(page.getByTestId('dev-now-panel-content')).toBeVisible();
    await expect(page.getByTestId('dev-now-status')).toContainText(
      'Override active',
    );

    await page.evaluate(() => {
      window.localStorage.removeItem('gpp:dev-now');
      window.dispatchEvent(new CustomEvent('gpp:dev-now-change'));
    });

    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('gpp:dev-now')))
      .toBeNull();
    await expect(page.getByTestId('dev-now-panel')).toHaveAttribute(
      'data-override-active',
      'false',
    );
  });
});
