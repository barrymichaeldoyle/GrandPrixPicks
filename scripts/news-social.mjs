import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { openNewsSocialState } from './news-social-state.mjs';

const MINUTE = 60_000;
const SITE = 'https://grandprixpicks.com';
/** A race write-up link, capturing its query string. */
const WRITEUP_LINK =
  /^https:\/\/grandprixpicks\.com\/f1-\d{4}-[a-z-]+-grand-prix-predictions(\?[^\s#]*)?$/;
const ANY_URL = /https?:\/\//i;
const ACTIVE = new Set(['scheduled', 'sending', 'needs_approval']);
/**
 * At most this many workflow posts a day on the channel, scheduled or sent.
 * Thirty-three news posts in a fortnight averaged 38 impressions each
 * (2026-10-23): X shows a link feed to nobody. Fewer posts, each the strongest
 * story of its half-day, is the whole point of the selection.
 */
const DAILY_CAP = 2;
const DEFAULT_TIMEZONE = 'Africa/Johannesburg';
const SESSIONS = {
  quali: 'qualifying',
  sprint_quali: 'sprint qualifying',
  sprint: 'sprint',
  race: 'race',
};

/** Calendar day of a timestamp in the channel's timezone, e.g. "2026-10-23". */
function dayKey(ms, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

function isResultsStory(story) {
  return story.key.startsWith('results:');
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function timestamp(value, label) {
  if (
    typeof value !== 'string' ||
    !/(Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(
      `${label} must be an ISO timestamp with an explicit timezone.`,
    );
  }
  return Date.parse(value);
}

function revision(item) {
  return digest({
    headline: item.headline,
    body: item.body,
    sourceUrl: item.sourceUrl,
    sourcePublishedAt:
      item.sourcePublishedAt == null
        ? null
        : typeof item.sourcePublishedAt === 'number'
          ? item.sourcePublishedAt
          : Date.parse(item.sourcePublishedAt),
    affectsSessions: item.affectsSessions ?? [],
  });
}

function identity(story) {
  return `${story.raceSlug ?? 'global'}/${story.key}`;
}

function bufferCommand(
  command,
  payload,
  { dryRun = false, fields, after } = {},
) {
  const args = [
    ...command,
    '--json',
    JSON.stringify(payload),
    '--output',
    'json',
  ];
  if (dryRun) {
    args.push('--dry-run');
  }
  if (fields) {
    args.push('--fields', fields);
  }
  if (after) {
    args.push('--after', after);
  }
  const result = spawnSync('buffer', args, {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    // Only the cloud Buffer subprocess needs Node's opt-in to HTTPS_PROXY.
    // The platform proxy injects its host-scoped network secret outside the VM.
    env:
      process.env.GPP_CONVEX_PROXY_URL ===
      'https://cheery-tern-274.convex.cloud'
        ? { ...process.env, NODE_USE_ENV_PROXY: '1' }
        : process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `buffer ${command.join(' ')} failed: ${result.error?.message ?? result.stderr?.trim() ?? 'unknown error'}`,
    );
  }
  return JSON.parse(result.stdout);
}

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function saveLedger(file, ledger, sharedState) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, file);
  sharedState?.save(ledger);
}

// Conservative for non-ASCII characters; Buffer performs its own validation too.
function textLength(text) {
  const withoutUrls = text.replace(/https?:\/\/\S+/g, 'x'.repeat(23));
  return [...withoutUrls.normalize('NFC')].reduce(
    (count, char) => count + (char.codePointAt(0) <= 0x7f ? 1 : 2),
    0,
  );
}

async function inventory(buffer, organizationId, channelId, now) {
  const items = [];
  let after;
  for (let page = 0; page < 40; page++) {
    const result = await buffer(
      ['posts', 'list'],
      {
        organizationId,
        filter: {
          channelIds: [channelId],
          dueAt: { start: new Date(now - 30 * 24 * 60 * MINUTE).toISOString() },
          status: ['scheduled', 'sending', 'sent', 'needs_approval'],
        },
        sort: [{ field: 'dueAt', direction: 'asc' }],
      },
      { fields: 'items.{id,text,status,dueAt,sentAt},pageInfo', after },
    );
    if (!Array.isArray(result.items) || !result.pageInfo) {
      throw new Error('Buffer returned an invalid queue response.');
    }
    items.push(...result.items);
    if (!result.pageInfo.hasNextPage) {
      return items;
    }
    if (!result.pageInfo.endCursor || result.pageInfo.endCursor === after) {
      throw new Error('Buffer pagination did not advance.');
    }
    after = result.pageInfo.endCursor;
  }
  throw new Error(
    'X queue exceeds the inspection limit; no posts were scheduled.',
  );
}

function resultsRevision(result) {
  return digest(
    result.entries.map((entry) => [entry.position, entry.code, entry.status]),
  );
}

function surname(name) {
  return name.trim().split(/\s+/).pop();
}

/** Post copy for a published classification: the podium, in plain words. */
export function resultsPostText(race, session, entries) {
  const top = entries.filter((entry) => !entry.status).slice(0, 3);
  if (top.length < 3) {
    throw new Error('A results post needs three classified finishers.');
  }
  const [first, second, third] = top.map((entry) => surname(entry.name));
  const name = race.name.replace(/ Grand Prix$/, ' GP');
  if (session === 'quali' || session === 'sprint_quali') {
    return `${name} ${SESSIONS[session]}: ${first} on pole, ${second} second, ${third} third.`;
  }
  return `${name} ${SESSIONS[session]}: ${first} wins from ${second} and ${third}.`;
}

/**
 * The results post for one session: the classification card as the image,
 * the podium as the text, the race page in a reply. One per race and
 * session, ever: an amendment is reported, never reposted on its own.
 */
export async function resultsSocial(
  raceSlug,
  session,
  flags,
  { root, convexRun, buffer = bufferCommand, now = Date.now(), channel },
) {
  if (!raceSlug || !Object.hasOwn(SESSIONS, session)) {
    throw new Error(
      'results social <race-slug> quali|sprint_quali|sprint|race [--prod] [--apply]',
    );
  }
  const response = await convexRun(
    'ops:sessionResult',
    { raceSlug, session },
    flags,
  );
  if (!response) {
    throw new Error(`No race "${raceSlug}".`);
  }
  if (!response.result) {
    throw new Error(
      `No ${SESSIONS[session]} result published for ${raceSlug} yet.`,
    );
  }
  const text = resultsPostText(response.race, session, response.result.entries);
  const rev = resultsRevision(response.result);
  const label = `${response.race.name} ${SESSIONS[session]}`;
  const prebuilt = {
    plan: {
      organizationId: channel.organizationId,
      channelId: channel.channelId,
    },
    startAt: now + 5 * MINUTE,
    selections: [
      {
        keys: [`results:${session}`],
        text,
        link: `${SITE}/races/${encodeURIComponent(raceSlug)}`,
        image: {
          url: `${SITE}/og/results?race=${encodeURIComponent(raceSlug)}&session=${session}&v=${rev.slice(0, 12)}`,
          alt: `${label} classification`,
        },
        stories: [{ raceSlug, key: `results:${session}`, revision: rev }],
        expiresAt: now + 12 * 60 * MINUTE,
      },
    ],
  };
  const result = await newsSocial(null, flags, {
    root,
    convexRun,
    buffer,
    now,
    prebuilt,
  });
  if (response.result.amendedAt) {
    result.reports.push({
      action: 'note',
      keys: [`results:${session}`],
      reason: `This classification was amended at ${new Date(response.result.amendedAt).toISOString()}; the first publication is what was posted.`,
    });
  }
  return result;
}

/** Operator-owned X selection. Reads live news; writes only Buffer and a local journal. */
export async function newsSocial(
  file,
  flags,
  { root, convexRun, buffer = bufferCommand, now = Date.now(), prebuilt },
) {
  if (flags.apply && !flags.prod) {
    throw new Error(
      'X scheduling requires --prod so development news cannot reach the live account.',
    );
  }
  const ledgerFile = path.join(
    root,
    'artifacts/social/news-sweeps/ledger.json',
  );
  const lock = path.join(root, '.gpp-news-social.lock');
  const stateConfigFile = path.join(
    root,
    'artifacts/automations/news-check/state.json',
  );
  const stateConfig = existsSync(stateConfigFile)
    ? loadJson(stateConfigFile)
    : null;
  let sharedState;
  if (flags.apply) {
    try {
      mkdirSync(lock);
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error(
          'Another news social apply is running, or its lock needs inspection.',
        );
      }
      throw error;
    }
  }
  try {
    if (stateConfig) {
      const origin = spawnSync('git', ['remote', 'get-url', 'origin'], {
        cwd: root,
        encoding: 'utf8',
      });
      if (origin.status !== 0 || !origin.stdout.trim()) {
        throw new Error(
          'Shared news state needs the repository origin remote.',
        );
      }
      sharedState = openNewsSocialState({
        ...stateConfig,
        // Cloud clones use an authenticated Git proxy in their origin URL.
        remote: origin.stdout.trim(),
        apply: Boolean(flags.apply),
      });
      // Always replace the checkout snapshot with the authoritative journal.
      saveLedger(ledgerFile, sharedState.ledger);
    }
    return await run(file, flags, {
      root,
      convexRun,
      buffer,
      now,
      ledgerFile,
      sharedState,
      prebuilt,
    });
  } finally {
    try {
      sharedState?.close();
    } finally {
      if (flags.apply) {
        rmSync(lock, { recursive: true });
      }
    }
  }
}

async function run(
  file,
  flags,
  { convexRun, buffer, now, ledgerFile, sharedState, prebuilt },
) {
  if (!file && !prebuilt) {
    throw new Error('news social <selection.json>|check [--prod] [--apply]');
  }
  const ledger = existsSync(ledgerFile)
    ? loadJson(ledgerFile)
    : { version: 1, posts: [] };
  if (ledger.version !== 1 || !Array.isArray(ledger.posts)) {
    throw new Error('Invalid news social ledger.');
  }
  const apply = Boolean(flags.apply);
  const deployment = flags.prod ? 'prod' : 'dev';
  const planFile = file && file !== 'check' ? path.resolve(file) : null;
  let plan = planFile ? loadJson(planFile) : null;
  let selections = [];
  let start = now + 5 * MINUTE;
  let gap = 25 * MINUTE;
  if (prebuilt) {
    ({ plan, selections } = prebuilt);
    start = Math.max(start, prebuilt.startAt ?? 0);
  } else if (plan) {
    if (
      !plan.organizationId ||
      !plan.channelId ||
      typeof plan.newsFile !== 'string' ||
      !Array.isArray(plan.posts) ||
      plan.posts.length < 1 ||
      plan.posts.length > 2
    ) {
      throw new Error(
        'A selection needs organizationId, channelId, newsFile and one or two posts.',
      );
    }
    start = timestamp(plan.startAt, 'startAt');
    gap = (plan.intervalMinutes ?? 25) * MINUTE;
    if (!Number.isFinite(gap) || gap < 20 * MINUTE || gap > 30 * MINUTE) {
      throw new Error('intervalMinutes must be between 20 and 30.');
    }
    start = Math.max(start, now + 5 * MINUTE);
    const raw = loadJson(path.resolve(path.dirname(planFile), plan.newsFile));
    const news = Array.isArray(raw) ? raw : [raw];
    const byKey = new Map(news.map((item) => [item.key, item]));
    if (byKey.size !== news.length) {
      throw new Error('The news file contains duplicate story keys.');
    }
    const selected = new Set();
    const selectedTexts = new Set();
    selections = plan.posts.map((post) => {
      if (
        !Array.isArray(post.keys) ||
        !post.keys.length ||
        typeof post.text !== 'string' ||
        !post.text.trim() ||
        selectedTexts.has(post.text.trim()) ||
        textLength(post.text) > 280 ||
        (post.link !== undefined && typeof post.link !== 'string') ||
        (post.materialUpdate !== undefined &&
          typeof post.materialUpdate !== 'boolean')
      ) {
        throw new Error(
          'Each post needs story keys, text within 280 weighted characters, an optional link and an optional boolean materialUpdate.',
        );
      }
      // The link goes in a reply, never in the post. X shows a post with a
      // link to a fraction of the people it shows a plain one to, and the
      // story's card rides along as a native image instead (docs/news-social.md).
      if (ANY_URL.test(post.text)) {
        throw new Error(
          `Post text must not carry a URL; put it in "link": ${post.keys.join(', ')}`,
        );
      }
      selectedTexts.add(post.text.trim());
      const expiresAt = timestamp(post.expiresAt, 'expiresAt');
      const items = [];
      const stories = post.keys.map((key) => {
        const item = byKey.get(key);
        if (
          !item ||
          !item.headline ||
          !item.body ||
          !item.sourceUrl ||
          selected.has(key)
        ) {
          throw new Error(
            `Missing, invalid or repeated selected story: ${key}`,
          );
        }
        selected.add(key);
        items.push(item);
        return {
          raceSlug: item.raceSlug ?? null,
          key,
          revision: revision(item),
        };
      });
      const link = post.link?.trim() || null;
      if (link) {
        const writeup = link.match(WRITEUP_LINK);
        if (writeup) {
          // X caches a link preview by URL. A bare write-up link unfurls as the
          // write-up's card on every post; `?story=<key>` shows that story's
          // headline instead (docs/news-social.md).
          const story = new URLSearchParams(writeup[1]).get('story');
          if (!story || !post.keys.includes(story)) {
            throw new Error(
              `Write-up links need ?story=<one of this post's keys>: ${post.keys.join(', ')}`,
            );
          }
        } else if (!items.some((item) => item.sourceUrl === link)) {
          throw new Error(
            `link must be a write-up ?story= link or a selected story's sourceUrl: ${post.keys.join(', ')}`,
          );
        }
      }
      // The story's own card, as the post's image. Global stories have no
      // write-up and so no card; they go out as text.
      const lead = stories.find((story) => story.raceSlug);
      const image = lead
        ? {
            url: `${SITE}/og/news?race=${encodeURIComponent(lead.raceSlug)}&story=${encodeURIComponent(lead.key)}&v=${lead.revision.slice(0, 12)}`,
            alt: byKey.get(lead.key).headline,
          }
        : null;
      return { ...post, link, image, stories, expiresAt };
    });
  }

  // Full source snapshots are checked again on every run, including --apply.
  const cache = new Map();
  async function current(story) {
    const scope = identity(story);
    if (!cache.has(scope)) {
      if (isResultsStory(story)) {
        const response = await convexRun(
          'ops:sessionResult',
          { raceSlug: story.raceSlug, session: story.key.slice(8) },
          flags,
        );
        if (!response || !Object.hasOwn(response, 'result')) {
          throw new Error(`Invalid live result response for ${scope}.`);
        }
        // A published classification is "active" news that never leaves the
        // feed; an amendment is a new revision, like a corrected headline.
        cache.set(
          scope,
          response.result
            ? {
                active: true,
                feedSelected: true,
                feedVisibleAt: 0,
                resultsRevision: resultsRevision(response.result),
              }
            : null,
        );
      } else if (story.raceSlug) {
        const response = await convexRun(
          'ops:newsList',
          { raceSlug: story.raceSlug, key: story.key },
          flags,
        );
        if (!response || !Object.hasOwn(response, 'item')) {
          throw new Error(`Invalid live news response for ${scope}.`);
        }
        cache.set(scope, response.item);
      } else {
        if (!cache.has('global')) {
          const response = await convexRun(
            'globalNews:listForOperators',
            {},
            flags,
          );
          if (!Array.isArray(response?.items)) {
            throw new Error('Invalid live global news response.');
          }
          cache.set(
            'global',
            new Map(response.items.map((item) => [item.key, item])),
          );
        }
        cache.set(scope, cache.get('global').get(story.key));
      }
    }
    return cache.get(scope);
  }
  async function fresh(stories) {
    for (const story of stories) {
      const item = await current(story);
      if (
        !item?.active ||
        item.feedSelected === false ||
        item.feedVisibleAt > now ||
        (isResultsStory(story) ? item.resultsRevision : revision(item)) !==
          story.revision
      ) {
        return false;
      }
    }
    return true;
  }
  for (const post of selections) {
    if (!(await fresh(post.stories))) {
      throw new Error(
        `Selected news has changed, is retracted or is held from the feed: ${post.keys.join(', ')}. Refresh the news file and copy.`,
      );
    }
  }

  const reports = [];
  const queues = new Map();
  const timezones = new Map();
  async function queue(organizationId, channelId) {
    const id = `${organizationId}/${channelId}`;
    if (!queues.has(id)) {
      const channel = await buffer(
        ['channels', 'get'],
        { id: channelId },
        {
          fields:
            'id,service,organizationId,isDisconnected,isQueuePaused,timezone',
        },
      );
      if (
        channel.id !== channelId ||
        channel.service !== 'twitter' ||
        channel.organizationId !== organizationId ||
        channel.isDisconnected ||
        channel.isQueuePaused
      ) {
        throw new Error(
          'The selected Buffer channel must be a connected, unpaused X channel in this organization.',
        );
      }
      timezones.set(channelId, channel.timezone || DEFAULT_TIMEZONE);
      queues.set(id, await inventory(buffer, organizationId, channelId, now));
    }
    return queues.get(id);
  }

  const relevant = ledger.posts.filter(
    (entry) => entry.deployment === deployment,
  );
  const cancellations = [];
  for (const entry of relevant) {
    if (entry.status === 'cancelled' || entry.status === 'sent') {
      continue;
    }
    const remote = await queue(entry.organizationId, entry.channelId);
    let post = entry.bufferPostId
      ? await buffer(
          ['posts', 'get'],
          { id: entry.bufferPostId },
          { fields: 'id,text,status,dueAt,channelId' },
        )
      : null;
    if (!post) {
      const matches = remote.filter(
        (item) => item.text === entry.text && item.dueAt === entry.dueAt,
      );
      if (matches.length !== 1) {
        throw new Error(
          `Uncertain Buffer create for ${entry.id}. Inspect Buffer and the ledger before retrying; creation was not retried.`,
        );
      }
      [post] = matches;
      entry.bufferPostId = post.id;
    }
    if (
      post.text !== entry.text ||
      (post.channelId && post.channelId !== entry.channelId) ||
      post.dueAt !== entry.dueAt
    ) {
      throw new Error(
        `Buffer post ${post.id} was edited outside this workflow. Review it before continuing.`,
      );
    }
    entry.status = post.status;
    if (post.status === 'sent') {
      continue;
    }
    if (post.status === 'sending') {
      throw new Error(
        `News post ${post.id} is already sending; wait and inspect it before scheduling more.`,
      );
    }
    if (post.status !== 'scheduled') {
      throw new Error(
        `News post ${post.id} has status ${post.status}; inspect it before continuing.`,
      );
    }
    if (Date.parse(entry.expiresAt) <= now || !(await fresh(entry.stories))) {
      cancellations.push(entry);
      reports.push({
        action: apply ? 'cancelled' : 'would_cancel',
        bufferPostId: post.id,
        reason: 'News changed, was retracted or expired.',
      });
    }
  }

  const prepared = [];
  if (plan) {
    const remote = await queue(plan.organizationId, plan.channelId);
    const removed = new Set(cancellations.map((entry) => entry.bufferPostId));
    const occupied = remote
      .filter(
        (post) =>
          !removed.has(post.id) &&
          (ACTIVE.has(post.status) || post.status === 'sent'),
      )
      .map((post) => Date.parse(post.sentAt ?? post.dueAt))
      .filter(Number.isFinite);
    let next = start;
    for (const post of selections) {
      const history = relevant.filter(
        (entry) =>
          entry.channelId === plan.channelId &&
          entry.stories.some((story) =>
            post.stories.some(
              (selectedStory) => identity(story) === identity(selectedStory),
            ),
          ),
      );
      const same = history.some(
        (entry) =>
          entry.status !== 'cancelled' &&
          entry.stories.some((story) =>
            post.stories.some(
              (selectedStory) =>
                identity(story) === identity(selectedStory) &&
                story.revision === selectedStory.revision,
            ),
          ),
      );
      if (
        same ||
        remote.some((item) => !removed.has(item.id) && item.text === post.text)
      ) {
        reports.push({
          action: 'skipped',
          keys: post.keys,
          reason: 'Already shared or queued.',
        });
        continue;
      }
      if (history.length && !post.materialUpdate) {
        reports.push({
          action: 'skipped',
          keys: post.keys,
          reason:
            'Previously selected story; a material update must be explicitly selected.',
        });
        continue;
      }
      if (
        history.some(
          (entry) =>
            entry.status === 'scheduled' && !removed.has(entry.bufferPostId),
        )
      ) {
        throw new Error(
          `A version of ${post.keys.join(', ')} is still queued. Resolve it before selecting another.`,
        );
      }
      let candidate = next;
      for (const at of [...occupied].sort((a, b) => a - b)) {
        if (Math.abs(candidate - at) < gap) {
          candidate = at + gap;
        }
      }
      if (candidate >= post.expiresAt) {
        throw new Error(
          `No available slot before expiry for ${post.keys.join(', ')}.`,
        );
      }
      const timeZone = timezones.get(plan.channelId) ?? DEFAULT_TIMEZONE;
      const day = dayKey(candidate, timeZone);
      const today = [
        ...relevant.filter(
          (entry) =>
            entry.channelId === plan.channelId &&
            entry.status !== 'cancelled' &&
            !removed.has(entry.bufferPostId) &&
            !cancellations.includes(entry),
        ),
        ...prepared.map((entry) => entry.payload),
      ].filter((entry) => dayKey(Date.parse(entry.dueAt), timeZone) === day);
      if (today.length >= DAILY_CAP) {
        reports.push({
          action: 'skipped',
          keys: post.keys,
          reason: `Daily cap: ${DAILY_CAP} workflow posts already on ${day} (${timeZone}).`,
        });
        continue;
      }
      const assets = post.image
        ? [
            {
              image: {
                url: post.image.url,
                metadata: { altText: post.image.alt },
              },
            },
          ]
        : [];
      const payload = {
        channelId: plan.channelId,
        schedulingType: 'automatic',
        mode: 'customScheduled',
        dueAt: new Date(candidate).toISOString(),
        text: post.text,
        aiAssisted: true,
        ...(assets.length ? { assets } : {}),
        // The link rides in a reply under the post, where it costs no reach.
        ...(post.link
          ? {
              metadata: {
                twitter: {
                  thread: [
                    { text: post.text, ...(assets.length ? { assets } : {}) },
                    { text: post.link },
                  ],
                },
              },
            }
          : {}),
      };
      await buffer(['posts', 'create'], payload, { dryRun: true });
      prepared.push({
        payload,
        stories: post.stories,
        keys: post.keys,
        expiresAt: new Date(post.expiresAt).toISOString(),
      });
      occupied.push(candidate);
      next = candidate + gap;
    }
  }

  // Validate the entire batch before any external mutation. Every create is
  // journalled first because Buffer does not support idempotency keys.
  if (apply) {
    saveLedger(ledgerFile, ledger, sharedState);
    for (const entry of cancellations) {
      await buffer(
        ['posts', 'delete'],
        { id: entry.bufferPostId },
        { dryRun: true },
      );
      await buffer(['posts', 'delete'], { id: entry.bufferPostId });
      entry.status = 'cancelled';
      saveLedger(ledgerFile, ledger, sharedState);
    }
  }
  for (const post of prepared) {
    const record = {
      id: digest([deployment, plan.channelId, post.stories, post.payload.text]),
      deployment,
      organizationId: plan.organizationId,
      channelId: plan.channelId,
      stories: post.stories,
      text: post.payload.text,
      ...(post.payload.metadata
        ? { link: post.payload.metadata.twitter.thread[1].text }
        : {}),
      ...(post.payload.assets
        ? { imageUrl: post.payload.assets[0].image.url }
        : {}),
      dueAt: post.payload.dueAt,
      expiresAt: post.expiresAt,
      status: 'creating',
    };
    if (apply) {
      ledger.posts.push(record);
      saveLedger(ledgerFile, ledger, sharedState);
      const result = await buffer(['posts', 'create'], post.payload, {
        fields: 'post.id,post.status,post.text,post.dueAt',
      });
      if (!result.post?.id) {
        throw new Error(
          `Buffer did not confirm create ${record.id}. Inspect before retrying.`,
        );
      }
      record.bufferPostId = result.post.id;
      saveLedger(ledgerFile, ledger, sharedState);
      const verified = await buffer(
        ['posts', 'get'],
        { id: record.bufferPostId },
        { fields: 'id,text,status,dueAt,channelId' },
      );
      if (
        verified.status !== 'scheduled' ||
        verified.text !== record.text ||
        verified.dueAt !== record.dueAt ||
        verified.channelId !== record.channelId
      ) {
        throw new Error(
          `Buffer post ${record.bufferPostId} needs inspection: scheduled content was not verified.`,
        );
      }
      record.status = 'scheduled';
      saveLedger(ledgerFile, ledger, sharedState);
    }
    reports.push({
      action: apply ? 'scheduled' : 'would_schedule',
      keys: post.keys,
      dueAt: record.dueAt,
      text: record.text,
      link: record.link,
      imageUrl: record.imageUrl,
      bufferPostId: record.bufferPostId,
    });
  }
  return { deployment, apply, reports };
}
