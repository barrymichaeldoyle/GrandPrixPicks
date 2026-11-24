import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import { fetchWithTimeout } from './lib/fetchWithTimeout';
import { SETTLE_MS } from './lib/newsApiChanges';
import {
  decodeCursor,
  encodeCursor,
  planOf,
  randomToken,
  readNewsPage,
  type NewsItem,
} from './newsApi';

/**
 * Webhooks for the news API: each endpoint is sent its key's change feed as
 * signed POSTs, so a consumer does not have to poll. Contract, signing recipe
 * and operator commands: `docs/news-api.md`.
 *
 * Delivery reads the change feed (`readNewsPage` in `newsApi.ts`), not the
 * publish mutations. The feed already owns the order, the same-millisecond
 * ties and the settle delay; a second event source would be a second copy of
 * those rules. Each endpoint keeps its own feed cursor and it moves only when
 * a batch is accepted, so a failure resends the same records and nothing is
 * skipped.
 *
 * What starts a delivery:
 *
 * - a story changing: `scheduleWebhookDrain` (`lib/newsApiChanges.ts`) books
 *   `drain` for just after the change settles;
 * - a delivery that leaves more behind it books the next one;
 * - a failure books its own retry, with backoff;
 * - the `crons.ts` sweep runs `drain` every 15 minutes, so a lost schedule or
 *   a crashed delivery is late, never permanent. With nothing pending it
 *   reads two index entries per endpoint and sends nothing.
 */

/** Records a single POST carries. Each is one story at one version. */
const BATCH_SIZE = 20;

/** How long an endpoint has to answer. */
const TIMEOUT_MS = 10_000;

/** How long a claimed delivery holds the endpoint. Well past `TIMEOUT_MS`. */
const LEASE_MS = 60_000;

/** A delivery that finds another in flight looks again this much later. */
const BUSY_RETRY_MS = 15_000;

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Wait before each retry: after the first failure, the second, and so on.
 * The eighth failure in a row (`FAILURE_LIMIT`) disables the endpoint, about
 * 45 hours after the first.
 */
const BACKOFF_MS = [
  1 * MINUTE,
  5 * MINUTE,
  30 * MINUTE,
  2 * HOUR,
  6 * HOUR,
  12 * HOUR,
  24 * HOUR,
];
const FAILURE_LIMIT = BACKOFF_MS.length + 1;

const MAX_ENDPOINTS_PER_KEY = 3;

/** Endpoints one drain looks at. Far above what exists. */
const MAX_ENDPOINTS = 100;

/** How long a rotated-out secret still signs, unless the rotation says. */
const DEFAULT_OVERLAP_HOURS = 24;

const SIGNATURE_HEADER = 'gpp-signature';

// ============ URL safety ============

/**
 * Host suffixes that name a private network rather than the internet. A
 * public endpoint with a real certificate is never on one of these.
 */
const PRIVATE_SUFFIXES = [
  'localhost',
  'local',
  'localdomain',
  'internal',
  'intranet',
  'lan',
  'home.arpa',
  'test',
  'example',
  'invalid',
];

/**
 * Why a URL cannot be a webhook endpoint, or null when it can.
 *
 * The URL is chosen by a customer, and we are the ones who fetch it, so it
 * is held to: https, a hostname rather than an IP address, the default port,
 * no credentials, and no private-network name. Refusing every IP literal,
 * rather than a list of private ranges, leaves nothing to get wrong about
 * octal, hex, decimal or IPv4-mapped IPv6 forms (the URL parser turns
 * `https://2130706433/` into `127.0.0.1` before this sees it).
 *
 * This checks the name, not where it resolves. A public name pointing at a
 * private address passes: the default runtime offers no DNS lookup, and one
 * done first would not bind the fetch that follows. `docs/news-api.md` says
 * so.
 */
export function webhookUrlProblem(raw: string): string | null {
  if (raw.length > 2048) {
    return 'The URL is longer than 2,048 characters.';
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'That is not a URL.';
  }
  if (url.protocol !== 'https:') {
    return 'The URL must start with https://.';
  }
  if (url.username !== '' || url.password !== '') {
    return 'The URL cannot carry a username or password.';
  }
  if (url.port !== '') {
    return 'The URL must use the standard https port.';
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (host.startsWith('[') || /^[0-9.]+$/.test(host)) {
    return 'Use a hostname, not an IP address.';
  }
  if (
    !host.includes('.') ||
    PRIVATE_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    )
  ) {
    return 'The hostname must be a public one.';
  }
  return null;
}

// ============ Eligibility ============

/**
 * Why a key's endpoints may not receive, or null when they may. Checked when
 * an endpoint is made or switched on and again before every delivery, so a
 * revoked key, or one moved off `commercial`, stops receiving at once.
 */
async function keyProblem(
  ctx: QueryCtx,
  keyId: Id<'newsApiKeys'>,
): Promise<string | null> {
  const key = await ctx.db.get(keyId);
  if (!key) {
    return 'No key with that id.';
  }
  if (key.revokedAt !== undefined) {
    return 'That key is revoked.';
  }
  const plan = planOf(key);
  if (plan !== 'commercial') {
    return `Webhooks come with the commercial plan. This key is on ${plan}.`;
  }
  return null;
}

function newSecret(): string {
  return `whsec_${randomToken(40)}`;
}

/** Every secret a delivery is signed with: the current one, then any still overlapping. */
function signingSecrets(row: Doc<'newsApiWebhooks'>, now: number): string[] {
  return row.previousSecret !== undefined &&
    (row.previousSecretExpiresAt ?? 0) > now
    ? [row.secret, row.previousSecret]
    : [row.secret];
}

/**
 * Whether the change feed holds anything past `cursor` that has settled.
 * Reads at most one row past the ids the cursor has already seen at its own
 * millisecond, from each table.
 */
async function hasPending(
  ctx: QueryCtx,
  cursor: string,
  now: number,
): Promise<boolean> {
  const decoded = decodeCursor(cursor);
  if (!decoded) {
    return false;
  }
  const { t, seen } = decoded.position;
  const settled = now - SETTLE_MS;
  const seenIds = new Set(seen);
  for (const table of ['raceNews', 'globalNews'] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex('by_updated', (q) =>
        q.gte('updatedAt', t).lte('updatedAt', settled),
      )
      .take(seen.length + 1);
    if (rows.some((row) => row.updatedAt > t || !seenIds.has(row._id))) {
      return true;
    }
  }
  return false;
}

// ============ Events ============

type EventType = 'news.published' | 'news.updated' | 'news.retracted';

/**
 * One change-feed record as an event.
 *
 * The id names the story at one version (`updatedAt`), so a retry of the
 * same batch carries the same ids. The type reads the record, not what this
 * endpoint was sent before: `news.published` is a story's first version
 * (`updatedAt` is still `publishedAt`), `news.updated` any later one,
 * including a republish after a retraction, and `news.retracted` the
 * tombstone. Storing what each endpoint has seen, to do better, would be a
 * table that grows with every story times every endpoint.
 */
function eventFor(item: NewsItem) {
  const type: EventType =
    item.status === 'retracted'
      ? 'news.retracted'
      : item.publishedAt === item.updatedAt
        ? 'news.published'
        : 'news.updated';
  return {
    id: `evt_${item.id}_${Date.parse(item.updatedAt)}`,
    type,
    createdAt: item.updatedAt,
    data: item,
  };
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

const outcomeValidator = v.object({
  ok: v.boolean(),
  status: v.optional(v.number()),
  error: v.optional(v.string()),
});

type Outcome = { ok: boolean; status?: number; error?: string };

/**
 * POST one signed body. 2xx is success; anything else, a redirect included,
 * is a failure. The response body is never read, only its status, so a
 * large or slow body costs nothing.
 *
 * The header is `gpp-signature: t=<unix seconds>,v1=<hex>`, one `v1` per
 * signing secret, each an HMAC-SHA256 of `<t>.<raw body>`.
 */
async function post(
  url: string,
  body: string,
  secrets: string[],
): Promise<Outcome> {
  // Checked again here, so a row written before a rule was added is held to it.
  const problem = webhookUrlProblem(url);
  if (problem) {
    return { ok: false, error: problem };
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const signatures = await Promise.all(
    secrets.map((secret) => hmacHex(secret, `${timestamp}.${body}`)),
  );
  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'GrandPrixPicks-Webhooks/1',
          [SIGNATURE_HEADER]: [
            `t=${timestamp}`,
            ...signatures.map((signature) => `v1=${signature}`),
          ].join(','),
        },
        body,
      },
      TIMEOUT_MS,
    );
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === 'AbortError';
    return {
      ok: false,
      error: aborted
        ? `No response in ${TIMEOUT_MS / 1000} seconds.`
        : cause instanceof Error
          ? cause.message.slice(0, 200)
          : 'The request failed.',
    };
  }
  try {
    await response.body?.cancel();
  } catch {
    // Already closed.
  }
  const { status } = response;
  if (status >= 200 && status < 300 && !response.redirected) {
    return { ok: true, status };
  }
  return {
    ok: false,
    status,
    error:
      status === 0 || (status >= 300 && status < 400) || response.redirected
        ? 'The endpoint redirected. Redirects are not followed.'
        : `The endpoint answered ${status}.`,
  };
}

// ============ Delivery ============

/**
 * Book a delivery for every active endpoint with settled changes waiting.
 * Run by `scheduleWebhookDrain` after a story changes and by the cron.
 *
 * An endpoint with a retry booked, or a delivery in flight, is left alone:
 * the retry, or the delivery's own follow-up, covers it.
 */
export const drain = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const now = Date.now();
    const endpoints = await ctx.db
      .query('newsApiWebhooks')
      .withIndex('by_active', (q) => q.eq('active', true))
      .take(MAX_ENDPOINTS);
    let booked = 0;
    for (const endpoint of endpoints) {
      if (
        (endpoint.nextAttemptAt ?? 0) > now ||
        (endpoint.leaseUntil ?? 0) > now ||
        (await keyProblem(ctx, endpoint.keyId)) !== null ||
        !(await hasPending(ctx, endpoint.cursor, now))
      ) {
        continue;
      }
      await ctx.scheduler.runAfter(0, internal.newsApiWebhooks.deliver, {
        endpointId: endpoint._id,
      });
      booked += 1;
    }
    return booked;
  },
});

/**
 * Take the endpoint for one delivery and read its next batch. Null when
 * there is nothing to send, it is not due, or it may not receive.
 */
export const claim = internalMutation({
  args: { endpointId: v.id('newsApiWebhooks') },
  returns: v.union(
    v.null(),
    v.object({
      leaseId: v.string(),
      url: v.string(),
      secrets: v.array(v.string()),
      body: v.string(),
      nextCursor: v.string(),
      hasMore: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const endpoint = await ctx.db.get(args.endpointId);
    const now = Date.now();
    if (
      !endpoint ||
      !endpoint.active ||
      (endpoint.nextAttemptAt ?? 0) > now ||
      (await keyProblem(ctx, endpoint.keyId)) !== null
    ) {
      return null;
    }
    if ((endpoint.leaseUntil ?? 0) > now) {
      // Another delivery is in flight. Look again once it should be done, in
      // case a change settled after it read its batch.
      await ctx.scheduler.runAfter(
        BUSY_RETRY_MS,
        internal.newsApiWebhooks.deliver,
        { endpointId: endpoint._id },
      );
      return null;
    }
    // Only commercial keys have endpoints, and commercial reads without delay.
    const page = await readNewsPage(
      ctx,
      { now, cursor: endpoint.cursor, limit: BATCH_SIZE },
      0,
    );
    if (!page.ok) {
      throw new Error(`Webhook ${endpoint._id} cursor: ${page.error}`);
    }
    if (page.data.length === 0) {
      return null;
    }
    const leaseId = randomToken(16);
    await ctx.db.patch(endpoint._id, {
      leaseId,
      leaseUntil: now + LEASE_MS,
    });
    return {
      leaseId,
      url: endpoint.url,
      secrets: signingSecrets(endpoint, now),
      body: JSON.stringify({ events: page.data.map(eventFor) }),
      nextCursor: page.nextCursor ?? endpoint.cursor,
      hasMore: page.hasMore,
    };
  },
});

/**
 * Record how a delivery went. Success moves the cursor and books the next
 * batch if there is one; failure leaves the cursor, books a retry, and at
 * `FAILURE_LIMIT` in a row disables the endpoint.
 *
 * A delivery whose lease is no longer the endpoint's (it ran past
 * `LEASE_MS`, or the endpoint was deleted) records nothing.
 */
export const settle = internalMutation({
  args: {
    endpointId: v.id('newsApiWebhooks'),
    leaseId: v.string(),
    nextCursor: v.string(),
    hasMore: v.boolean(),
    outcome: outcomeValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const endpoint = await ctx.db.get(args.endpointId);
    if (!endpoint || endpoint.leaseId !== args.leaseId) {
      return null;
    }
    const now = Date.now();
    const attempt = {
      leaseId: undefined,
      leaseUntil: undefined,
      lastAttemptAt: now,
      lastStatus: args.outcome.status,
    };
    if (args.outcome.ok) {
      await ctx.db.patch(endpoint._id, {
        ...attempt,
        cursor: args.nextCursor,
        consecutiveFailures: 0,
        nextAttemptAt: undefined,
        lastError: undefined,
        lastSuccessAt: now,
      });
      if (
        endpoint.active &&
        (args.hasMore || (await hasPending(ctx, args.nextCursor, now)))
      ) {
        await ctx.scheduler.runAfter(0, internal.newsApiWebhooks.deliver, {
          endpointId: endpoint._id,
        });
      }
      return null;
    }

    const failures = endpoint.consecutiveFailures + 1;
    const lastError = args.outcome.error ?? 'The delivery failed.';
    if (failures >= FAILURE_LIMIT) {
      await ctx.db.patch(endpoint._id, {
        ...attempt,
        lastError,
        consecutiveFailures: failures,
        nextAttemptAt: undefined,
        active: false,
        disabledReason: 'failures',
        disabledAt: now,
      });
      return null;
    }
    const nextAttemptAt = now + BACKOFF_MS[failures - 1]!;
    await ctx.db.patch(endpoint._id, {
      ...attempt,
      lastError,
      consecutiveFailures: failures,
      nextAttemptAt,
    });
    if (endpoint.active) {
      await ctx.scheduler.runAt(
        nextAttemptAt,
        internal.newsApiWebhooks.deliver,
        { endpointId: endpoint._id },
      );
    }
    return null;
  },
});

/** Send an endpoint its next batch: claim, POST, settle. */
export const deliver = internalAction({
  args: { endpointId: v.id('newsApiWebhooks') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.runMutation(internal.newsApiWebhooks.claim, args);
    if (!batch) {
      return null;
    }
    const outcome = await post(batch.url, batch.body, batch.secrets);
    await ctx.runMutation(internal.newsApiWebhooks.settle, {
      endpointId: args.endpointId,
      leaseId: batch.leaseId,
      nextCursor: batch.nextCursor,
      hasMore: batch.hasMore,
      outcome,
    });
    return null;
  },
});

// ============ Operator ============

/**
 * Give a commercial key an endpoint. It is sent changes from now on, not the
 * feed's history. The secret is in the return value; `listWebhooks` never
 * shows it again.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:createWebhook '{"keyId":"...","url":"https://example.com/hooks/f1"}'
 */
export const createWebhook = internalMutation({
  args: { keyId: v.id('newsApiKeys'), url: v.string() },
  returns: v.object({
    id: v.id('newsApiWebhooks'),
    url: v.string(),
    secret: v.string(),
    startsFrom: v.string(),
  }),
  handler: async (ctx, args) => {
    const url = args.url.trim();
    const problem =
      (await keyProblem(ctx, args.keyId)) ?? webhookUrlProblem(url);
    if (problem) {
      throw new ConvexError(problem);
    }
    const existing = await ctx.db
      .query('newsApiWebhooks')
      .withIndex('by_key', (q) => q.eq('keyId', args.keyId))
      .take(MAX_ENDPOINTS_PER_KEY + 1);
    if (existing.some((row) => row.url === url)) {
      throw new ConvexError('This key already has an endpoint at that URL.');
    }
    if (existing.length >= MAX_ENDPOINTS_PER_KEY) {
      throw new ConvexError(
        `A key can have ${MAX_ENDPOINTS_PER_KEY} endpoints. Delete one first.`,
      );
    }
    const now = Date.now();
    const secret = newSecret();
    const id = await ctx.db.insert('newsApiWebhooks', {
      keyId: args.keyId,
      url,
      secret,
      secretPrefix: secret.slice(0, 12),
      active: true,
      cursor: encodeCursor('changes', { t: now, seen: [] }),
      consecutiveFailures: 0,
      createdAt: now,
    });
    return { id, url, secret, startsFrom: new Date(now).toISOString() };
  },
});

function isoOrNull(at: number | undefined): string | null {
  return at === undefined ? null : new Date(at).toISOString();
}

/**
 * Every endpoint, or one key's, with what its last delivery did. Never a
 * secret. `receiving` is false when the key is revoked or off the
 * commercial plan, whatever `active` says.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:listWebhooks '{}'
 */
export const listWebhooks = internalQuery({
  args: { keyId: v.optional(v.id('newsApiKeys')) },
  returns: v.array(
    v.object({
      id: v.id('newsApiWebhooks'),
      keyId: v.id('newsApiKeys'),
      keyLabel: v.union(v.string(), v.null()),
      url: v.string(),
      secretPrefix: v.string(),
      active: v.boolean(),
      receiving: v.boolean(),
      keyProblem: v.union(v.string(), v.null()),
      disabledReason: v.union(
        v.literal('operator'),
        v.literal('failures'),
        v.null(),
      ),
      deliveredUpTo: v.union(v.string(), v.null()),
      consecutiveFailures: v.number(),
      nextAttemptAt: v.union(v.string(), v.null()),
      lastAttemptAt: v.union(v.string(), v.null()),
      lastStatus: v.union(v.number(), v.null()),
      lastError: v.union(v.string(), v.null()),
      lastSuccessAt: v.union(v.string(), v.null()),
      createdAt: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const keyId = args.keyId;
    const rows =
      keyId === undefined
        ? await ctx.db.query('newsApiWebhooks').order('desc').take(200)
        : await ctx.db
            .query('newsApiWebhooks')
            .withIndex('by_key', (q) => q.eq('keyId', keyId))
            .take(MAX_ENDPOINTS_PER_KEY * 2);
    const result = [];
    for (const row of rows) {
      const problem = await keyProblem(ctx, row.keyId);
      const key = await ctx.db.get(row.keyId);
      result.push({
        id: row._id,
        keyId: row.keyId,
        keyLabel: key?.label ?? null,
        url: row.url,
        secretPrefix: row.secretPrefix,
        active: row.active,
        receiving: row.active && problem === null,
        keyProblem: problem,
        disabledReason: row.disabledReason ?? null,
        deliveredUpTo: isoOrNull(decodeCursor(row.cursor)?.position.t),
        consecutiveFailures: row.consecutiveFailures,
        nextAttemptAt: isoOrNull(row.nextAttemptAt),
        lastAttemptAt: isoOrNull(row.lastAttemptAt),
        lastStatus: row.lastStatus ?? null,
        lastError: row.lastError ?? null,
        lastSuccessAt: isoOrNull(row.lastSuccessAt),
        createdAt: new Date(row.createdAt).toISOString(),
      });
    }
    return result;
  },
});

/**
 * Switch an endpoint off or on. Switching on clears the failure count and
 * resumes from where it stopped, so the changes it missed are sent.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:setWebhookActive '{"id":"...","active":true}'
 */
export const setWebhookActive = internalMutation({
  args: { id: v.id('newsApiWebhooks'), active: v.boolean() },
  returns: v.object({ url: v.string(), active: v.boolean() }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError('No endpoint with that id.');
    }
    if (!args.active) {
      await ctx.db.patch(row._id, {
        active: false,
        disabledReason: 'operator',
        disabledAt: Date.now(),
        nextAttemptAt: undefined,
      });
      return { url: row.url, active: false };
    }
    const problem =
      (await keyProblem(ctx, row.keyId)) ?? webhookUrlProblem(row.url);
    if (problem) {
      throw new ConvexError(problem);
    }
    await ctx.db.patch(row._id, {
      active: true,
      disabledReason: undefined,
      disabledAt: undefined,
      consecutiveFailures: 0,
      nextAttemptAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.newsApiWebhooks.drain, {});
    return { url: row.url, active: true };
  },
});

/**
 * Delete an endpoint. A delivery already in flight still lands; nothing is
 * sent after it.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:deleteWebhook '{"id":"..."}'
 */
export const deleteWebhook = internalMutation({
  args: { id: v.id('newsApiWebhooks') },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError('No endpoint with that id.');
    }
    await ctx.db.delete(row._id);
    return { url: row.url };
  },
});

/**
 * Replace an endpoint's secret. The old one keeps signing beside the new one
 * for `overlapHours` (24 unless given, 0 to drop it now, at most 168), so
 * the customer can deploy the new secret without missing a delivery.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:rotateWebhookSecret '{"id":"..."}'
 */
export const rotateWebhookSecret = internalMutation({
  args: { id: v.id('newsApiWebhooks'), overlapHours: v.optional(v.number()) },
  returns: v.object({
    secret: v.string(),
    previousSecretValidUntil: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) {
      throw new ConvexError('No endpoint with that id.');
    }
    const overlapHours = Math.min(
      Math.max(args.overlapHours ?? DEFAULT_OVERLAP_HOURS, 0),
      168,
    );
    const secret = newSecret();
    const until = overlapHours > 0 ? Date.now() + overlapHours * HOUR : null;
    await ctx.db.patch(row._id, {
      secret,
      secretPrefix: secret.slice(0, 12),
      previousSecret: until === null ? undefined : row.secret,
      previousSecretExpiresAt: until ?? undefined,
    });
    return { secret, previousSecretValidUntil: isoOrNull(until ?? undefined) };
  },
});

/** Where `sendTestEvent` posts, and what it signs with. */
export const testTarget = internalQuery({
  args: { id: v.id('newsApiWebhooks'), now: v.number() },
  returns: v.union(
    v.null(),
    v.object({ url: v.string(), secrets: v.array(v.string()) }),
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    return row
      ? { url: row.url, secrets: signingSecrets(row, args.now) }
      : null;
  },
});

/**
 * Send one `webhook.test` event, signed like a real delivery, and say what
 * the endpoint answered. It works on a disabled endpoint, so a fix can be
 * checked before switching it back on, and it changes nothing: not the
 * cursor, not the failure count.
 *
 * Run via:
 *   npx convex run --prod newsApiWebhooks:sendTestEvent '{"id":"..."}'
 */
export const sendTestEvent = internalAction({
  args: { id: v.id('newsApiWebhooks') },
  returns: outcomeValidator,
  handler: async (ctx, args): Promise<Outcome> => {
    const now = Date.now();
    const target = await ctx.runQuery(internal.newsApiWebhooks.testTarget, {
      id: args.id,
      now,
    });
    if (!target) {
      throw new ConvexError('No endpoint with that id.');
    }
    const createdAt = new Date(now).toISOString();
    const body = JSON.stringify({
      events: [
        {
          id: `evt_test_${randomToken(16)}`,
          type: 'webhook.test',
          createdAt,
          data: null,
        },
      ],
    });
    return await post(target.url, body, target.secrets);
  },
});
