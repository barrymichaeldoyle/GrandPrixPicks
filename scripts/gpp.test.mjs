import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./gpp.mjs', import.meta.url));
const globalStory = {
  key: 'mclaren-fornaroli-2027-reserve-wec',
  headline: 'McLaren keeps Fornaroli as F1 reserve for 2027',
  body: 'Fornaroli will combine his reserve role with a WEC programme.',
  sourceName: 'Autosport',
  sourceUrl: 'https://www.autosport.com/f1/news/example/',
  team: 'McLaren',
  dryRun: true,
};

function publish(t, input, apply = false) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gpp-publish-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'news.json');
  writeFileSync(file, JSON.stringify(input));
  return spawnSync(
    process.execPath,
    [cli, 'news', 'publish', file, '--prod', ...(apply ? ['--apply'] : [])],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        // If preflight is bypassed, convexRun refuses this target before it
        // starts the Convex CLI. Tests must never contact a live deployment.
        GPP_CONVEX_PROXY_URL: 'https://invalid.example',
      },
    },
  );
}

test('Sentry 35: race-independent input is rejected locally with the correct publishing path', (t) => {
  const result = publish(t, globalStory);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr.trim(),
    `gpp: ${globalStory.key}: missing raceSlug, affectsSessions (a story about no race goes through globalNews:publish)`,
  );
});

test('a missing session list is caught even when a race is supplied', (t) => {
  const result = publish(t, { ...globalStory, raceSlug: 'usa-2026' });
  assert.equal(result.status, 1);
  assert.equal(
    result.stderr.trim(),
    `gpp: ${globalStory.key}: missing affectsSessions`,
  );
});

test('apply validates the entire batch before attempting the first publication', (t) => {
  const { team: _team, ...raceStory } = globalStory;
  const result = publish(
    t,
    [
      { ...raceStory, raceSlug: 'usa-2026', affectsSessions: [] },
      { ...globalStory, key: 'invalid-second-story' },
    ],
    true,
  );
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(
    result.stderr,
    /^gpp: invalid-second-story: missing raceSlug, affectsSessions /,
  );
});
