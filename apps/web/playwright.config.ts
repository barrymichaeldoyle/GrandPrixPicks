import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const HOST = '127.0.0.1';
const baseURL = `http://${HOST}:${PORT}`;
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
      ],
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
      ],
    },
  ],
  webServer: {
    command:
      'pnpm run generate-tokens && VITE_ENABLE_DEV_TIME_CONTROLS=true pnpm run dev:vite',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
