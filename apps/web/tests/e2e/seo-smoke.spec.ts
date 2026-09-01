import { expect, test } from '@playwright/test';

import { applyScenario } from './helpers/scenarios';

const SITE_URL = 'https://grandprixpicks.com';

test.describe('[public] seo smoke', () => {
  test('returns 404 for missing public entity routes', async ({
    page,
    request,
  }) => {
    for (const path of [
      '/p/not-a-real-user',
      '/leagues/not-a-real-league',
      '/races/not-a-real-race',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
    }

    const notFoundPage = await page.goto('/races/not-a-real-race');
    expect(notFoundPage?.status()).toBe(404);
    await expect(
      page.getByRole('heading', { name: /page not found/i }),
    ).toBeVisible();
  });

  test('retires /feed to the dashboard rather than indexing it', async ({
    page,
    request,
  }) => {
    // /feed was a standalone activity page and is now a redirect: the stream
    // lives on the dashboard, but session-locked pushes already on people's
    // phones still point here. This used to assert noindex and a self
    // canonical, which described the page before it was retired and has been
    // failing ever since.
    const response = await request.get('/feed', { maxRedirects: 0 });
    // 301, because the page is retired rather than temporarily moved: a 307
    // would keep /feed in the index as its own URL indefinitely.
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe('/');

    await page.goto('/feed');
    await expect(page).toHaveURL(`${new URL(page.url()).origin}/`);
    // Landing on the dashboard means the homepage's own canonical, not a
    // second page claiming to be it.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/`,
    );
  });

  test('points a written-up race page at its editorial URL', async ({
    page,
  }) => {
    // The race page still serves the game; it just stops competing with the
    // write-up in search.
    const response = await page.goto('/races/italy-2026');
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/f1-2026-italian-grand-prix-predictions`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
  });

  test('emits noindex and a self canonical on follow-list pages', async ({
    page,
  }) => {
    await page.goto('/p/barrymichaeldoyle/followers');
    await expect
      .poll(() => page.locator('meta[name="robots"]').getAttribute('content'))
      .toBe('noindex, follow');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/p/barrymichaeldoyle/followers`,
    );
  });

  test('signed-out HTML does not ship the sign-in curtain copy', async ({
    request,
  }) => {
    for (const path of ['/', '/races']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      expect(html, path).not.toContain('Signing you in');
      expect(html, path).not.toContain('id="gpp-pre-paint-curtain"');
    }
  });

  test('serves sitemap XML including seeded public race routes', async ({
    request,
  }) => {
    const summary = applyScenario('race_partial_results_sprint', {
      namespace: 'scenario__seo_smoke__sitemap',
    });

    expect(summary.race?.slug).toBeTruthy();

    await expect
      .poll(
        async () => {
          const response = await request.get('/sitemap.xml');
          return {
            body: await response.text(),
            contentType: response.headers()['content-type'],
            status: response.status(),
          };
        },
        { timeout: 15_000 },
      )
      .toMatchObject({
        status: 200,
        contentType: expect.stringContaining('application/xml'),
        body: expect.stringContaining(
          `<loc>https://grandprixpicks.com/races/${summary.race!.slug}</loc>`,
        ),
      });
  });
});
