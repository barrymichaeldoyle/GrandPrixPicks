import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from './helpers/a11y';

/**
 * One pass per distinct layout, not per route.
 *
 * These pages are picked because each is a different shape of page rather than
 * because each is important: a marketing hero, a card list, a data table, a
 * long-form document. Adding a fifth route that reuses one of those layouts
 * costs runtime and catches nothing new.
 */
const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/races', name: 'race calendar' },
  { path: '/f1-standings', name: 'standings table' },
  { path: '/pricing', name: 'pricing' },
];

test.describe('[public] a11y smoke', () => {
  for (const { path, name } of PAGES) {
    test(`${name} has no WCAG A/AA violations`, async ({ page }) => {
      await page.goto(path);
      // Axe reads the composed document, so it has to run against the page as
      // a reader gets it — after the client has filled in whatever SSR left
      // blank, not on the first frame of markup.
      await expect(page.locator('main')).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }
});
