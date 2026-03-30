#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const [command = 'list', ...rest] = argv;
  const result = {
    command,
    scenario: undefined,
    namespace: undefined,
    resetFirst: true,
    prod: false,
    previewName: undefined,
    deploymentName: undefined,
    dryRun: false,
  };

  if (command === 'apply' && rest[0] && !rest[0].startsWith('--')) {
    result.scenario = rest.shift();
  }

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--namespace') {
      result.namespace = rest[i + 1];
      i++;
      continue;
    }
    if (arg === '--no-reset') {
      result.resetFirst = false;
      continue;
    }
    if (arg === '--prod') {
      result.prod = true;
      continue;
    }
    if (arg === '--preview-name') {
      result.previewName = rest[i + 1];
      i++;
      continue;
    }
    if (arg === '--deployment-name') {
      result.deploymentName = rest[i + 1];
      i++;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
  }

  return result;
}

function getTargetFlags(parsed) {
  const count =
    Number(parsed.prod) +
    Number(Boolean(parsed.previewName)) +
    Number(Boolean(parsed.deploymentName));
  if (count > 1) {
    throw new Error(
      'Use only one target selector: --prod, --preview-name, or --deployment-name.',
    );
  }

  if (parsed.prod) {
    return ['--prod'];
  }
  if (parsed.previewName) {
    return ['--preview-name', parsed.previewName];
  }
  if (parsed.deploymentName) {
    return ['--deployment-name', parsed.deploymentName];
  }
  return [];
}

function buildInvocation(parsed) {
  if (parsed.command === 'list') {
    return ['testingScenarios:listScenarios', {}];
  }

  if (parsed.command === 'summary') {
    if (!parsed.namespace) {
      throw new Error('summary requires --namespace');
    }
    return ['testingScenarios:getScenarioSummary', { namespace: parsed.namespace }];
  }

  if (parsed.command === 'clear') {
    if (!parsed.namespace) {
      throw new Error('clear requires --namespace');
    }
    return ['testingScenarios:clearScenario', { namespace: parsed.namespace }];
  }

  if (parsed.command === 'apply') {
    if (!parsed.scenario) {
      throw new Error('apply requires a scenario name');
    }
    return [
      'testingScenarios:applyScenario',
      {
        scenario: parsed.scenario,
        namespace: parsed.namespace,
        resetFirst: parsed.resetFirst,
      },
    ];
  }

  throw new Error(
    `Unknown command "${parsed.command}". Use list, apply, summary, or clear.`,
  );
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const targetFlags = getTargetFlags(parsed);
  const [functionName, args] = buildInvocation(parsed);
  const cmd = [
    'exec',
    'convex',
    'run',
    functionName,
    JSON.stringify(args),
    '--typecheck',
    'disable',
    '--codegen',
    'disable',
    ...targetFlags,
  ];

  if (parsed.dryRun) {
    console.log(`DRY RUN: pnpm ${cmd.join(' ')}`);
    return;
  }

  const proc = spawnSync('pnpm', cmd, {
    env: process.env,
    encoding: 'utf8',
  });

  if (proc.status !== 0) {
    process.stderr.write(proc.stderr ?? '');
    throw new Error(`Command failed: pnpm ${cmd.join(' ')}`);
  }

  const stdout = (proc.stdout ?? '').trim();
  if (!stdout) {
    return;
  }

  try {
    const parsedOutput = JSON.parse(stdout);
    console.log(JSON.stringify(parsedOutput, null, 2));
  } catch {
    process.stdout.write(stdout);
    process.stdout.write('\n');
  }
}

main();
