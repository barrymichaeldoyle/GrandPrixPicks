import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ensureE2EEnvLoaded } from './helpers/env.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');

/**
 * Clear the scenario races, players and league fixtures the run seeded.
 *
 * The suite writes to the shared dev deployment, and whatever it leaves there
 * is what the next person opening the app in dev sees: a scenario race that
 * outranks the real calendar as the "next race" on every page.
 *
 * Skipped when the suite points at a deployed site (`PLAYWRIGHT_BASE_URL`,
 * the production smoke run), which seeds nothing. A failed cleanup is logged
 * rather than thrown, so it can never turn a green run red.
 */
export default function globalTeardown() {
  if (process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_KEEP_FIXTURES) {
    return;
  }
  ensureE2EEnvLoaded();
  try {
    const out = execFileSync('pnpm', ['run', 'scenario', '--', 'clear-e2e'], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    console.log(`[e2e teardown] cleared fixtures: ${out.trim()}`);
  } catch (error) {
    console.warn('[e2e teardown] fixture cleanup failed', error);
  }
}
