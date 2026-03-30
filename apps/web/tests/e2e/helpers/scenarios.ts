import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ensureE2EEnvLoaded } from './env.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../../');

type ScenarioSummary = {
  scenario: string | null;
  namespace: string;
  race: {
    slug: string;
    name: string;
    status: string;
    hasSprint: boolean;
  } | null;
  routes: {
    webRaceDetail: string;
    webLeaderboard: string;
  } | null;
};

type ApplyScenarioOptions = {
  namespace?: string;
  primaryClerkUserId?: string;
  primaryEmail?: string;
  primaryDisplayName?: string;
};

export function applyScenario(
  scenario: string,
  options: ApplyScenarioOptions = {},
) {
  ensureE2EEnvLoaded();
  const args = ['-s', 'scenario', '--', 'apply', scenario];
  if (options.namespace) {
    args.push('--namespace', options.namespace);
  }
  if (options.primaryClerkUserId) {
    args.push('--primary-clerk-user-id', options.primaryClerkUserId);
  }
  if (options.primaryEmail) {
    args.push('--primary-email', options.primaryEmail);
  }
  if (options.primaryDisplayName) {
    args.push('--primary-display-name', options.primaryDisplayName);
  }
  const stdout = execFileSync('pnpm', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: process.env,
  }).trim();

  try {
    return JSON.parse(stdout) as ScenarioSummary;
  } catch {
    const jsonStart = stdout.indexOf('{');
    const jsonEnd = stdout.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error(`Scenario command did not return JSON.\n${stdout}`);
    }

    return JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) as ScenarioSummary;
  }
}
