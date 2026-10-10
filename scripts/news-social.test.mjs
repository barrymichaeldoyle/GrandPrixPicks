import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { newsSocial } from './news-social.mjs';

const NOW = Date.parse('2026-10-09T18:00:00Z');
const MINUTE = 60_000;

function fixture(t, count = 2) {
  const root = mkdtempSync(path.join(tmpdir(), 'gpp-news-social-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'selection.json');
  const news = Array.from({ length: count }, (_, i) => ({
    raceSlug: 'singapore-2026',
    key: `story-${i}`,
    headline: `Story ${i}`,
    body: `Reviewed news body ${i}.`,
    sourceUrl: `https://www.formula1.com/story-${i}`,
    sourcePublishedAt: '2026-10-09T17:00:00Z',
    affectsSessions: [],
  }));
  const live = structuredClone(news).map((item) => ({
    ...item,
    active: true,
    feedSelected: true,
  }));
  const plan = {
    organizationId: 'org',
    channelId: 'x',
    newsFile: './news.json',
    startAt: '2026-10-09T18:10:00Z',
    posts: news.map((item) => ({
      keys: [item.key],
      text: `${item.headline}: ${item.body} ${item.sourceUrl}`,
      expiresAt: '2026-10-09T22:00:00Z',
    })),
  };
  const remote = [];
  const calls = [];
  let counter = 0;
  let failAfterCreate = false;
  let pages;
  async function buffer(command, payload, options = {}) {
    calls.push({ command: command.join(' '), payload, options });
    if (command.join(' ') === 'channels get') {
      return {
        id: 'x',
        service: 'twitter',
        organizationId: 'org',
        isDisconnected: false,
        isQueuePaused: false,
      };
    }
    if (command.join(' ') === 'posts list') {
      if (pages) {
        const index = options.after ? Number(options.after) : 0;
        return {
          items: pages[index],
          pageInfo: {
            hasNextPage: index + 1 < pages.length,
            endCursor: String(index + 1),
          },
        };
      }
      return {
        items: structuredClone(remote),
        pageInfo: { hasNextPage: false },
      };
    }
    if (options.dryRun) {
      return {};
    }
    if (command.join(' ') === 'posts create') {
      const post = {
        ...payload,
        id: `buffer-${++counter}`,
        status: 'scheduled',
      };
      remote.push(post);
      if (failAfterCreate) {
        failAfterCreate = false;
        throw new Error('Ambiguous network timeout');
      }
      return { post };
    }
    if (command.join(' ') === 'posts get') {
      const post = remote.find((item) => item.id === payload.id);
      if (!post) {
        throw new Error('Post not found');
      }
      return structuredClone(post);
    }
    if (command.join(' ') === 'posts delete') {
      remote.splice(
        remote.findIndex((item) => item.id === payload.id),
        1,
      );
      return {};
    }
    throw new Error(`Unexpected command: ${command.join(' ')}`);
  }
  function write() {
    writeFileSync(file, JSON.stringify(plan));
    writeFileSync(path.join(root, 'news.json'), JSON.stringify(news));
  }
  write();
  return {
    root,
    file,
    plan,
    news,
    live,
    remote,
    calls,
    write,
    ledger: () =>
      JSON.parse(
        readFileSync(
          path.join(root, 'artifacts/social/news-sweeps/ledger.json'),
          'utf8',
        ),
      ),
    failCreate: () => {
      failAfterCreate = true;
    },
    setPages: (value) => {
      pages = value;
    },
    run: (apply = false, selection = file, now = NOW) =>
      newsSocial(
        selection,
        { prod: true, apply },
        {
          root,
          now,
          buffer,
          convexRun: async (_fn, args) => ({
            item: live.find((item) => item.key === args.key) ?? null,
          }),
        },
      ),
  };
}

test('dry run spaces posts around other campaigns without writing a ledger or scheduling', async (t) => {
  const f = fixture(t);
  f.remote.push({
    id: 'other',
    status: 'scheduled',
    dueAt: '2026-10-09T18:20:00Z',
    text: 'Other campaign',
  });
  const result = await f.run();
  assert.deepEqual(
    result.reports.map((post) => post.dueAt),
    ['2026-10-09T18:45:00.000Z', '2026-10-09T19:10:00.000Z'],
  );
  assert.equal(f.remote.length, 1);
  assert.throws(() => f.ledger(), { code: 'ENOENT' });
  assert.ok(
    f.calls
      .filter((call) => call.command === 'posts create')
      .every((call) => call.options.dryRun),
  );
});

test('apply verifies creates and retry skips the same story revisions across selections', async (t) => {
  const f = fixture(t);
  await f.run(true);
  assert.equal(f.remote.length, 2);
  assert.ok(
    f
      .ledger()
      .posts.every((post) => post.status === 'scheduled' && post.bufferPostId),
  );
  f.plan.posts[0].text = 'Different wording for the same news.';
  f.write();
  const result = await f.run(true);
  assert.ok(result.reports.every((post) => post.action === 'skipped'));
  assert.equal(f.remote.length, 2);
});

test('rejects changed, retracted, unselected and embargoed news before any create', async (t) => {
  for (const change of [
    { body: 'New development.' },
    { active: false },
    { feedSelected: false },
    { feedVisibleAt: NOW + MINUTE },
  ]) {
    const f = fixture(t, 1);
    Object.assign(f.live[0], change);
    await assert.rejects(f.run(true), /changed, is retracted or is held/);
    assert.equal(f.calls.length, 0);
  }
});

test("requires write-up links to name one of the post's stories", async (t) => {
  const f = fixture(t, 1);
  const writeup =
    'https://grandprixpicks.com/f1-2026-singapore-grand-prix-predictions';
  for (const link of [writeup, `${writeup}?story=story-9`]) {
    f.plan.posts[0].text = `Story 0. ${link}`;
    f.write();
    await assert.rejects(f.run(true), /need \?story=<one of this post's keys>/);
  }
  assert.equal(f.calls.length, 0);
  f.plan.posts[0].text = `Story 0. ${writeup}?story=story-0`;
  f.write();
  await f.run(false);
});

test('rejects a slot beyond expiry before scheduling any part of the batch', async (t) => {
  const f = fixture(t);
  f.plan.posts[1].expiresAt = '2026-10-09T18:30:00Z';
  f.write();
  await assert.rejects(f.run(true), /No available slot before expiry/);
  assert.equal(f.remote.length, 0);
});

test('check previews then cancels only superseded news posts owned by this workflow', async (t) => {
  const f = fixture(t, 1);
  await f.run(true);
  f.remote.push({
    id: 'other',
    status: 'scheduled',
    dueAt: '2026-10-09T19:00:00Z',
    text: 'Other campaign',
  });
  f.live[0].body = 'A new development supersedes the scheduled copy.';
  const preview = await f.run(false, 'check');
  assert.equal(preview.reports[0].action, 'would_cancel');
  assert.equal(f.remote.length, 2);
  const result = await f.run(true, 'check');
  assert.equal(result.reports[0].action, 'cancelled');
  assert.deepEqual(
    f.remote.map((item) => item.id),
    ['other'],
  );
  assert.equal(f.ledger().posts[0].status, 'cancelled');
});

test('sent stories require explicit material-update selection; changed revision can be scheduled', async (t) => {
  const f = fixture(t, 1);
  await f.run(true);
  f.remote[0].status = 'sent';
  f.remote[0].sentAt = '2026-10-09T18:10:00.000Z';
  f.news[0].body = f.live[0].body = 'A confirmed new development.';
  f.plan.posts[0].text =
    'A confirmed new development. https://www.formula1.com/story-0';
  f.write();
  const preview = await f.run();
  assert.equal(preview.reports[0].action, 'skipped');
  f.plan.posts[0].materialUpdate = true;
  f.write();
  await f.run(true);
  assert.equal(f.remote.length, 2);
  assert.equal(f.remote[1].dueAt, '2026-10-09T18:35:00.000Z');
});

test('an ambiguous successful create is recovered from Buffer without creating a duplicate', async (t) => {
  const f = fixture(t);
  f.failCreate();
  await assert.rejects(f.run(true), /Ambiguous network timeout/);
  assert.equal(f.remote.length, 1);
  assert.equal(f.ledger().posts[0].status, 'creating');
  await f.run(true);
  assert.equal(f.remote.length, 2);
  assert.ok(f.ledger().posts.every((post) => post.status === 'scheduled'));
});

test('unconfirmed creates stop for inspection and never blindly retry', async (t) => {
  const f = fixture(t, 1);
  f.failCreate();
  await assert.rejects(f.run(true), /Ambiguous network timeout/);
  f.remote.length = 0;
  await assert.rejects(f.run(true), /Uncertain Buffer create/);
  assert.equal(f.remote.length, 0);
});

test('check cancels expired queued news and refuses to alter externally edited copy', async (t) => {
  const f = fixture(t, 1);
  await f.run(true);
  f.remote[0].text = 'Manually edited post';
  await assert.rejects(f.run(true, 'check'), /edited outside this workflow/);
  f.remote[0].text = f.plan.posts[0].text;
  await f.run(true, 'check', NOW + 5 * 60 * MINUTE);
  assert.equal(f.remote.length, 0);
});

test('rejects development apply, oversized batches and too-close spacing', async (t) => {
  const f = fixture(t);
  await assert.rejects(
    newsSocial(f.file, { apply: true }, { root: f.root }),
    /requires --prod/,
  );
  f.plan.intervalMinutes = 5;
  f.write();
  await assert.rejects(f.run(true), /intervalMinutes/);
  f.plan.intervalMinutes = 25;
  f.plan.posts.push(...f.plan.posts);
  f.write();
  await assert.rejects(f.run(true), /one to three posts/);
  assert.equal(f.remote.length, 0);
});

test('resumes a partial batch after its original start time without reposting the first story', async (t) => {
  const f = fixture(t);
  f.failCreate();
  await assert.rejects(f.run(true), /Ambiguous network timeout/);
  await f.run(true, f.file, NOW + 60 * MINUTE);
  assert.equal(f.remote.length, 2);
  assert.equal(f.remote[1].dueAt, '2026-10-09T19:05:00.000Z');
});

test('identical copy for different stories is rejected before any Buffer call', async (t) => {
  const f = fixture(t);
  f.plan.posts[1].text = f.plan.posts[0].text;
  f.write();
  await assert.rejects(f.run(true), /Each post needs/);
  assert.equal(f.calls.length, 0);
});

test('inspects later queue pages before choosing slots', async (t) => {
  const f = fixture(t, 1);
  f.setPages([
    [
      {
        id: 'other-1',
        status: 'scheduled',
        dueAt: '2026-10-09T18:20:00Z',
        text: 'First campaign',
      },
    ],
    [
      {
        id: 'other-2',
        status: 'scheduled',
        dueAt: '2026-10-09T18:50:00Z',
        text: 'Second campaign',
      },
    ],
  ]);
  const preview = await f.run();
  assert.equal(preview.reports[0].dueAt, '2026-10-09T19:15:00.000Z');
  assert.deepEqual(
    f.calls
      .filter((call) => call.command === 'posts list')
      .map((call) => call.options.after),
    [undefined, '1'],
  );
});

test('a selected material development replaces its superseded queued version', async (t) => {
  const f = fixture(t, 1);
  await f.run(true);
  f.news[0].body = f.live[0].body = 'A confirmed new development.';
  f.plan.posts[0].text =
    'A confirmed new development. https://www.formula1.com/story-0';
  f.plan.posts[0].materialUpdate = true;
  f.write();
  const result = await f.run(true);
  assert.deepEqual(
    result.reports.map((post) => post.action),
    ['cancelled', 'scheduled'],
  );
  assert.equal(f.remote.length, 1);
  assert.equal(f.remote[0].text, f.plan.posts[0].text);
});
