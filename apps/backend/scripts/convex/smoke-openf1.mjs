#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

// No default here on purpose: the session the check reads is declared once, in
// `openF1Results.SMOKE_TEST_SESSION_KEY`, and omitting the argument uses it.
const override = process.env.OPENF1_SMOKE_SESSION_KEY;
const sessionKey = override === undefined ? null : Number(override);

if (sessionKey !== null && (!Number.isInteger(sessionKey) || sessionKey <= 0)) {
  throw new Error('OPENF1_SMOKE_SESSION_KEY must be a positive integer');
}

const targetFlags = process.argv.includes('--prod') ? ['--prod'] : [];
const args = [
  'exec',
  'convex',
  'run',
  'openF1Results:smokeTest',
  JSON.stringify(sessionKey === null ? {} : { sessionKey }),
  '--typecheck',
  'disable',
  '--codegen',
  'disable',
  ...targetFlags,
];

console.log(
  `Running read-only OpenF1 smoke test with ${
    sessionKey === null ? 'the default session' : `session ${sessionKey}`
  }${targetFlags.length > 0 ? ' on production' : ''}`,
);
const result = spawnSync('pnpm', args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  throw new Error('OpenF1 post-deployment smoke test failed');
}

console.log('OpenF1 post-deployment smoke test passed.');
