#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const DEFAULT_SESSION_KEY = 11334;
const sessionKey = Number(
  process.env.OPENF1_SMOKE_SESSION_KEY ?? DEFAULT_SESSION_KEY,
);

if (!Number.isInteger(sessionKey) || sessionKey <= 0) {
  throw new Error('OPENF1_SMOKE_SESSION_KEY must be a positive integer');
}

const targetFlags = process.argv.includes('--prod') ? ['--prod'] : [];
const args = [
  'exec',
  'convex',
  'run',
  'openF1Results:smokeTest',
  JSON.stringify({ sessionKey }),
  '--typecheck',
  'disable',
  '--codegen',
  'disable',
  ...targetFlags,
];

console.log(
  `Running read-only OpenF1 smoke test with session ${sessionKey}${targetFlags.length > 0 ? ' on production' : ''}`,
);
const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  throw new Error('OpenF1 post-deployment smoke test failed');
}

console.log('OpenF1 post-deployment smoke test passed.');
