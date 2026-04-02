import { expect, test } from '@playwright/test';

import { seedScenarioForAuthenticatedUser } from './helpers/smoke';

test.describe('[auth] smoke', () => {
  test('shows signed-in header controls for the seeded primary actor', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_upcoming_signed_in_complete',
      namespace: 'scenario__race_upcoming_signed_in_complete__pwauth',
    });

    await expect(page.getByTestId('header-sign-in-button')).toHaveCount(0);
  });

  test('shows seeded owner prediction sections for an authenticated locked H2H scenario', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await seedScenarioForAuthenticatedUser(page, {
      scenario: 'race_locked_signed_in_complete_h2h_no_results',
      namespace:
        'scenario__race_locked_signed_in_complete_h2h_no_results__pwauth',
      targetPath:
        '/races/scenario-race-locked-signed-in-complete-h2h-no-results-pwauth-race?session=quali',
    });

    await expect(page.getByTestId('race-top5-section')).toBeVisible();
    await expect(page.getByTestId('race-h2h-section')).toBeVisible();
    await expect(page.getByText('Top 5 Predictions')).toBeVisible();
    await expect(page.getByText('Head-to-Head Predictions')).toBeVisible();
  });
});
