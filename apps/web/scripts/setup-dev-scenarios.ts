/**
 * Sets up multiple dev sign-in accounts in different feed states.
 *
 * Creates/loads four Clerk identities, then runs the Convex seed so each
 * Convex profile is in a distinct state on /feed:
 *
 *   rich        — follows fakes + leagues + recent activity (populated feed)
 *   in-leagues  — joined a league but follows nobody (suggested league-mates)
 *   solo        — no leagues, no follows (suggested leaderboard players)
 *   stale       — follows users with no recent activity ("No recent activity yet")
 *
 * Use the printed URLs to sign in to any scenario in a fresh browser window.
 * Tokens expire after ~5 minutes; re-run to refresh.
 *
 * Usage:
 *   pnpm --filter @grandprixpicks/web dev:setup-scenarios
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  createE2EClerkIdentity,
  createE2EClerkSignInTokenUrl,
} from '../tests/e2e/helpers/clerk.ts';

type ScenarioKind = 'rich' | 'in_leagues' | 'solo' | 'stale';

type Scenario = {
  kind: ScenarioKind;
  label: string;
  namespace: string;
  username: string;
  displayName: string;
};

const SCENARIOS: Array<Scenario> = [
  {
    kind: 'rich',
    label: 'rich',
    namespace: 'claude-dev-signin',
    username: 'claude_dev_signin',
    displayName: 'Scenario Primary',
  },
  {
    kind: 'in_leagues',
    label: 'in-leagues',
    namespace: 'claude-dev-in-leagues',
    username: 'claude_dev_in_leagues',
    displayName: 'In Leagues',
  },
  {
    kind: 'solo',
    label: 'solo',
    namespace: 'claude-dev-solo',
    username: 'claude_dev_solo',
    displayName: 'Solo Player',
  },
  {
    kind: 'stale',
    label: 'stale',
    namespace: 'claude-dev-stale',
    username: 'claude_dev_stale',
    displayName: 'Stale Feed',
  },
];

async function main() {
  process.stderr.write('Creating Clerk identities...\n');
  const identities = [];
  for (const scenario of SCENARIOS) {
    const identity = await createE2EClerkIdentity(scenario.namespace);
    identities.push({ scenario, clerkUserId: identity.userId });
    process.stderr.write(
      `  ✓ ${scenario.label.padEnd(11)} → ${identity.userId}\n`,
    );
  }

  const rich = identities[0];
  const aux = identities.slice(1).map(({ scenario, clerkUserId }) => ({
    kind: scenario.kind,
    clerkUserId,
    username: scenario.username,
    displayName: scenario.displayName,
  }));

  const seedArgs = JSON.stringify({
    clerkUserId: rich.clerkUserId,
    username: rich.scenario.username,
    auxScenarios: aux,
  });

  process.stderr.write('\nSeeding Convex (wipes existing dev data)...\n');
  const backendDir = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../backend',
  );
  execSync(`npx convex run seed:reseedDevForFeed '${seedArgs}'`, {
    cwd: backendDir,
    stdio: 'inherit',
  });

  process.stderr.write('\nSign-in URLs (valid ~5 minutes):\n\n');
  for (const { scenario, clerkUserId } of identities) {
    const url = await createE2EClerkSignInTokenUrl(clerkUserId);
    process.stdout.write(`${scenario.label.padEnd(11)} ${url}\n\n`);
  }
}

await main();
