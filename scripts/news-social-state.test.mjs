import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { openNewsSocialState } from './news-social-state.mjs';

function fixture(t) {
  const remote = mkdtempSync(path.join(tmpdir(), 'gpp-state-test-'));
  execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
  t.after(() => rmSync(remote, { recursive: true, force: true }));
  return { remote, branch: 'claude/news-social-state' };
}

test('fresh checkouts recover the journal and refuse competing writers', (t) => {
  const config = fixture(t);
  const first = openNewsSocialState({
    ...config,
    apply: true,
    seed: { version: 1, posts: [] },
  });
  try {
    assert.throws(
      () => openNewsSocialState({ ...config, apply: true }),
      /holds the shared news lock/,
    );
    first.save({ version: 1, posts: [{ id: 'attempt', status: 'creating' }] });
    const preview = openNewsSocialState(config);
    assert.equal(preview.ledger.posts[0].status, 'creating');
    preview.close();
  } finally {
    first.close();
  }
  const second = openNewsSocialState({ ...config, apply: true });
  assert.equal(second.ledger.posts[0].status, 'creating');
  second.save({
    version: 1,
    posts: [{ id: 'attempt', status: 'scheduled', bufferPostId: 'post' }],
  });
  second.close();
  const lock = execFileSync(
    'git',
    ['show', `${config.branch}-lock:owner.json`],
    {
      cwd: config.remote,
      encoding: 'utf8',
    },
  );
  assert.equal(JSON.parse(lock).owner, null);
  const history = execFileSync(
    'git',
    ['rev-list', '--count', `${config.branch}-lock`],
    {
      cwd: config.remote,
      encoding: 'utf8',
    },
  );
  assert.equal(
    Number(history.trim()),
    4,
    'two acquisitions and releases retain their history',
  );
  const third = openNewsSocialState(config);
  assert.equal(third.ledger.posts[0].bufferPostId, 'post');
  third.close();
});

test('missing state refuses an empty journal and releases an acquired lock', (t) => {
  const config = fixture(t);
  assert.throws(
    () => openNewsSocialState({ ...config, apply: true }),
    /has not been seeded/,
  );
  const seeded = openNewsSocialState({
    ...config,
    apply: true,
    seed: { version: 1, posts: [] },
  });
  seeded.close();
});

test('state branches cannot target main and closed writers cannot save', (t) => {
  const config = fixture(t);
  assert.throws(
    () => openNewsSocialState({ ...config, branch: 'main' }),
    /claude\/ branch/,
  );
  const writer = openNewsSocialState({
    ...config,
    apply: true,
    seed: { version: 1, posts: [] },
  });
  writer.close();
  assert.throws(
    () => writer.save({ version: 1, posts: [] }),
    /lock is not held/,
  );
});
