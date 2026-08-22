import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const HOST = '127.0.0.1';
/**
 * Point the suite at a deployed environment instead of a local dev server.
 *
 * Set by the scheduled production smoke run, which exists because the crash
 * that took every race page down for signed-out visitors was invisible to a
 * suite that only ever tested localhost: it needed real prod, a real bundle and
 * no session. When this is set there is nothing to boot, so `webServer` is
 * dropped rather than racing a server that is already there.
 */
const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseURL ?? `http://${HOST}:${PORT}`;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authStorageState = path.resolve(__dirname, 'tests/e2e/.auth/user.json');
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['list'], ['html']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'public-chromium',
      use: { ...devices['Desktop Chrome'], channel: browserChannel },
      testIgnore: [
        /auth\.setup\.ts$/,
        /auth-smoke\.spec\.ts$/,
        /prediction-flow-smoke\.spec\.ts$/,
        // Signed-in by definition; it has no meaning without a session.
        /a11y-authed\.spec\.ts$/,
      ],
    },
    /**
     * The a11y sweep again, at a phone width.
     *
     * Not redundant with `public-chromium`: the two find different defects.
     * The header's home link lost its accessible name below 440px and kept it
     * above, so a suite that only ever rendered at 1280px reported the site as
     * clean while a serious violation sat on every public page on production.
     * Anything driven by a breakpoint — a hidden label, a collapsed nav, a tap
     * target — is invisible to the desktop pass by construction.
     *
     * Pixel 7 is 412px wide, which lands inside that window rather than beside
     * it, and `target-size` (WCAG 2.5.8) only means anything here.
     */
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], channel: browserChannel },
      testMatch: /a11y-smoke\.spec\.ts$/,
    },
    {
      name: 'auth-setup',
      use: { channel: browserChannel },
      testMatch: /auth\.setup\.ts$/,
    },
    {
      name: 'auth-chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: browserChannel,
        storageState: authStorageState,
      },
      dependencies: ['auth-setup'],
      testIgnore: [
        /auth\.setup\.ts$/,
        /public-smoke\.spec\.ts$/,
        /seo-smoke\.spec\.ts$/,
        // Signed-out pages, so running them again with a session attached
        // would double the runtime to re-check the same DOM.
        /a11y-smoke\.spec\.ts$/,
        // Same reason, and more pointedly: this one asserts what an anonymous
        // visitor sees. Handing it a signed-in storage state to clear on every
        // test is the opposite of what it is for.
        /signed-out-smoke\.spec\.ts$/,
      ],
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command:
          'pnpm run generate-tokens && VITE_ENABLE_DEV_TIME_CONTROLS=true pnpm run dev:vite',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
