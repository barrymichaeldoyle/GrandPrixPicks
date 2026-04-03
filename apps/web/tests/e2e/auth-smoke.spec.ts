import { expect, test } from '@playwright/test';

import { seedLeagueFixtureForAuthenticatedUser } from './helpers/leagues';
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

  test('shows my leagues, discover leagues, and an owned league detail page', async ({
    page,
  }) => {
    test.setTimeout(60_000);

    const { fixture } = await seedLeagueFixtureForAuthenticatedUser(page, {
      namespace: 'smoke__league__auth',
    });

    await expect(
      page.getByRole('heading', { name: 'Leagues' }),
    ).toBeVisible();
    await expect(page.getByText(fixture.ownedLeague.name)).toBeVisible();

    await page.getByRole('tab', { name: 'Discover' }).click();
    await expect(page.getByText(fixture.publicLeague.name)).toBeVisible();

    await page.goto(fixture.ownedLeague.route);

    await expect(
      page.getByRole('heading', { name: fixture.ownedLeague.name }),
    ).toBeVisible();
    await expect(page.getByText('2 members')).toBeVisible();
    await expect(page.getByText('Share League')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });
});
