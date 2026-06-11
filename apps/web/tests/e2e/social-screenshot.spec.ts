import { expect, test } from '@playwright/test';

import { seedScenarioForAuthenticatedUser } from './helpers/smoke';

test('captures partially completed Top 5 gameplay', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 810 });

  const { summary } = await seedScenarioForAuthenticatedUser(page, {
    scenario: 'race_upcoming_signed_in_complete_h2h',
    namespace: 'social__race_upcoming_partial_top5',
  });

  await page.goto(`${summary.routes!.webRaceDetail}?session=quali`);
  await expect(page.getByTestId('top5-edit-button')).toBeVisible();
  await page.getByTestId('top5-edit-button').click();
  await expect(page.getByTestId('your-picks')).toBeVisible();

  await page.getByTestId('remove-pick-4').click();
  await page.getByTestId('remove-pick-3').click();
  await expect(page.getByTestId('picks-remaining')).toContainText(
    'Select 2 more drivers',
  );

  await page
    .locator('h1')
    .first()
    .evaluate((element) => {
      element.textContent = 'Spanish Grand Prix';
    });
  await page
    .getByText('Round -17 · Next Race', { exact: true })
    .evaluate((element) => {
      element.textContent = 'Round 7 · Next Race';
    });
  await page.getByText('On track', { exact: true }).evaluate((element) => {
    const value = element.nextElementSibling;
    if (value) {
      value.textContent = 'Sat, Jun 13 · 4:00 PM GMT+2';
    }
  });
  await page.getByText('Your time', { exact: true }).evaluate((element) => {
    if (element.nextElementSibling) {
      element.nextElementSibling.textContent = 'Sat, Jun 13 · 4:00 PM';
    }
  });

  await page
    .locator('h1')
    .first()
    .evaluate((heading) => {
      const content = heading.parentElement?.parentElement;
      if (!content) {
        return;
      }

      const flag = document.createElement('span');
      flag.style.cssText =
        'display:inline-block;width:40px;min-width:40px;height:30px;border-radius:4px;overflow:hidden;';
      const image = document.createElement('img');
      image.src = '/flags/es.svg';
      image.alt = '';
      image.style.cssText =
        'display:block;width:100%;height:100%;object-fit:cover;';
      flag.appendChild(image);
      content.prepend(flag);
    });

  await page.addStyleTag({
    content: `
      [data-testid="dev-now-panel"],
      [data-testid="cookie-consent"] {
        display: none !important;
      }
    `,
  });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      const descriptor = [
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('alt'),
      ]
        .filter(Boolean)
        .join(' ');

      if (!/tanstack/i.test(descriptor)) {
        continue;
      }

      let current: HTMLElement | null = element;
      while (current && getComputedStyle(current).position !== 'fixed') {
        current = current.parentElement;
      }
      (current ?? element).style.display = 'none';
    }
  });

  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await page.screenshot({
    path: '/tmp/grand-prix-picks-gameplay.png',
    animations: 'disabled',
  });
});
