import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { Page } from '@playwright/test';

import { createE2EClerkIdentity } from './clerk';
import { ensureE2EEnvLoaded } from './env.ts';
import { PLAYWRIGHT_AUTH_NAMESPACE } from './smoke';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');

type LeagueFixture = {
  namespace: string;
  ownedLeague: {
    id: string;
    name: string;
    slug: string;
    route: string;
  };
  publicLeague: {
    id: string;
    name: string;
    slug: string;
    route: string;
  };
};

export async function seedLeagueFixtureForAuthenticatedUser(
  page: Page,
  options: { namespace: string },
) {
  ensureE2EEnvLoaded();
  const clerkIdentity = await createE2EClerkIdentity(
    PLAYWRIGHT_AUTH_NAMESPACE,
  );
  const stdout = execFileSync(
    'pnpm',
    [
      '--filter',
      '@grandprixpicks/backend',
      'exec',
      'convex',
      'run',
      'testing:createLeagueSmokeFixture',
      JSON.stringify({
        namespace: options.namespace,
        primaryClerkUserId: clerkIdentity.userId,
        primaryEmail: clerkIdentity.email,
        primaryDisplayName: clerkIdentity.displayName,
      }),
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: process.env,
    },
  ).trim();

  let fixture: LeagueFixture;
  try {
    fixture = JSON.parse(stdout) as LeagueFixture;
  } catch {
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error(`League fixture command did not return JSON.\n${stdout}`);
    }

    fixture = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) as LeagueFixture;
  }

  await page.goto('/leagues');

  return { clerkIdentity, fixture };
}
