/**
 * Shared by the news API routes (`routes/api/v1`). Contract:
 * `docs/news-api.md`.
 *
 * Every keyed answer is `no-store`. A response is opened by a key, so the edge
 * must never hand one caller's answer to a request that carried none.
 */

import {
  NEWS_LANGUAGES,
  newsLanguageFor,
} from '@grandprixpicks/shared/newsLanguages';
import { NEWS_TOPICS, isNewsTopic } from '@grandprixpicks/shared/newsTopics';
import { teamCode } from '@grandprixpicks/shared/teamCode';
import { teams } from '@grandprixpicks/shared/tokens';
import type { NewsLanguage } from '@grandprixpicks/shared/newsLanguages';
import type { NewsTopic } from '@grandprixpicks/shared/newsTopics';
import type { ConvexHttpClient } from 'convex/browser';

import { getServerConvexClient } from './convex';
import { captureServerException, startServerSpan } from './sentry';

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, no-store',
};

const ERRORS = {
  unauthorized: [401, 'Send a valid API key as "Authorization: Bearer <key>".'],
  invalid_request: [400, 'The query string is not valid.'],
  invalid_cursor: [
    400,
    'The cursor is not valid for this request. Cursors belong to the list that issued them.',
  ],
  unknown_race: [400, 'No race has that slug. /api/v1/races lists them.'],
  unknown_team: [400, 'No team has that name. /api/v1/teams lists them.'],
  unsupported_language: [
    400,
    `Stories are not available in that language. Supported: ${NEWS_LANGUAGES.join(', ')}.`,
  ],
  plan_required: [
    403,
    'Translations need a commercial key. Leave out lang to read in English.',
  ],
  rate_limited: [429, 'Too many requests. Wait, then try again.'],
  not_found: [404, 'No story has that id.'],
  unavailable: [503, 'The news API is unavailable. Try again shortly.'],
} as const;

export type NewsApiErrorCode = keyof typeof ERRORS;

export const NEWS_API_ERRORS: Record<
  NewsApiErrorCode,
  readonly [number, string]
> = ERRORS;

/**
 * Languages a story can be asked for in: English and its translations
 * (`packages/shared/src/newsLanguages.ts`).
 */
export const NEWS_API_LANGUAGES = NEWS_LANGUAGES;

/** The teams the `team` filter accepts, as `/api/v1/teams` lists them. */
export const NEWS_API_TEAMS = Object.keys(teams).map((name) => ({
  name,
  code: teamCode(name),
}));

function newsApiJson(
  body: unknown,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...HEADERS, ...extraHeaders },
  });
}

export function newsApiError(
  code: NewsApiErrorCode,
  message?: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const [status, fallback] = ERRORS[code];
  return new Response(
    JSON.stringify({ error: { code, message: message ?? fallback } }),
    {
      status,
      headers: {
        ...HEADERS,
        ...(code === 'unauthorized' ? { 'www-authenticate': 'Bearer' } : {}),
        ...extraHeaders,
      },
    },
  );
}

/**
 * The key from `Authorization: Bearer <key>`, or null. Bounded here so an
 * oversized header never reaches the backend as an argument.
 */
export function bearerKey(request: Request): string | null {
  const match = /^Bearer\s+(\S{1,100})$/i.exec(
    request.headers.get('authorization')?.trim() ?? '',
  );
  return match ? match[1]! : null;
}

export type NewsApiFailure = { code: NewsApiErrorCode; message?: string };

function isFailure(value: object): value is NewsApiFailure {
  return 'code' in value;
}

type Quota = { limit: number; remaining: number; resetSeconds: number };

/**
 * A key's standing against its plan, on every response its request was
 * counted for. `ratelimit-reset` is the seconds until every request is back;
 * the bucket refills as it goes, so `retry-after` on a 429 is sooner.
 */
export function quotaHeaders(quota: Quota): Record<string, string> {
  return {
    'ratelimit-limit': String(quota.limit),
    'ratelimit-remaining': String(quota.remaining),
    'ratelimit-reset': String(quota.resetSeconds),
  };
}

type Meter =
  | { ok: true; quota: Quota }
  | { ok: false; error: 'unauthorized' }
  | {
      ok: false;
      error: 'rate_limited';
      retryAfterSeconds: number;
      quota: Quota;
    };

/**
 * A counted read's answer, as every `newsApiServe` action returns it: the
 * meter and the read ran side by side inside Convex. When the meter refuses,
 * the read's answer is dropped, so a request the read then answers with an
 * error (a bad cursor, an unknown race, a missing story) has been counted.
 */
function meteredResult<T>(served: {
  meter: Meter;
  result: T;
}):
  | { ok: true; result: T; headers: Record<string, string> }
  | { ok: false; response: Response } {
  const { meter, result } = served;
  if (meter.ok) {
    return { ok: true, result, headers: quotaHeaders(meter.quota) };
  }
  return {
    ok: false,
    response:
      meter.error === 'rate_limited'
        ? newsApiError('rate_limited', undefined, {
            ...quotaHeaders(meter.quota),
            'retry-after': String(meter.retryAfterSeconds),
          })
        : newsApiError('unauthorized'),
  };
}

type ReadResult = { ok: true } | { ok: false; error: NewsApiErrorCode };

/**
 * One keyed GET, start to finish: the key, the request's own checks, then the
 * counted read. `parse` refuses a malformed request before anything is read
 * or counted; `read` calls the endpoint's `newsApiServe` action, which checks
 * the key, counts the request and reads on the server's clock; `body` shapes
 * a good answer.
 */
export async function serveKeyed<Q extends object, R extends ReadResult>(
  request: Request,
  name: string,
  parse: (url: URL) => Q | NewsApiFailure,
  read: (
    convex: ConvexHttpClient,
    apiKey: string,
    query: Q,
  ) => Promise<{ meter: Meter; result: R }>,
  body: (result: Extract<R, { ok: true }>) => unknown,
): Promise<Response> {
  const apiKey = bearerKey(request);
  if (!apiKey) {
    return newsApiError('unauthorized');
  }
  const query = parse(new URL(request.url));
  if (isFailure(query)) {
    return newsApiError(query.code, query.message);
  }
  try {
    const metered = meteredResult(
      await startServerSpan({ name }, () =>
        read(getServerConvexClient(), apiKey, query),
      ),
    );
    if (!metered.ok) {
      return metered.response;
    }
    const { result, headers } = metered;
    if (!result.ok) {
      return newsApiError(result.error, undefined, headers);
    }
    return newsApiJson(body(result as Extract<R, { ok: true }>), headers);
  } catch (error) {
    captureServerException(error, { name });
    return newsApiError('unavailable');
  }
}

// ============ Query strings ============

export const NEWS_API_LIST_PARAMS = [
  'limit',
  'cursor',
  'updated_since',
  'race',
  'season',
  'published_after',
  'published_before',
  'driver',
  'team',
  'topic',
  'lang',
];

export const NEWS_API_ITEM_PARAMS = ['lang'];

export const NEWS_API_RACES_PARAMS = ['season'];

/**
 * Unknown or repeated parameters, as a sentence. Strict on purpose: a
 * misspelt filter that was silently ignored would answer with the whole list,
 * which looks like success.
 */
function paramsProblem(
  params: URLSearchParams,
  allowed: string[],
): string | null {
  const keys = [...params.keys()];
  const unknown = keys.find((key) => !allowed.includes(key));
  if (unknown !== undefined) {
    return allowed.length > 0
      ? `Unknown parameter "${unknown.slice(0, 40)}". Allowed: ${allowed.join(', ')}.`
      : `Unknown parameter "${unknown.slice(0, 40)}". This endpoint takes none.`;
  }
  if (new Set(keys).size !== keys.length) {
    return 'Each parameter may appear once.';
  }
  return null;
}

/**
 * `lang`, checked and resolved to the language that serves it: a regional
 * tag reads its base language (`es-MX` is `es`). Undefined when absent; a
 * failure for a malformed tag or a language we do not serve. Whether the key's
 * plan may read a translation is the Convex query's to say.
 */
function parseLang(
  params: URLSearchParams,
): { lang?: NewsLanguage } | NewsApiFailure {
  const tag = params.get('lang');
  if (tag === null) {
    return {};
  }
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(tag)) {
    return {
      code: 'invalid_request',
      message: '"lang" is a language tag, for example en.',
    };
  }
  const lang = newsLanguageFor(tag);
  return lang === null ? { code: 'unsupported_language' } : { lang };
}

/**
 * An ISO 8601 date-time with an explicit zone, as epoch ms, or NaN. A bare
 * date-time would be read in the server's zone, which the caller cannot know.
 */
function parseInstant(value: string): number {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
    value,
  )
    ? Date.parse(value)
    : Number.NaN;
}

function parseSeason(value: string): number | null {
  return /^\d{4}$/.test(value) && Number(value) >= 1950 && Number(value) <= 2100
    ? Number(value)
    : null;
}

export type NewsListQuery = {
  limit?: number;
  cursor?: string;
  updatedSince?: number;
  race?: string;
  season?: number;
  publishedAfter?: number;
  publishedBefore?: number;
  driver?: string;
  team?: string;
  topic?: NewsTopic;
  lang?: NewsLanguage;
};

/** The list request, or what is wrong with it. */
export function parseNewsListQuery(
  params: URLSearchParams,
): NewsListQuery | NewsApiFailure {
  const parsed = parseListParams(params);
  if (typeof parsed === 'string') {
    return { code: 'invalid_request', message: parsed };
  }
  if (isFailure(parsed)) {
    return parsed;
  }
  const lang = parseLang(params);
  return isFailure(lang) ? lang : { ...parsed, ...lang };
}

function parseListParams(
  params: URLSearchParams,
): NewsListQuery | NewsApiFailure | string {
  const problem = paramsProblem(params, NEWS_API_LIST_PARAMS);
  if (problem) {
    return problem;
  }

  const query: NewsListQuery = {};

  const limit = params.get('limit');
  if (limit !== null) {
    if (!/^\d{1,3}$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) {
      return '"limit" is a whole number from 1 to 100.';
    }
    query.limit = Number(limit);
  }

  const cursor = params.get('cursor');
  if (cursor !== null) {
    if (!/^[A-Za-z0-9_-]{1,8000}$/.test(cursor)) {
      return '"cursor" is the nextCursor value from an earlier response.';
    }
    query.cursor = cursor;
  }

  for (const [name, field] of [
    ['updated_since', 'updatedSince'],
    ['published_after', 'publishedAfter'],
    ['published_before', 'publishedBefore'],
  ] as const) {
    const value = params.get(name);
    if (value !== null) {
      const at = parseInstant(value);
      if (Number.isNaN(at)) {
        return `"${name}" is an ISO 8601 date-time with a zone, for example 2026-11-20T09:00:00Z.`;
      }
      query[field] = at;
    }
  }
  if (
    query.publishedAfter !== undefined &&
    query.publishedBefore !== undefined &&
    query.publishedAfter >= query.publishedBefore
  ) {
    return '"published_after" has to be earlier than "published_before".';
  }

  const race = params.get('race');
  if (race !== null) {
    if (!/^[a-z0-9-]{1,80}$/.test(race)) {
      return '"race" is a race slug, for example italy-2026.';
    }
    query.race = race;
  }

  const season = params.get('season');
  if (season !== null) {
    const year = parseSeason(season);
    if (year === null) {
      return '"season" is a year, for example 2026.';
    }
    query.season = year;
  }

  const driver = params.get('driver');
  if (driver !== null) {
    if (!/^[A-Za-z]{3}$/.test(driver)) {
      return '"driver" is a three-letter driver code, for example LEC.';
    }
    query.driver = driver;
  }

  const team = params.get('team');
  if (team !== null) {
    if (team.length < 1 || team.length > 60) {
      return '"team" is a team name, for example Ferrari.';
    }
    // Any casing in, the canonical name out.
    const known = NEWS_API_TEAMS.find(
      (entry) => entry.name.toLowerCase() === team.toLowerCase(),
    );
    if (!known) {
      return { code: 'unknown_team' };
    }
    query.team = known.name;
  }

  const topic = params.get('topic');
  if (topic !== null) {
    if (!isNewsTopic(topic)) {
      return `"topic" is one of: ${NEWS_TOPICS.join(', ')}.`;
    }
    query.topic = topic;
  }

  return query;
}

/** `/news/:id`: the id from the path, and `lang`, the one parameter it takes. */
export function parseNewsItemRequest(
  url: URL,
): { id: string; lang?: NewsLanguage } | NewsApiFailure {
  const id = url.pathname.split('/').filter(Boolean).at(-1) ?? '';
  // Checked before the backend sees it: an id is short and alphanumeric, and
  // anything else is a 404 without a read.
  if (!/^[a-z0-9]{1,64}$/.test(id)) {
    return { code: 'not_found' };
  }
  const problem = paramsProblem(url.searchParams, NEWS_API_ITEM_PARAMS);
  if (problem) {
    return { code: 'invalid_request', message: problem };
  }
  const lang = parseLang(url.searchParams);
  return isFailure(lang) ? lang : { id, ...lang };
}

/** `/races`: an optional `season`. */
export function parseRacesQuery(
  params: URLSearchParams,
): { season?: number } | NewsApiFailure {
  const problem = paramsProblem(params, NEWS_API_RACES_PARAMS);
  if (problem) {
    return { code: 'invalid_request', message: problem };
  }
  const season = params.get('season');
  if (season === null) {
    return {};
  }
  const year = parseSeason(season);
  return year === null
    ? {
        code: 'invalid_request',
        message: '"season" is a year, for example 2026.',
      }
    : { season: year };
}

/** `/drivers` and `/teams` take no parameters. */
export function parseNoParams(
  params: URLSearchParams,
): Record<string, never> | NewsApiFailure {
  const problem = paramsProblem(params, []);
  return problem ? { code: 'invalid_request', message: problem } : {};
}
