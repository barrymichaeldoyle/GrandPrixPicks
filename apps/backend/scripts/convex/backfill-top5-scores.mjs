#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const result = {
    prod: false,
    previewName: undefined,
    deploymentName: undefined,
    season: 2026,
    dryRun: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--prod') {
      result.prod = true;
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
    if (arg === '--season') {
      result.season = Number(argv[i + 1]);
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

function runConvex(functionName, args, targetFlags, dryRun) {
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

  if (dryRun) {
    console.log(`DRY RUN: pnpm ${cmd.join(' ')}`);
    return null;
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
    return null;
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(
      `Failed to parse output from ${functionName}: ${stdout}`,
    );
  }
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const targetFlags = getTargetFlags(parsed);

  console.log('Recomputing Top 5 scores from published results...');

  let cursor = undefined;
  let totalQueued = 0;
  let pageCount = 0;

  while (true) {
    const result = runConvex(
      'results:backfillTopFiveScores',
      cursor ? { cursor } : {},
      targetFlags,
      parsed.dryRun,
    );

    if (parsed.dryRun) {
      break;
    }

    if (!result || result.ok !== true) {
      throw new Error('Top 5 backfill returned an unexpected result.');
    }

    pageCount++;
    totalQueued += result.queued ?? 0;
    console.log(
      `Processed page ${pageCount}: queued ${result.queued} result session(s).`,
    );

    if (result.isDone) {
      break;
    }

    cursor = result.continueCursor;
    if (!cursor) {
      throw new Error('Backfill returned isDone=false without continueCursor.');
    }
  }

  console.log(
    `Refreshing season standings from recalculated score rows for ${parsed.season}...`,
  );
  runConvex(
    'seed:backfillStandings',
    { season: parsed.season },
    targetFlags,
    parsed.dryRun,
  );

  if (parsed.dryRun) {
    console.log('Dry run complete.');
    return;
  }

  console.log(
    `Done. Queued rescoring for ${totalQueued} result session(s) and refreshed standings.`,
  );
}

main();
