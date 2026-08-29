import { expect, test } from '@playwright/test';

/**
 * The reaction trigger sits hard against the right edge of a feed row, and the
 * picker is anchored to its left edge: at 390px the five options ran clean off
 * the side of the screen with no way to scroll to them. This measures the open
 * picker against the viewport rather than trusting the anchor.
 */
test.describe('[reactions] picker placement', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('stays inside the viewport at phone width', async ({ page }) => {
    await page.goto('/');
    const triggers = page.locator('button[title="React to this post"]');
    await expect(triggers.first()).toBeVisible({ timeout: 30_000 });
    // The trigger is server-rendered, so it is clickable before React has
    // attached its handler. Wait for hydration rather than racing it.
    await expect
      .poll(
        async () => {
          await triggers.first().click();
          return page
            .locator('[role="menu"][aria-label="Choose a reaction"]')
            .count();
        },
        { timeout: 30_000 },
      )
      .toBeGreaterThan(0);

    const count = await triggers.count();
    for (let index = 0; index < Math.min(count, 4); index += 1) {
      const trigger = triggers.nth(index);
      await trigger.scrollIntoViewIfNeeded();
      const menu = page
        .locator('[role="menu"][aria-label="Choose a reaction"]')
        .first();
      if ((await menu.count()) === 0) {
        await trigger.click();
      }
      await expect(menu).toBeVisible();

      const box = await menu.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
      // Every option has to be reachable, not just the panel edge.
      const options = menu.locator('[role="menuitemradio"]');
      const optionCount = await options.count();
      expect(optionCount).toBeGreaterThan(0);
      for (let option = 0; option < optionCount; option += 1) {
        const optionBox = await options.nth(option).boundingBox();
        expect(optionBox!.x).toBeGreaterThanOrEqual(0);
        expect(optionBox!.x + optionBox!.width).toBeLessThanOrEqual(390);
      }

      await trigger.click();
    }
  });
});
