import { expect, type Page } from '@playwright/test';

import { createE2EClerkIdentity } from './clerk';
import { applyScenario } from './scenarios';

export const PLAYWRIGHT_AUTH_NAMESPACE = 'playwright_auth_primary';

type SignInScenarioOptions = {
  scenario: string;
  namespace: string;
  targetPath?: string;
};

export async function seedScenarioForAuthenticatedUser(
  page: Page,
  options: SignInScenarioOptions,
) {
  const clerkIdentity = await createE2EClerkIdentity(PLAYWRIGHT_AUTH_NAMESPACE);
  const summary = applyScenario(options.scenario, {
    namespace: options.namespace,
    primaryClerkUserId: clerkIdentity.userId,
    primaryEmail: clerkIdentity.email,
    primaryDisplayName: clerkIdentity.displayName,
  });

  await page.goto(options.targetPath ?? summary.routes!.webRaceDetail);
  await expect(page.getByTestId('header-user-authenticated')).toBeVisible();
  return { clerkIdentity, summary };
}

export async function pickFirstFiveDrivers(page: Page) {
  const driverCodes = ['NOR', 'PIA', 'LEC', 'HAM', 'VER'] as const;

  for (const code of driverCodes) {
    await page.getByTestId(`driver-${code}`).click();
  }
}
