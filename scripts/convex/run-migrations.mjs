#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(process.cwd(), 'convex/migrations.config.json');

function parseArgs(argv) {
  const result = {
    prod: false,
    previewName: undefined,
    deploymentName: undefined,
    dryRun: false,
    only: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--prod') {
      result.prod = true;
      continue;
    }
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg === '--preview-name') {
      result.previewName = argv[i + 1];
      i++;
      continue;
    }
    if (arg === '--deployment-name') {
      result.deploymentName = argv[i + 1];
      i++;
      continue;
    }
    if (arg === '--only') {
      result.only = argv[i + 1];
      i++;
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

function loadMigrations() {
  const raw = readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Expected convex/migrations.config.json to be an array.');
  }
  return parsed;
}

function runCommand(command, args) {
  const proc = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
  });
  if (proc.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const targetFlags = getTargetFlags(parsed);
  const configured = loadMigrations();
  const only = parsed.only
    ? new Set(
        parsed.only
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;

  const migrations = configured.filter((migration) =>
    only ? only.has(migration.name) : true,
  );

  if (migrations.length === 0) {
    console.log('No matching migrations to run.');
    return;
  }

  console.log(
    `Running ${migrations.length} migration(s) from convex/migrations.config.json`,
  );
  for (const migration of migrations) {
    const argsJson = JSON.stringify(migration.args ?? {});
    const cmd = [
      'exec',
      'convex',
      'run',
      migration.name,
      argsJson,
      '--typecheck',
      'disable',
      '--codegen',
      'disable',
      ...targetFlags,
    ];

    if (parsed.dryRun) {
      console.log(`DRY RUN: pnpm ${cmd.join(' ')}`);
      continue;
    }

    console.log(`\n==> ${migration.name}`);
    runCommand('pnpm', cmd);
  }

  if (parsed.dryRun) {
    console.log('\nDry run complete.');
  } else {
    console.log('\nAll migrations completed.');
  }
}

main();
