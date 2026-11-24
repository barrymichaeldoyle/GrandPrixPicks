import assert from 'node:assert/strict';
import test from 'node:test';

import { isRawProdConvexRun } from '../.claude/hooks/block-raw-convex-run.mjs';
import { checkCall, functionName } from './convex-args.mjs';

// The shapes `convex function-spec` prints, trimmed to the functions the
// Sentry issues were about.
const spec = {
  functions: [
    {
      identifier: 'globalNews.js:listForOperators',
      functionType: 'Query',
      visibility: { kind: 'internal' },
      args: { type: 'object', value: {} },
    },
    {
      identifier: 'globalNews.js:publish',
      functionType: 'Mutation',
      visibility: { kind: 'internal' },
      args: {
        type: 'object',
        value: {
          key: { fieldType: { type: 'string' }, optional: false },
          sourcePublishedAt: { fieldType: { type: 'number' }, optional: true },
          dryRun: { fieldType: { type: 'boolean' }, optional: true },
        },
      },
    },
    {
      identifier: 'weather.js:getByRaceSlug',
      functionType: 'Query',
      visibility: { kind: 'public' },
      args: {
        type: 'object',
        value: {
          raceSlug: { fieldType: { type: 'string' }, optional: false },
          now: { fieldType: { type: 'number' }, optional: false },
        },
      },
    },
    {
      identifier: 'h2h.js:pick',
      functionType: 'Mutation',
      visibility: { kind: 'public' },
      args: {
        type: 'object',
        value: {
          session: {
            fieldType: {
              type: 'union',
              value: [
                { type: 'literal', value: 'quali' },
                { type: 'literal', value: 'race' },
              ],
            },
            optional: false,
          },
          matchupIds: {
            fieldType: {
              type: 'array',
              value: { type: 'id', tableName: 'h2hMatchups' },
            },
            optional: false,
          },
          labels: {
            fieldType: {
              type: 'record',
              keys: { type: 'string' },
              values: { fieldType: { type: 'string' }, optional: false },
            },
            optional: true,
          },
        },
      },
    },
    {
      identifier: 'http.js:POST /api/x',
      functionType: 'HttpAction',
      args: null,
    },
  ],
};

test('module paths drop the .js the spec carries', () => {
  assert.equal(functionName('raceNews.js:list'), 'raceNews:list');
  assert.equal(functionName('lib/ops.js:default'), 'lib/ops');
});

test('Sentry 3K: an extra field is caught before the call', () => {
  const { error } = checkCall(spec, 'globalNews:listForOperators', {
    limit: 30,
  });
  assert.match(error.join('\n'), /extra field `limit`/);
  assert.match(error.join('\n'), /takes \{\}/);
});

test('Sentry 3J: a missing required field is caught', () => {
  const { error } = checkCall(spec, 'weather:getByRaceSlug', {
    raceSlug: 'abu-dhabi-2026',
  });
  assert.match(error.join('\n'), /missing required field `now` \(number\)/);
});

test('Sentry 3B: an ISO date where epoch ms go is caught', () => {
  const { error } = checkCall(spec, 'globalNews:publish', {
    key: 'x',
    sourcePublishedAt: '2026-11-09T09:34:59Z',
  });
  assert.match(
    error.join('\n'),
    /sourcePublishedAt: expected number, got string/,
  );
});

test('valid args pass, optional fields included or not', () => {
  assert.ok(checkCall(spec, 'globalNews:publish', { key: 'x' }).fn);
  assert.ok(
    checkCall(spec, 'globalNews:publish', {
      key: 'x',
      sourcePublishedAt: 1,
      dryRun: true,
    }).fn,
  );
});

test('unions, arrays of ids and records are checked', () => {
  assert.ok(
    checkCall(spec, 'h2h:pick', {
      session: 'race',
      matchupIds: ['abc'],
      labels: { a: 'b' },
    }).fn,
  );
  const { error } = checkCall(spec, 'h2h:pick', {
    session: 'sprint',
    matchupIds: [1],
    labels: { a: 2 },
  });
  const text = error.join('\n');
  assert.match(text, /session: expected "quali" \| "race", got "sprint"/);
  assert.match(text, /matchupIds\[0\]: expected id<h2hMatchups>/);
  assert.match(text, /labels\.a: expected string/);
});

test('an unknown function suggests its neighbours', () => {
  const { error } = checkCall(spec, 'weather:getByRaceSlugg', {});
  assert.match(error.join('\n'), /not a function/);
  assert.match(error.join('\n'), /weather:getByRaceSlug/);
});

test('HTTP actions are not runnable functions', () => {
  assert.ok(checkCall(spec, 'http:POST /api/x', {}).error);
});

test('the hook blocks raw prod calls and lets dev and gpp through', () => {
  const blocked = [
    `npx convex run --prod globalNews:listForOperators '{"limit":30}'`,
    `cd apps/backend && ./node_modules/.bin/convex run raceNews:list '{}' --url https://x --admin-key k`,
    'pnpm exec convex run seed:applyLineup --deployment prod',
    'CONVEX_DEPLOY_KEY=x npx convex run races:listRaces',
  ];
  const allowed = [
    `npx convex run testing:setUserAdmin '{}'`,
    'node scripts/gpp.mjs run races:listRaces --prod',
    'npx convex function-spec --prod',
    'npx convex deploy --prod',
    // Text about the call is not the call.
    `git grep -n "convex run --prod" -- docs`,
    `sed -i '' 's#npx convex run --prod #scripts/gpp.mjs run --prod #g' docs/x.md`,
    "python3 - <<'EOF'\nprint('npx convex run --prod x')\nEOF",
  ];
  for (const command of blocked) {
    assert.equal(isRawProdConvexRun(command), true, command);
  }
  for (const command of allowed) {
    assert.equal(isRawProdConvexRun(command), false, command);
  }
});
