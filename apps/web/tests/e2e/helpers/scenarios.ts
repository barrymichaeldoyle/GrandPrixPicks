import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

export function applyScenario(scenario: string, namespace?: string) {
  const args = ['-s', 'scenario', '--', 'apply', scenario];
  if (namespace) {
    args.push('--namespace', namespace);
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
