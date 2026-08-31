import { expect, type Page } from '@playwright/test';

/**
 * A shared URL with a hash should land the heading below the sticky header,
 * not under it and not off-screen.
 */
export async function expectHashTargetBelowHeader(page: Page, hashId: string) {
  const target = page.locator(`#${hashId}`);
  await expect(target).toBeVisible();
  await expect
    .poll(() =>
      target.evaluate((element) => {
        const header = document.querySelector('[data-app-header]');
        const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
        const { top } = element.getBoundingClientRect();
        return top >= headerBottom - 1 && top < window.innerHeight;
      }),
    )
    .toBe(true);
}
