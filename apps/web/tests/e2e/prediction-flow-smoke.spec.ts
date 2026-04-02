import { expect, test } from '@playwright/test';

import {
  pickFirstFiveDrivers,
  seedScenarioForAuthenticatedUser,
} from './helpers/smoke';

test.describe('[flow] smoke', () => {
  test('submits top 5 predictions for an authenticated open scenario', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_no_picks',
      namespace: 'scenario__race_upcoming_signed_in_no_picks__pwauth',
    });

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

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_complete_h2h',
      namespace: 'scenario__race_upcoming_signed_in_complete_h2h__lockshift',
    });

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

  test('edits and persists an existing H2H pick before lock', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_complete_h2h',
      namespace: 'scenario__race_upcoming_signed_in_complete_h2h__edit',
    });

    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await page.getByTestId('h2h-edit-button').click();

    const editablePick = page
      .getByTestId('race-h2h-section')
      .locator('button[aria-pressed="false"]')
      .first();
    const editedPickLabel = await editablePick.getAttribute('aria-label');

    expect(editedPickLabel).toBeTruthy();

    await editablePick.click();
    const submitButton = page
      .getByTestId('race-h2h-section')
      .getByRole('button', { name: 'Save H2H Changes' })
      .first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await expect(page.getByTestId('h2h-edit-button')).toBeVisible();
    await page.getByTestId('h2h-edit-button').click();

    await expect(
      page
        .getByTestId('race-h2h-section')
        .getByRole('button', { name: editedPickLabel! }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
