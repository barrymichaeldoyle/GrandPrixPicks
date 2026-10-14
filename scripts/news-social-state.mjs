import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// A separate Git repository keeps operator state away from the app checkout.
// Append-only lock commits make simultaneous non-forced pushes mutually exclusive.
export function openNewsSocialState({ remote, branch, apply = false, seed }) {
  if (!/^claude\/[a-z0-9][a-z0-9/-]*$/.test(branch ?? '')) {
    throw new Error('Shared news state must use a claude/ branch.');
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'gpp-news-state-'));
  const stateRef = `refs/heads/${branch}`;
  const lockRef = `${stateRef}-lock`;
  let head;
  let lock;
  let closed = false;
  const git = (args, input, allowFailure = false) => {
    const result = spawnSync('git', args, {
      cwd: directory,
      input,
      encoding: 'utf8',
      timeout: 60_000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    if (result.status !== 0 && !allowFailure) {
      throw new Error(
        `Shared news state: git ${args[0]} failed. ${result.stderr?.trim() ?? ''}`,
      );
    }
    return result;
  };
  const remoteHead = (ref) => {
    const result = git(['ls-remote', 'origin', ref]);
    return result.stdout.trim().split(/\s/)[0] || null;
  };
  const commit = (filename, value, parent) => {
    const blob = git(
      ['hash-object', '-w', '--stdin'],
      `${JSON.stringify(value, null, 2)}\n`,
    ).stdout.trim();
    const tree = git(
      ['mktree'],
      `100644 blob ${blob}\t${filename}\n`,
    ).stdout.trim();
    return git(
      ['commit-tree', tree, ...(parent ? ['-p', parent] : [])],
      'Update news operator state\n',
    ).stdout.trim();
  };
  const pushVerified = (sha, ref) => {
    git(['push', 'origin', `${sha}:${ref}`], undefined, true);
    if (remoteHead(ref) !== sha) {
      throw new Error(
        'Shared news state push was refused or uncertain. No further Buffer writes are allowed.',
      );
    }
  };
  const validate = (ledger) => {
    if (ledger?.version !== 1 || !Array.isArray(ledger.posts)) {
      throw new Error('Invalid shared news ledger.');
    }
    return ledger;
  };
  const readLock = () => {
    if (!remoteHead(lockRef)) return null;
    git(['fetch', '--no-tags', 'origin', `${lockRef}:refs/lock/current`]);
    const sha = git(['rev-parse', 'refs/lock/current']).stdout.trim();
    const record = JSON.parse(git(['show', `${sha}:owner.json`]).stdout);
    if (record?.owner !== null && typeof record?.owner !== 'string') {
      throw new Error('Invalid shared news lock record.');
    }
    return { sha, record };
  };
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      if (lock) {
        if (remoteHead(lockRef) !== lock) {
          throw new Error('Shared news lock ownership changed before release.');
        }
        const released = commit('owner.json', {
          owner: null,
          releasedAt: new Date().toISOString(),
        }, lock);
        git(['push', 'origin', `${released}:${lockRef}`], undefined, true);
        if (remoteHead(lockRef) !== released) {
          throw new Error(
            'Could not release shared news lock. Inspect it before another apply.',
          );
        }
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  };
  try {
    git(['init', '--bare', '.']);
    git(['config', 'user.name', 'Grand Prix Picks news operator']);
    git(['config', 'user.email', 'news-operator@grandprixpicks.com']);
    git(['remote', 'add', 'origin', remote]);
    if (apply) {
      const previous = readLock();
      if (previous?.record.owner)
        throw new Error(
          'Another operator holds the shared news lock. Inspect interrupted work before releasing it.',
        );
      const candidate = commit('owner.json', {
        owner: randomUUID(),
        acquiredAt: new Date().toISOString(),
      }, previous?.sha);
      git(['push', 'origin', `${candidate}:${lockRef}`], undefined, true);
      if (remoteHead(lockRef) !== candidate)
        throw new Error('Could not acquire exclusive shared news lock.');
      lock = candidate;
    }
    head = remoteHead(stateRef);
    let ledger;
    if (head) {
      git(['fetch', '--no-tags', 'origin', `${stateRef}:refs/state/current`]);
      head = git(['rev-parse', 'refs/state/current']).stdout.trim();
      ledger = validate(
        JSON.parse(git(['show', `${head}:ledger.json`]).stdout),
      );
    } else if (apply && seed) {
      ledger = validate(seed);
      head = commit('ledger.json', ledger);
      pushVerified(head, stateRef);
    } else {
      throw new Error(
        'Shared news ledger has not been seeded. Refusing an empty cloud ledger.',
      );
    }
    return {
      ledger,
      save(value) {
        if (!apply || closed || remoteHead(lockRef) !== lock) {
          throw new Error('Exclusive shared news lock is not held.');
        }
        if (remoteHead(stateRef) !== head)
          throw new Error('Shared news ledger changed outside its lock.');
        const next = commit('ledger.json', validate(value), head);
        pushVerified(next, stateRef);
        head = next;
      },
      close,
    };
  } catch (error) {
    close();
    throw error;
  }
}
