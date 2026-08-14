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

    await expect(page.getByText('Pick your top 5 drivers.')).toBeVisible();
    await page.getByTestId('top5-start-button').click();

    await expect(page.getByTestId('picks-focus-overlay')).toBeVisible();
    await expect(page.getByTestId('your-picks')).toBeVisible();
    await expect(page.getByTestId('submit-prediction')).toBeDisabled();

    await pickFirstFiveDrivers(page);

    // No save button to press: filling the fifth slot saves the card by itself
    // and moves on, so `submit-prediction` is gone by the time anything could
    // click it. This used to assert it became enabled and then click it, which
    // raced the auto-save and then waited out the timeout on a button that had
    // unmounted.
    //
    // Saving Top 5 chains straight into the H2H picks focus overlay, which
    // opens on the first duel: a first-time card is made one battle at a time,
    // so there is nothing to submit until all eleven are called.
    await expect(page.getByTestId('h2h-duel-picker')).toBeVisible();
    await expect(page.getByTestId('h2h-duel-progress')).toContainText(
      'Team-mate battle 1 of',
    );
    // Both overlays are mounted at this point -- the Top 5 one is still behind
    // the duel it handed over to -- so the close button has to be the duel's,
    // not whichever of the two the selector happens to reach first.
    await page
      .getByTestId('picks-focus-overlay')
      .filter({ has: page.getByTestId('h2h-duel-picker') })
      .getByTestId('picks-focus-close')
      .click();

    await expect(page.getByTestId('picks-focus-overlay')).toHaveCount(0);
    await expect(page.getByTestId('race-top5-section')).toBeVisible();
    await expect(page.getByText('Top 5 Predictions')).toBeVisible();
    await expect(page.getByTestId('your-picks')).toHaveCount(0);
    await expect(page.getByTestId('h2h-start-button')).toBeVisible();
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

    const overlay = page.getByTestId('picks-focus-overlay');
    await expect(overlay).toBeVisible();

    const editablePick = overlay
      .locator('button[aria-pressed="false"]')
      .first();
    const editedPickLabel = await editablePick.getAttribute('aria-label');

    expect(editedPickLabel).toBeTruthy();

    await editablePick.click();
    const submitButton = overlay
      .getByRole('button', { name: 'Save H2H Changes' })
      .first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByTestId('picks-focus-overlay')).toHaveCount(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await expect(page.getByTestId('h2h-edit-button')).toBeVisible();
    await page.getByTestId('h2h-edit-button').click();

    await expect(
      page
        .getByTestId('picks-focus-overlay')
        .getByRole('button', { name: editedPickLabel! }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
