import { calculateRateLimit, RateLimiter } from '@convex-dev/rate-limiter';
import { newsTeam } from '@grandprixpicks/shared/newsTeam';
import { isNewsTopic } from '@grandprixpicks/shared/newsTopics';
import {
  getRaceWriteupPhase,
  isRaceWriteupLive,
} from '@grandprixpicks/shared/raceWriteupPhase';
import { getRaceWriteup } from '@grandprixpicks/shared/raceWriteups';
import { ConvexError, v, type Infer } from 'convex/values';

import { components } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { SETTLE_MS } from './lib/newsApiChanges';
import { NEWS_API_SAMPLE } from './lib/newsApiSample';
import {
  currentTranslations,
  translationSourceHash,
} from './lib/newsApiTranslations';
import {
  newsApiPlanValidator,
  newsLanguageValidator,
  newsTopicValidator,
} from './lib/newsApiValidators';
import { sortStartingGrid } from './lib/raceNewsStartingGrid';
import { driversForCodes } from './raceNews';

/**
 * The news API: every published story, race-weekend and race-independent, as
 * one keyed, paged list. Contract and operator commands: `docs/news-api.md`.
 *
 * It owns no news. `raceNews:publish` and `globalNews:publish` stay the only
 * way a story is written, so the API, the feed and the write-ups cannot
 * disagree about what was published. What lives here is the read model over
 * those two tables, the keys that open it and the waiting list.
 *
 * The HTTP surface is `apps/web/server/routes/api/v1`. Those routes are
 * thin: a key is checked here, in the query, because a public Convex function
 * can be called by anyone who has the deployment URL.
 */

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/** Rows read from each table per request. Bounds a filtered scan. */
const SCAN_ROWS = 300;

/** A weekend's whole pool, read at once when the request names a race. */
const MAX_NEWS_PER_RACE = 500;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

type Plan = Infer<typeof newsApiPlanValidator>;

/**
 * What each plan gets: requests a minute, and how late it sees a story.
 * The one place these live; `docs/news-api.md` states them.
 *
 * A `free` key reads every story a day late: the list leaves out stories
 * younger than that, `get` answers 404 for one, and the change feed settles
 * at now minus a day instead of `SETTLE_MS`.
 */
const NEWS_API_PLANS = {
  free: { requestsPerMinute: 10, delayMs: 24 * HOUR, translations: false },
  hobby: { requestsPerMinute: 60, delayMs: 0, translations: false },
  commercial: { requestsPerMinute: 300, delayMs: 0, translations: true },
} as const satisfies Record<
  Plan,
  { requestsPerMinute: number; delayMs: number; translations: boolean }
>;

/** Keys issued before plans existed carry none, and keep what they had. */
export function planOf(key: Doc<'newsApiKeys'>): Plan {
  return key.plan ?? 'commercial';
}

/**
 * Whether a key may read in `lang`. English is open to every plan; a
 * translation needs a plan with `translations`. Checked here, in the
 * queries, for the reason the key is: they are public.
 */
function mayRead(key: Doc<'newsApiKeys'>, lang: string | undefined): boolean {
  return (
    lang === undefined ||
    lang === 'en' ||
    NEWS_API_PLANS[planOf(key)].translations
  );
}

/**
 * Where `url` points. A constant rather than the deployment's own URL: a
 * story's page is on the public site whichever backend served it.
 */
const SITE_URL = 'https://grandprixpicks.com';

/** Bounds an index range that has no upper end. */
const NO_LIMIT = Number.MAX_SAFE_INTEGER;

const KEY_PATTERN = /^gpp_[A-Za-z0-9]{40}$/;
const KEY_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// ============ Keys ============

/**
 * `length` characters from `KEY_ALPHABET`, from the platform's CSPRNG. Keys
 * and webhook signing secrets both come from here.
 */
export function randomToken(length: number): string {
  // Rejection sampling: 248 is the largest multiple of 62 a byte can hold,
  // so every character is equally likely.
  let token = '';
  while (token.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(64))) {
      if (byte < 248 && token.length < length) {
        token += KEY_ALPHABET[byte % 62];
      }
    }
  }
  return token;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

async function keyFor(
  ctx: QueryCtx,
  apiKey: string,
): Promise<Doc<'newsApiKeys'> | null> {
  if (!KEY_PATTERN.test(apiKey)) {
    return null;
  }
  const keyHash = await sha256Hex(apiKey);
  const row = await ctx.db
    .query('newsApiKeys')
    .withIndex('by_keyHash', (q) => q.eq('keyHash', keyHash))
    .unique();
  return row !== null && row.revokedAt === undefined ? row : null;
}

async function authorized(ctx: QueryCtx, apiKey: string): Promise<boolean> {
  return (await keyFor(ctx, apiKey)) !== null;
}

/**
 * Issue a key on a plan. The key is in the return value and nowhere else:
 * only its hash is stored, so one that is lost is revoked and replaced, not
 * recovered.
 *
 * Run via:
 *   npx convex run --prod newsApi:createKey '{"label":"discord-bot","plan":"hobby"}'
 */
export const createKey = internalMutation({
  args: { label: v.string(), plan: newsApiPlanValidator },
  returns: v.object({
    key: v.string(),
    label: v.string(),
    prefix: v.string(),
    plan: newsApiPlanValidator,
  }),
  handler: async (ctx, args) => {
    const label = args.label.trim();
    if (label.length < 2 || label.length > 80) {
      throw new ConvexError('Give the key a label of 2 to 80 characters.');
    }
    const { key, prefix } = await issueKey(ctx, { label, plan: args.plan });
    return { key, label, prefix, plan: args.plan };
  },
});

/**
 * Store a new key and return it, the one time it exists in the clear. Both
 * ways a key is made go through here: `createKey` for the operator and
 * `newsApiAccount.createMyKey` for an account.
 */
export async function issueKey(
  ctx: MutationCtx,
  args: { label: string; plan: Plan; userId?: Id<'users'> },
): Promise<{ id: Id<'newsApiKeys'>; key: string; prefix: string }> {
  const key = `gpp_${randomToken(40)}`;
  const prefix = key.slice(0, 10);
  const id = await ctx.db.insert('newsApiKeys', {
    label: args.label,
    keyHash: await sha256Hex(key),
    prefix,
    plan: args.plan,
    ...(args.userId === undefined ? {} : { userId: args.userId }),
    createdAt: Date.now(),
  });
  return { id, key, prefix };
}

/**
 * Move a key to another plan. Takes the `id` that `listKeys` prints. The new
 * limit applies from the key's next request.
 *
 * Run via:
 *   npx convex run --prod newsApi:setKeyPlan '{"id":"...","plan":"commercial"}'
 */
export const setKeyPlan = internalMutation({
  args: { id: v.id('newsApiKeys'), plan: newsApiPlanValidator },
  returns: v.object({
    label: v.string(),
    from: newsApiPlanValidator,
    to: newsApiPlanValidator,
  }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError('No key with that id.');
    }
    await ctx.db.patch(row._id, { plan: args.plan });
    return { label: row.label, from: planOf(row), to: args.plan };
  },
});

/**
 * Every key, newest first, by label and prefix. Never the key itself.
 * `account` is the account that created it on `/f1-news-api/keys`, null for
 * a key the operator issued.
 *
 * Run via:
 *   npx convex run --prod newsApi:listKeys '{}'
 */
export const listKeys = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.id('newsApiKeys'),
      label: v.string(),
      prefix: v.string(),
      plan: newsApiPlanValidator,
      account: v.union(
        v.object({
          userId: v.id('users'),
          username: v.union(v.string(), v.null()),
        }),
        v.null(),
      ),
      createdAt: v.string(),
      revokedAt: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query('newsApiKeys').order('desc').take(200);
    const usernames = new Map<Id<'users'>, string | null>();
    for (const row of rows) {
      if (row.userId !== undefined && !usernames.has(row.userId)) {
        const user = await ctx.db.get(row.userId);
        usernames.set(row.userId, user?.username ?? null);
      }
    }
    return rows.map((row) => ({
      id: row._id,
      label: row.label,
      prefix: row.prefix,
      plan: planOf(row),
      account:
        row.userId === undefined
          ? null
          : {
              userId: row.userId,
              username: usernames.get(row.userId) ?? null,
            },
      createdAt: new Date(row.createdAt).toISOString(),
      revokedAt:
        row.revokedAt === undefined
          ? null
          : new Date(row.revokedAt).toISOString(),
    }));
  },
});

/**
 * Stop a key working. Takes the `id` that `listKeys` prints.
 *
 * Run via:
 *   npx convex run --prod newsApi:revokeKey '{"id":"..."}'
 */
export const revokeKey = internalMutation({
  args: { id: v.id('newsApiKeys') },
  returns: v.object({ label: v.string(), revoked: v.boolean() }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError('No key with that id.');
    }
    if (row.revokedAt !== undefined) {
      return { label: row.label, revoked: false };
    }
    await ctx.db.patch(row._id, { revokedAt: Date.now() });
    return { label: row.label, revoked: true };
  },
});

// ============ Cursor ============

type Mode = 'published' | 'changes';

/**
 * Where a reader is in the list: everything before `t` (in list order) has
 * been read, and so have the ids in `seen`, which share that exact
 * millisecond. A batch publishes several stories two seconds apart, so equal
 * stamps are rare but not impossible, and a bare timestamp would skip or
 * repeat them.
 */
type Position = { t: number; seen: string[] };

export function encodeCursor(mode: Mode, position: Position): string {
  return btoa(
    JSON.stringify({
      m: mode === 'published' ? 'p' : 'c',
      t: position.t,
      s: position.seen,
    }),
  )
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function decodeCursor(
  cursor: string,
): { mode: Mode; position: Position } | null {
  try {
    const parsed: unknown = JSON.parse(
      atob(cursor.replaceAll('-', '+').replaceAll('_', '/')),
    );
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const { m, t, s } = parsed as Record<string, unknown>;
    if (
      (m !== 'p' && m !== 'c') ||
      typeof t !== 'number' ||
      !Number.isFinite(t) ||
      !Array.isArray(s) ||
      s.length > 200 ||
      !s.every((id) => typeof id === 'string' && id.length <= 64)
    ) {
      return null;
    }
    return {
      mode: m === 'p' ? 'published' : 'changes',
      position: { t, seen: s as string[] },
    };
  } catch {
    return null;
  }
}

// ============ Read model ============

type Candidate =
  | { table: 'raceNews'; doc: Doc<'raceNews'> }
  | { table: 'globalNews'; doc: Doc<'globalNews'> };

function stamp(mode: Mode, candidate: Candidate): number {
  return mode === 'published'
    ? candidate.doc.publishedAt
    : candidate.doc.updatedAt;
}

/** An inclusive range on the stamp an index is ordered by. */
type Range = { lo: number; hi: number };

/**
 * The next stretch of both tables in list order, each read within its own
 * range.
 *
 * `partial` means a table had more rows than one read takes. The merged list
 * is then cut at the point the shorter read reached, because past it the
 * other table's rows could no longer be placed in order.
 */
async function scan(
  ctx: QueryCtx,
  mode: Mode,
  ranges: { raceNews: Range; globalNews: Range },
): Promise<{ rows: Candidate[]; partial: boolean }> {
  const [raceRows, globalRows] =
    mode === 'published'
      ? await Promise.all([
          ctx.db
            .query('raceNews')
            .withIndex('by_published', (q) =>
              q
                .gte('publishedAt', ranges.raceNews.lo)
                .lte('publishedAt', ranges.raceNews.hi),
            )
            .order('desc')
            .take(SCAN_ROWS),
          ctx.db
            .query('globalNews')
            .withIndex('by_published', (q) =>
              q
                .gte('publishedAt', ranges.globalNews.lo)
                .lte('publishedAt', ranges.globalNews.hi),
            )
            .order('desc')
            .take(SCAN_ROWS),
        ])
      : await Promise.all([
          ctx.db
            .query('raceNews')
            .withIndex('by_updated', (q) =>
              q
                .gte('updatedAt', ranges.raceNews.lo)
                .lte('updatedAt', ranges.raceNews.hi),
            )
            .take(SCAN_ROWS),
          ctx.db
            .query('globalNews')
            .withIndex('by_updated', (q) =>
              q
                .gte('updatedAt', ranges.globalNews.lo)
                .lte('updatedAt', ranges.globalNews.hi),
            )
            .take(SCAN_ROWS),
        ]);

  const reads: Candidate[][] = [
    raceRows.map((doc) => ({ table: 'raceNews' as const, doc })),
    globalRows.map((doc) => ({ table: 'globalNews' as const, doc })),
  ];
  const direction = mode === 'published' ? -1 : 1;
  // How far the list can be trusted: the nearest end of any read that filled.
  let reach: number | null = null;
  for (const read of reads) {
    if (read.length === SCAN_ROWS) {
      const end = stamp(mode, read[read.length - 1]!);
      reach =
        reach === null
          ? end
          : direction === 1
            ? Math.min(reach, end)
            : Math.max(reach, end);
    }
  }
  const rows = reads
    .flat()
    .filter(
      (candidate) =>
        reach === null || (stamp(mode, candidate) - reach) * direction <= 0,
    );
  return { rows, partial: reach !== null };
}

function inOrder(mode: Mode, rows: Candidate[]): Candidate[] {
  const direction = mode === 'published' ? -1 : 1;
  return [...rows].sort(
    (a, b) =>
      (stamp(mode, a) - stamp(mode, b)) * direction ||
      (a.doc._id < b.doc._id ? -1 : 1),
  );
}

function iso(at: number): string {
  return new Date(at).toISOString();
}

/** The first and last millisecond of a UTC year. */
function yearRange(year: number): Range {
  return { lo: Date.UTC(year, 0, 1), hi: Date.UTC(year + 1, 0, 1) - 1 };
}

function intersect(a: Range, b: Range): Range {
  return { lo: Math.max(a.lo, b.lo), hi: Math.min(a.hi, b.hi) };
}

const publishedStoryValidator = v.object({
  id: v.string(),
  key: v.string(),
  status: v.literal('published'),
  language: newsLanguageValidator,
  /** Every language this story can be read in now, `en` included, sorted. */
  languages: v.array(newsLanguageValidator),
  headline: v.string(),
  body: v.string(),
  url: v.union(v.string(), v.null()),
  source: v.object({
    name: v.string(),
    url: v.string(),
    publishedAt: v.union(v.string(), v.null()),
  }),
  race: v.union(
    v.object({
      slug: v.string(),
      name: v.string(),
      season: v.number(),
      round: v.number(),
    }),
    v.null(),
  ),
  sessions: v.array(v.string()),
  topic: v.union(newsTopicValidator, v.null()),
  drivers: v.array(
    v.object({
      code: v.string(),
      number: v.union(v.number(), v.null()),
      name: v.string(),
      team: v.union(v.string(), v.null()),
    }),
  ),
  team: v.union(v.string(), v.null()),
  startingGrid: v.union(
    v.array(
      v.object({
        position: v.number(),
        code: v.string(),
        name: v.string(),
        team: v.union(v.string(), v.null()),
        note: v.union(v.string(), v.null()),
      }),
    ),
    v.null(),
  ),
  publishedAt: v.string(),
  updatedAt: v.string(),
});

const newsItemValidator = v.union(
  publishedStoryValidator,
  // A retraction carries no story: the text was withdrawn, so it is not
  // served again, only the fact that it went.
  v.object({
    id: v.string(),
    key: v.string(),
    status: v.literal('retracted'),
    updatedAt: v.string(),
  }),
);

export type NewsItem = Infer<typeof newsItemValidator>;

const newsPageValidator = v.object({
  data: v.array(newsItemValidator),
  nextCursor: v.union(v.string(), v.null()),
  hasMore: v.boolean(),
});

export type NewsPage = Infer<typeof newsPageValidator>;

type Roster = Awaited<ReturnType<typeof driversForCodes>>;

function driversOf(candidate: Candidate, roster: Roster) {
  if (candidate.table === 'globalNews') {
    return [];
  }
  return (candidate.doc.driverCodes ?? []).flatMap((code) => {
    const driver = roster.get(code);
    return driver ? [driver] : [];
  });
}

function teamOf(candidate: Candidate, roster: Roster): string | null {
  return candidate.table === 'globalNews'
    ? (candidate.doc.team ?? null)
    : newsTeam(candidate.doc.team, driversOf(candidate, roster));
}

async function rosterFor(ctx: QueryCtx, rows: Candidate[]): Promise<Roster> {
  return await driversForCodes(
    ctx,
    rows.flatMap((candidate) =>
      candidate.table === 'raceNews'
        ? [
            ...(candidate.doc.driverCodes ?? []),
            ...(candidate.doc.startingGrid ?? []).map((entry) => entry.code),
          ]
        : [],
    ),
  );
}

/**
 * The story's card on its race write-up, while that page shows it.
 *
 * A write-up renders its weekend's news (`WeekendNewsSection`, each card
 * `id="news-<key>"`, the anchor the landing page's headlines link to) only
 * while the weekend is live: from the preview until the race locks
 * (`isRaceWriteupLive`). After that most write-ups lead with the result
 * instead and drop the cards. So a link is given only when all of these hold,
 * and null otherwise:
 *
 * - the story is a race story, live, and not held off write-ups
 *   (`writeUpSelected: false`);
 * - its race has a write-up (`packages/shared/src/raceWriteups.ts`);
 * - that write-up is live at `now`.
 *
 * It errs towards null: Singapore keeps its cards after the race and Bahrain
 * keeps three, and those are left out rather than copied here from their
 * routes. A race-independent story has no page of its own.
 */
function storyUrl(
  candidate: Candidate,
  race: Doc<'races'> | null,
  now: number,
): string | null {
  if (
    candidate.table !== 'raceNews' ||
    !race ||
    candidate.doc.writeUpSelected === false
  ) {
    return null;
  }
  const writeup = getRaceWriteup(race.slug);
  if (!writeup || !isRaceWriteupLive(getRaceWriteupPhase(race, now))) {
    return null;
  }
  return `${SITE_URL}${writeup.to}#news-${candidate.doc.key}`;
}

type Language = Infer<typeof newsLanguageValidator>;

/**
 * The story's text in `lang` when a translation of its current English
 * exists, else the English; and every language it can be read in now. A
 * translation made from older English is never served: a corrected penalty
 * read through a stale translation is worse than the English.
 */
async function textIn(
  ctx: QueryCtx,
  doc: Candidate['doc'],
  lang: Language,
): Promise<{
  language: Language;
  languages: Language[];
  headline: string;
  body: string;
}> {
  const translations = await currentTranslations(
    ctx,
    doc._id,
    await translationSourceHash(doc.headline, doc.body),
  );
  const languages = (['en', ...translations.keys()] as Language[]).sort();
  const translation = lang === 'en' ? undefined : translations.get(lang);
  return translation
    ? {
        language: lang,
        languages,
        headline: translation.headline,
        body: translation.body,
      }
    : { language: 'en', languages, headline: doc.headline, body: doc.body };
}

async function present(
  ctx: QueryCtx,
  candidate: Candidate,
  roster: Roster,
  races: Map<Id<'races'>, Doc<'races'> | null>,
  now: number,
  lang: Language = 'en',
): Promise<NewsItem> {
  const { doc } = candidate;
  if (!doc.active) {
    return {
      id: doc._id as string,
      key: doc.key,
      status: 'retracted' as const,
      updatedAt: iso(doc.updatedAt),
    };
  }

  let race: Doc<'races'> | null = null;
  if (candidate.table === 'raceNews') {
    const { raceId } = candidate.doc;
    if (!races.has(raceId)) {
      races.set(raceId, await ctx.db.get(raceId));
    }
    race = races.get(raceId) ?? null;
  }

  const text = await textIn(ctx, doc, lang);
  return {
    id: doc._id as string,
    key: doc.key,
    status: 'published' as const,
    language: text.language,
    languages: text.languages,
    headline: text.headline,
    body: text.body,
    url: storyUrl(candidate, race, now),
    source: {
      name: doc.sourceName,
      url: doc.sourceUrl,
      publishedAt:
        doc.sourcePublishedAt === undefined ? null : iso(doc.sourcePublishedAt),
    },
    race: race
      ? {
          slug: race.slug,
          name: race.name,
          season: race.season,
          round: race.round,
        }
      : null,
    sessions:
      candidate.table === 'raceNews' ? candidate.doc.affectsSessions : [],
    topic: doc.topic ?? null,
    drivers: driversOf(candidate, roster).map((driver) => ({
      code: driver.code,
      number: driver.number,
      name: driver.displayName,
      team: driver.team,
    })),
    team: teamOf(candidate, roster),
    startingGrid:
      candidate.table === 'raceNews' && candidate.doc.startingGrid
        ? sortStartingGrid(candidate.doc.startingGrid).map((entry) => ({
            position: entry.position,
            code: entry.code,
            // A code the roster has since lost keeps its row: a grid one row
            // short looks complete, and the missing row is the one that matters.
            name: roster.get(entry.code)?.displayName ?? entry.code,
            team: roster.get(entry.code)?.team ?? null,
            note: entry.note ?? null,
          }))
        : null,
    publishedAt: iso(doc.publishedAt),
    updatedAt: iso(doc.updatedAt),
  };
}

/** A page request's own arguments, as `newsApiServe.list` takes them. */
export const newsPageRequestArgs = {
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
  updatedSince: v.optional(v.number()),
  race: v.optional(v.string()),
  driver: v.optional(v.string()),
  team: v.optional(v.string()),
  topic: v.optional(newsTopicValidator),
  season: v.optional(v.number()),
  publishedAfter: v.optional(v.number()),
  publishedBefore: v.optional(v.number()),
  /**
   * The base language to read in, already resolved from a tag (`es-MX` is
   * `es`). English when absent. A translation is served only where one of
   * the current English exists.
   */
  lang: v.optional(newsLanguageValidator),
};

const pageArgs = { now: v.number(), ...newsPageRequestArgs };

type PageArgs = Infer<ReturnType<typeof v.object<typeof pageArgs>>>;

export type NewsListResult = Infer<typeof listResultValidator>;
const listResultValidator = v.union(
  v.object({ ok: v.literal(true), ...newsPageValidator.fields }),
  v.object({
    ok: v.literal(false),
    error: v.union(
      v.literal('unauthorized'),
      v.literal('plan_required'),
      v.literal('invalid_cursor'),
      v.literal('unknown_race'),
    ),
  }),
);

/**
 * Published news, newest first, or every change since a moment.
 *
 * Two orders:
 *
 * - The published list: live stories, newest published first. `nextCursor`
 *   is null on the last page.
 * - The change feed, chosen by `updatedSince`: everything published,
 *   corrected or retracted at or after that moment, oldest change first,
 *   retractions included as `status: "retracted"`. `nextCursor` is always
 *   set, so a reader keeps it and resumes from exactly there on its next poll.
 *
 * A cursor carries its order, so a request with one reads in that order and
 * `updatedSince` is ignored: a poller holding a change-feed cursor need not
 * resend the moment it started from.
 *
 * `publishedAfter` (inclusive) and `publishedBefore` (exclusive) bound
 * `publishedAt` in both orders. In the published list they narrow the index
 * read; in the change feed, whose order is `updatedAt`, they filter rows
 * after they are read. `season` is the race's season for a race story and the
 * UTC year of `publishedAt` for a race-independent one.
 *
 * A page can hold fewer than `limit` items while `hasMore` is true: `driver`,
 * `team`, `topic`, `season` (on race stories) and the change feed's date
 * bounds filter rows after they are read, and one request reads a bounded
 * number of them.
 *
 * `now` comes from the caller because a query must not read the clock. The
 * caller is `newsApiServe.list`, which reads it from the server: a public
 * query taking `now` let a key holder pass a later moment and read past
 * their plan's delay.
 */
export const list = internalQuery({
  args: { apiKey: v.string(), ...pageArgs },
  returns: listResultValidator,
  handler: async (ctx, { apiKey, ...args }) => {
    const key = await keyFor(ctx, apiKey);
    if (!key) {
      return { ok: false as const, error: 'unauthorized' as const };
    }
    if (!mayRead(key, args.lang)) {
      return { ok: false as const, error: 'plan_required' as const };
    }
    return await readNewsPage(ctx, args, NEWS_API_PLANS[planOf(key)].delayMs);
  },
});

/**
 * The body of `list`, for any reader the key check has already let in.
 * `newsApiWebhooks.ts` reads each endpoint's next batch of the change feed
 * through it, so a webhook and a poller holding the same cursor get the same
 * records in the same order.
 */
export async function readNewsPage(
  ctx: QueryCtx,
  args: PageArgs,
  delayMs: number,
): Promise<Infer<typeof listResultValidator>> {
  let mode: Mode;
  let position: Position | null;
  if (args.cursor !== undefined) {
    const decoded = decodeCursor(args.cursor);
    if (!decoded) {
      return { ok: false as const, error: 'invalid_cursor' as const };
    }
    // A cursor belongs to the order that issued it, and selects it.
    mode = decoded.mode;
    position = decoded.position;
  } else if (args.updatedSince !== undefined) {
    mode = 'changes';
    position = { t: args.updatedSince, seen: [] };
  } else {
    mode = 'published';
    position = null;
  }
  const limit = Math.min(
    Math.max(Math.trunc(args.limit ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const settledBefore = args.now - Math.max(SETTLE_MS, delayMs);
  const direction = mode === 'published' ? -1 : 1;

  // The `publishedAt` window this request may see: its own bounds, and for
  // a key that reads late, nothing younger than its delay.
  const published: Range = {
    lo: args.publishedAfter ?? 0,
    hi: Math.min(
      args.publishedBefore === undefined ? NO_LIMIT : args.publishedBefore - 1,
      delayMs > 0 ? args.now - delayMs : NO_LIMIT,
    ),
  };

  let seasonRaces: Set<Id<'races'>> | null = null;
  if (args.season !== undefined) {
    const season = args.season;
    const rows = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .take(100);
    seasonRaces = new Set(rows.map((race) => race._id));
  }

  let candidates: Candidate[];
  let partial = false;
  if (args.race !== undefined) {
    const slug = args.race;
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (!race) {
      return { ok: false as const, error: 'unknown_race' as const };
    }
    // One weekend is small enough to read whole, which keeps a filtered
    // request from paging through every other weekend to find it.
    const rows = await ctx.db
      .query('raceNews')
      .withIndex('by_race', (q) => q.eq('raceId', race._id))
      .take(MAX_NEWS_PER_RACE);
    candidates = rows
      .map((doc) => ({ table: 'raceNews' as const, doc }))
      .filter(
        (candidate) =>
          (position === null ||
            (stamp(mode, candidate) - position.t) * direction >= 0) &&
          (mode === 'published' || candidate.doc.updatedAt <= settledBefore),
      );
  } else if (mode === 'published') {
    const upTo: Range = { lo: 0, hi: position?.t ?? NO_LIMIT };
    const raceRange = intersect(published, upTo);
    ({ rows: candidates, partial } = await scan(ctx, mode, {
      raceNews: raceRange,
      globalNews:
        args.season === undefined
          ? raceRange
          : intersect(raceRange, yearRange(args.season)),
    }));
  } else {
    const changes: Range = { lo: position?.t ?? 0, hi: settledBefore };
    ({ rows: candidates, partial } = await scan(ctx, mode, {
      raceNews: changes,
      globalNews: changes,
    }));
  }

  const alreadySeen = new Set(position?.seen ?? []);
  const ordered = inOrder(mode, candidates).filter(
    (candidate) =>
      !(
        position !== null &&
        stamp(mode, candidate) === position.t &&
        alreadySeen.has(candidate.doc._id)
      ),
  );

  const roster = await rosterFor(ctx, ordered);
  const driver = args.driver?.toUpperCase();
  const team = args.team?.toLowerCase();
  function inSeason(candidate: Candidate): boolean {
    if (args.season === undefined) {
      return true;
    }
    return candidate.table === 'raceNews'
      ? (seasonRaces?.has(candidate.doc.raceId) ?? false)
      : new Date(candidate.doc.publishedAt).getUTCFullYear() === args.season;
  }
  function matches(candidate: Candidate): boolean {
    const { publishedAt } = candidate.doc;
    // The live list carries live stories only; the change feed is where a
    // retraction is reported.
    return (
      (mode === 'changes' || candidate.doc.active) &&
      publishedAt >= published.lo &&
      publishedAt <= published.hi &&
      inSeason(candidate) &&
      (args.topic === undefined || candidate.doc.topic === args.topic) &&
      (driver === undefined ||
        (candidate.table === 'raceNews' &&
          (candidate.doc.driverCodes ?? []).includes(driver))) &&
      (team === undefined || teamOf(candidate, roster)?.toLowerCase() === team)
    );
  }

  const races = new Map<Id<'races'>, Doc<'races'> | null>();
  const data: NewsItem[] = [];
  let walked = 0;
  for (const candidate of ordered) {
    if (data.length === limit) {
      break;
    }
    walked += 1;
    const at = stamp(mode, candidate);
    position =
      position !== null && position.t === at
        ? { t: at, seen: [...position.seen, candidate.doc._id] }
        : { t: at, seen: [candidate.doc._id] };
    if (matches(candidate)) {
      data.push(
        await present(ctx, candidate, roster, races, args.now, args.lang),
      );
    }
  }

  const hasMore = walked < ordered.length || partial;
  return {
    ok: true as const,
    data,
    nextCursor:
      position !== null && (hasMore || mode === 'changes')
        ? encodeCursor(mode, position)
        : null,
    hasMore,
  };
}

const getResultValidator = v.union(
  v.object({ ok: v.literal(true), data: newsItemValidator }),
  v.object({
    ok: v.literal(false),
    error: v.union(
      v.literal('unauthorized'),
      v.literal('plan_required'),
      v.literal('not_found'),
    ),
  }),
);
export type NewsGetResult = Infer<typeof getResultValidator>;

/**
 * One story by id. A retracted one answers with `status: "retracted"`. A
 * story a key may not see yet (its plan reads late) is not found. `lang` as
 * in `list`.
 */
export const get = internalQuery({
  args: {
    apiKey: v.string(),
    id: v.string(),
    now: v.number(),
    lang: v.optional(newsLanguageValidator),
  },
  returns: getResultValidator,
  handler: async (ctx, args) => {
    const key = await keyFor(ctx, args.apiKey);
    if (!key) {
      return { ok: false as const, error: 'unauthorized' as const };
    }
    if (!mayRead(key, args.lang)) {
      return { ok: false as const, error: 'plan_required' as const };
    }
    const raceNewsId = ctx.db.normalizeId('raceNews', args.id);
    const globalNewsId = ctx.db.normalizeId('globalNews', args.id);
    let candidate: Candidate | null = null;
    if (raceNewsId) {
      const doc = await ctx.db.get(raceNewsId);
      candidate = doc ? { table: 'raceNews', doc } : null;
    } else if (globalNewsId) {
      const doc = await ctx.db.get(globalNewsId);
      candidate = doc ? { table: 'globalNews', doc } : null;
    }
    const { delayMs } = NEWS_API_PLANS[planOf(key)];
    if (!candidate || candidate.doc.publishedAt > args.now - delayMs) {
      return { ok: false as const, error: 'not_found' as const };
    }
    return {
      ok: true as const,
      data: await present(
        ctx,
        candidate,
        await rosterFor(ctx, [candidate]),
        new Map(),
        args.now,
        args.lang,
      ),
    };
  },
});

/**
 * A fixed page of real stories in the live shape, for `/api/v1/news/sample`,
 * which needs no key. Served from here so the `returns` validator, the same
 * one `list` answers with, checks it on every call: the sample cannot drift
 * from what a key would get.
 */
export const sample = query({
  args: {},
  returns: newsPageValidator,
  handler: async () => NEWS_API_SAMPLE,
});

// ============ Reference lists ============

const racesResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    data: v.array(
      v.object({
        slug: v.string(),
        name: v.string(),
        season: v.number(),
        round: v.number(),
        startsAt: v.string(),
      }),
    ),
  }),
  v.object({ ok: v.literal(false), error: v.literal('unauthorized') }),
);
export type NewsRacesResult = Infer<typeof racesResultValidator>;

/**
 * The races the `race` filter accepts, in calendar order, optionally for one
 * season.
 */
export const races = internalQuery({
  args: { apiKey: v.string(), season: v.optional(v.number()) },
  returns: racesResultValidator,
  handler: async (ctx, args) => {
    if (!(await authorized(ctx, args.apiKey))) {
      return { ok: false as const, error: 'unauthorized' as const };
    }
    const season = args.season;
    const rows = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) =>
        season === undefined ? q : q.eq('season', season),
      )
      .take(300);
    return {
      ok: true as const,
      // Rounds start at 1. The dev deployment's scenario races sit below it.
      data: rows
        .filter((race) => race.round >= 1)
        .map((race) => ({
          slug: race.slug,
          name: race.name,
          season: race.season,
          round: race.round,
          startsAt: iso(race.raceStartAt),
        })),
    };
  },
});

const driversResultValidator = v.union(
  v.object({
    ok: v.literal(true),
    data: v.array(
      v.object({
        code: v.string(),
        number: v.union(v.number(), v.null()),
        name: v.string(),
        team: v.union(v.string(), v.null()),
      }),
    ),
  }),
  v.object({ ok: v.literal(false), error: v.literal('unauthorized') }),
);
export type NewsDriversResult = Infer<typeof driversResultValidator>;

/**
 * The drivers the `driver` filter accepts, by code. `team` is the driver's
 * current team, the same one every story's `drivers[].team` shows.
 */
export const drivers = internalQuery({
  args: { apiKey: v.string() },
  returns: driversResultValidator,
  handler: async (ctx, args) => {
    if (!(await authorized(ctx, args.apiKey))) {
      return { ok: false as const, error: 'unauthorized' as const };
    }
    const rows = await ctx.db.query('drivers').take(200);
    return {
      ok: true as const,
      data: rows
        .map((driver) => ({
          code: driver.code,
          number: driver.number ?? null,
          name: driver.displayName,
          team: driver.team ?? null,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
  },
});

// ============ Topics ============

const backfillOutcome = v.union(
  v.literal('set'),
  v.literal('would_set'),
  v.literal('unchanged'),
  v.literal('not_found'),
  v.literal('unknown_topic'),
);

/**
 * Give existing stories a topic, by id, without moving `updatedAt`. A dry
 * run unless `dryRun` is false.
 *
 * `updatedAt` stays put, so neither the change feed nor a webhook reports
 * it: one backfill would otherwise read as a correction of every story. To
 * tell readers about a new topic, republish the story with it instead, which
 * moves `updatedAt`.
 *
 * Run via:
 *   npx convex run --prod newsApi:backfillTopics '{"items":[{"id":"...","topic":"penalty"}]}'
 *   npx convex run --prod newsApi:backfillTopics '{"items":[...],"dryRun":false}'
 */
export const backfillTopics = internalMutation({
  args: {
    items: v.array(v.object({ id: v.string(), topic: v.string() })),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    results: v.array(
      v.object({
        id: v.string(),
        key: v.union(v.string(), v.null()),
        from: v.union(v.string(), v.null()),
        to: v.string(),
        outcome: backfillOutcome,
      }),
    ),
  }),
  handler: async (ctx, args) => {
    if (args.items.length > 200) {
      throw new ConvexError('Send at most 200 items at a time.');
    }
    const dryRun = args.dryRun ?? true;
    const results = [];
    for (const item of args.items) {
      const result = await backfillOne(ctx, item, dryRun);
      results.push({ id: item.id, to: item.topic, ...result });
    }
    return { dryRun, results };
  },
});

async function backfillOne(
  ctx: MutationCtx,
  item: { id: string; topic: string },
  dryRun: boolean,
): Promise<{
  key: string | null;
  from: string | null;
  outcome: Infer<typeof backfillOutcome>;
}> {
  const raceNewsId = ctx.db.normalizeId('raceNews', item.id);
  const globalNewsId = ctx.db.normalizeId('globalNews', item.id);
  const doc = raceNewsId
    ? await ctx.db.get(raceNewsId)
    : globalNewsId
      ? await ctx.db.get(globalNewsId)
      : null;
  if (!doc) {
    return { key: null, from: null, outcome: 'not_found' };
  }
  const from = doc.topic ?? null;
  const topic = item.topic;
  if (!isNewsTopic(topic)) {
    return { key: doc.key, from, outcome: 'unknown_topic' };
  }
  if (from === topic) {
    return { key: doc.key, from, outcome: 'unchanged' };
  }
  if (!dryRun) {
    await ctx.db.patch(doc._id, { topic });
  }
  return { key: doc.key, from, outcome: dryRun ? 'would_set' : 'set' };
}

// ============ Metering ============

const LIMITER_NAMES = {
  free: 'newsApiFree',
  hobby: 'newsApiHobby',
  commercial: 'newsApiCommercial',
} as const satisfies Record<Plan, string>;

function perMinute(requests: number) {
  return {
    kind: 'token bucket' as const,
    rate: requests,
    period: MINUTE,
    capacity: requests,
  };
}

const limiter = new RateLimiter(components.rateLimiter, {
  newsApiFree: perMinute(NEWS_API_PLANS.free.requestsPerMinute),
  newsApiHobby: perMinute(NEWS_API_PLANS.hobby.requestsPerMinute),
  newsApiCommercial: perMinute(NEWS_API_PLANS.commercial.requestsPerMinute),
  // The form takes no account, and Convex never sees the visitor's address,
  // so the limit is per email address with a site-wide ceiling well above
  // honest use. One ceiling alone let a single script lock everyone out.
  newsApiWaitlistEmail: { kind: 'fixed window', rate: 5, period: HOUR },
  newsApiWaitlist: { kind: 'fixed window', rate: 600, period: HOUR },
});

const quotaValidator = v.object({
  limit: v.number(),
  remaining: v.number(),
  resetSeconds: v.number(),
});

/**
 * Where a key stands against its plan's limit, for the `ratelimit-*`
 * headers: its limit a minute, the requests it has left, and the seconds
 * until it has all of them back. The bucket refills continuously, so a
 * request frees up well before `resetSeconds`; `retry-after` says when.
 */
async function quotaFor(
  ctx: MutationCtx,
  plan: Plan,
  keyId: Id<'newsApiKeys'>,
): Promise<Infer<typeof quotaValidator>> {
  const limit = NEWS_API_PLANS[plan].requestsPerMinute;
  const state = await limiter.getValue(ctx, LIMITER_NAMES[plan], {
    key: keyId,
  });
  const { value } = calculateRateLimit(state, state.config, Date.now());
  return {
    limit,
    remaining: Math.max(0, Math.floor(value)),
    resetSeconds: Math.ceil(
      (Math.max(0, limit - value) * (MINUTE / limit)) / 1000,
    ),
  };
}

const recordRequestResultValidator = v.union(
  v.object({ ok: v.literal(true), quota: quotaValidator }),
  v.object({ ok: v.literal(false), error: v.literal('unauthorized') }),
  v.object({
    ok: v.literal(false),
    error: v.literal('rate_limited'),
    retryAfterSeconds: v.number(),
    quota: quotaValidator,
  }),
);
export type NewsMeterResult = Infer<typeof recordRequestResultValidator>;

/**
 * Count one request against a key and say whether it may proceed, with the
 * key's quota either way.
 *
 * A mutation, because a query cannot write. Internal, like the reads: the
 * actions in `newsApiServe.ts` run it beside the read, so no request is
 * served without being counted. A refused request is not counted, so
 * `requests` is what the key was served.
 */
export const recordRequest = internalMutation({
  args: { apiKey: v.string() },
  returns: recordRequestResultValidator,
  handler: async (ctx, args) => {
    const key = await keyFor(ctx, args.apiKey);
    if (!key) {
      return { ok: false as const, error: 'unauthorized' as const };
    }
    const plan = planOf(key);
    const result = await limiter.limit(ctx, LIMITER_NAMES[plan], {
      key: key._id,
    });
    const quota = await quotaFor(ctx, plan, key._id);
    if (!result.ok) {
      return {
        ok: false as const,
        error: 'rate_limited' as const,
        retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfter / 1000)),
        quota,
      };
    }
    const day = new Date().toISOString().slice(0, 10);
    const usage = await ctx.db
      .query('newsApiUsage')
      .withIndex('by_key_day', (q) => q.eq('keyId', key._id).eq('day', day))
      .unique();
    if (usage) {
      await ctx.db.patch(usage._id, { requests: usage.requests + 1 });
    } else {
      await ctx.db.insert('newsApiUsage', {
        keyId: key._id,
        day,
        requests: 1,
      });
    }
    return { ok: true as const, quota };
  },
});

/**
 * Requests served per key per UTC day, newest day first.
 *
 * Run via:
 *   npx convex run --prod newsApi:usage '{}'
 */
export const usage = internalQuery({
  args: { days: v.optional(v.number()) },
  returns: v.array(
    v.object({ day: v.string(), label: v.string(), requests: v.number() }),
  ),
  handler: async (ctx, args) => {
    const days = Math.min(Math.max(Math.trunc(args.days ?? 7), 1), 90);
    const keys = await ctx.db.query('newsApiKeys').take(200);
    const rows = [];
    for (const key of keys) {
      const perDay = await ctx.db
        .query('newsApiUsage')
        .withIndex('by_key_day', (q) => q.eq('keyId', key._id))
        .order('desc')
        .take(days);
      rows.push(
        ...perDay.map((row) => ({
          day: row.day,
          label: key.label,
          requests: row.requests,
        })),
      );
    }
    return rows.sort(
      (a, b) => b.day.localeCompare(a.day) || a.label.localeCompare(b.label),
    );
  },
});

// ============ Waiting list ============

const waitlistUseValidator = v.union(
  v.literal('personal'),
  v.literal('commercial'),
);

/**
 * Join the waiting list for the news API. Joining twice is not an error and
 * says nothing about whether the address was already there.
 *
 * `use` is whether they would build something personal or commercial, which
 * is the line between the free and hobby plans and the commercial one.
 */
export const joinWaitlist = mutation({
  args: {
    email: v.string(),
    useCase: v.optional(v.string()),
    use: v.optional(waitlistUseValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const useCase = args.useCase?.trim() || undefined;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError('Enter a valid email address.');
    }
    if (useCase !== undefined && useCase.length > 1000) {
      throw new ConvexError("Keep what you'd build to 1,000 characters.");
    }
    const perEmail = await limiter.limit(ctx, 'newsApiWaitlistEmail', {
      key: email,
    });
    const overall = perEmail.ok
      ? await limiter.limit(ctx, 'newsApiWaitlist')
      : perEmail;
    if (!overall.ok) {
      throw new ConvexError('Too many requests. Wait, then try again.');
    }
    const existing = await ctx.db
      .query('newsApiWaitlist')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first();
    if (existing) {
      // The form takes no account, so anyone can send any address. A repeat
      // may fill an answer the first left blank, but never replace one:
      // otherwise a stranger could rewrite what someone else said they would
      // build.
      const fill = {
        ...(existing.useCase === undefined && useCase !== undefined
          ? { useCase }
          : {}),
        ...(existing.use === undefined && args.use !== undefined
          ? { use: args.use }
          : {}),
      };
      if (Object.keys(fill).length > 0) {
        await ctx.db.patch(existing._id, fill);
      }
      return null;
    }
    await ctx.db.insert('newsApiWaitlist', {
      email,
      useCase,
      use: args.use,
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Who is waiting, newest first.
 *
 * Run via:
 *   npx convex run --prod newsApi:listWaitlist '{}'
 */
export const listWaitlist = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      email: v.string(),
      use: v.union(waitlistUseValidator, v.null()),
      useCase: v.union(v.string(), v.null()),
      joinedAt: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query('newsApiWaitlist').order('desc').take(500);
    return rows.map((row) => ({
      email: row.email,
      use: row.use ?? null,
      useCase: row.useCase ?? null,
      joinedAt: iso(row.createdAt),
    }));
  },
});
