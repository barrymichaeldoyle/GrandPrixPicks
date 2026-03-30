import { expect, test } from '@playwright/test';

import {
  createE2EClerkIdentity,
  signInE2EClerkIdentity,
} from './helpers/clerk';
import { applyScenario } from './helpers/scenarios';

test.describe('scenario smoke', () => {
  async function pickFirstFiveDrivers(page: import('@playwright/test').Page) {
    const driverCodes = ['NOR', 'PIA', 'LEC', 'HAM', 'VER'] as const;

    for (const code of driverCodes) {
      await page.getByTestId(`driver-${code}`).click();
    }
  }

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

  test('reacts to dev time overrides on a public seeded race page', async ({
    page,
  }) => {
    const summary = applyScenario('race_finished_scored_standard', {
      namespace: 'scenario__race_finished_scored_standard__pw',
    });

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
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('gpp:dev-now')),
      )
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
      .poll(() =>
        page.evaluate(() => window.localStorage.getItem('gpp:dev-now')),
      )
      .toBeNull();
    await expect(page.getByTestId('dev-now-panel')).toHaveAttribute(
      'data-override-active',
      'false',
    );
  });

  test('shows signed-in header controls for the seeded primary actor', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const namespace = 'scenario__race_upcoming_signed_in_complete__pwauth';
    const clerkIdentity = await createE2EClerkIdentity(namespace);
    const summary = applyScenario('race_upcoming_signed_in_complete', {
      namespace,
      primaryClerkUserId: clerkIdentity.userId,
      primaryEmail: clerkIdentity.email,
      primaryDisplayName: clerkIdentity.displayName,
    });

    await signInE2EClerkIdentity(page, clerkIdentity, summary.routes!.webRaceDetail);

    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('header-sign-in-button')).toHaveCount(0);
  });

  test('shows seeded owner prediction sections for an authenticated locked H2H scenario', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const namespace =
      'scenario__race_locked_signed_in_complete_h2h_no_results__pwauth';
    const clerkIdentity = await createE2EClerkIdentity(namespace);
    const summary = applyScenario('race_locked_signed_in_complete_h2h_no_results', {
      namespace,
      primaryClerkUserId: clerkIdentity.userId,
      primaryEmail: clerkIdentity.email,
      primaryDisplayName: clerkIdentity.displayName,
    });

    await signInE2EClerkIdentity(
      page,
      clerkIdentity,
      `${summary.routes!.webRaceDetail}?session=quali`,
    );

    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('race-top5-section')).toBeVisible();
    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await expect(page.getByText('Top 5 Predictions')).toBeVisible();
    await expect(page.getByText('Head-to-Head Predictions')).toBeVisible();
  });

  test('submits top 5 predictions for an authenticated open scenario', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const namespace = 'scenario__race_upcoming_signed_in_no_picks__pwauth';
    const clerkIdentity = await createE2EClerkIdentity(namespace);
    const summary = applyScenario('race_upcoming_signed_in_no_picks', {
      namespace,
      primaryClerkUserId: clerkIdentity.userId,
      primaryEmail: clerkIdentity.email,
      primaryDisplayName: clerkIdentity.displayName,
    });

    await signInE2EClerkIdentity(
      page,
      clerkIdentity,
      summary.routes!.webRaceDetail,
    );

    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('your-picks')).toBeVisible();
    await expect(page.getByTestId('submit-prediction')).toBeDisabled();

    await pickFirstFiveDrivers(page);

    await expect(page.getByTestId('submit-prediction')).toBeEnabled();
    await page.getByTestId('submit-prediction').click();

    await expect(page.getByTestId('race-top5-section')).toBeVisible();
    await expect(page.getByText('Top 5 Predictions')).toBeVisible();
    await expect(page.getByTestId('your-picks')).toHaveCount(0);
  });

  test('allows H2H editing before lock and becomes locked after a dev-time shift', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const namespace = 'scenario__race_upcoming_signed_in_complete_h2h__lockshift';
    const clerkIdentity = await createE2EClerkIdentity(namespace);
    const summary = applyScenario('race_upcoming_signed_in_complete_h2h', {
      namespace,
      primaryClerkUserId: clerkIdentity.userId,
      primaryEmail: clerkIdentity.email,
      primaryDisplayName: clerkIdentity.displayName,
    });

    await signInE2EClerkIdentity(
      page,
      clerkIdentity,
      summary.routes!.webRaceDetail,
    );

    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await expect(page.getByTestId('h2h-edit-button')).toBeVisible();
    await expect(page.getByTestId('h2h-locked-badge')).toHaveCount(0);

    await page.getByTestId('dev-now-trigger').click();
    await expect(page.getByTestId('dev-now-panel-content')).toBeVisible();
    await page.getByTestId('dev-now-preset-1m-after-race-lock').click();

    await expect(page.getByTestId('dev-now-panel')).toHaveAttribute(
      'data-override-active',
      'true',
    );
    await expect(page.getByTestId('h2h-edit-button')).toHaveCount(0);
    await expect(page.getByTestId('h2h-locked-badge')).toBeVisible();
  });
});
