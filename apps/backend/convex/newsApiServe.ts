import { v } from 'convex/values';

import { internal } from './_generated/api';
import { action } from './_generated/server';
import { newsLanguageValidator } from './lib/newsApiValidators';
import type {
  NewsDriversResult,
  NewsGetResult,
  NewsListResult,
  NewsMeterResult,
  NewsRacesResult,
} from './newsApi';
import { newsPageRequestArgs } from './newsApi';

/**
 * The keyed news API's only public entry points, one per endpoint.
 *
 * Each counts the request and runs the read side by side, inside Convex, and
 * reads the clock itself. The reads used to be public queries the web routes
 * called beside a public `recordRequest`, which left two doors open: a key
 * holder calling Convex directly skipped the count and its rate limit, and
 * because `now` came from the caller, a later `now` read past the plan's
 * delay. The reads and the meter are internal now, so these are the only way
 * in, and a response still waits for one round trip, not two.
 *
 * Every action answers `{ meter, result }`. When `meter` refuses, the route
 * drops `result`: a refused request is not counted, so it is not served.
 */

/** Typed from `newsApi`'s validators: through `internal` it would be circular. */
type Served<T> = { meter: NewsMeterResult; result: T };

export const list = action({
  args: { apiKey: v.string(), ...newsPageRequestArgs },
  handler: async (ctx, args): Promise<Served<NewsListResult>> => {
    const [meter, result] = await Promise.all([
      ctx.runMutation(internal.newsApi.recordRequest, { apiKey: args.apiKey }),
      ctx.runQuery(internal.newsApi.list, { ...args, now: Date.now() }),
    ]);
    return { meter, result };
  },
});

export const get = action({
  args: {
    apiKey: v.string(),
    id: v.string(),
    lang: v.optional(newsLanguageValidator),
  },
  handler: async (ctx, args): Promise<Served<NewsGetResult>> => {
    const [meter, result] = await Promise.all([
      ctx.runMutation(internal.newsApi.recordRequest, { apiKey: args.apiKey }),
      ctx.runQuery(internal.newsApi.get, { ...args, now: Date.now() }),
    ]);
    return { meter, result };
  },
});

export const races = action({
  args: { apiKey: v.string(), season: v.optional(v.number()) },
  handler: async (ctx, args): Promise<Served<NewsRacesResult>> => {
    const [meter, result] = await Promise.all([
      ctx.runMutation(internal.newsApi.recordRequest, { apiKey: args.apiKey }),
      ctx.runQuery(internal.newsApi.races, args),
    ]);
    return { meter, result };
  },
});

export const drivers = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<Served<NewsDriversResult>> => {
    const [meter, result] = await Promise.all([
      ctx.runMutation(internal.newsApi.recordRequest, { apiKey: args.apiKey }),
      ctx.runQuery(internal.newsApi.drivers, args),
    ]);
    return { meter, result };
  },
});

/**
 * `GET /api/v1/teams` reads nothing (the list is fixed in code) but is still
 * keyed and counted, so it has a meter and no read.
 */
export const teams = action({
  args: { apiKey: v.string() },
  handler: async (ctx, args): Promise<Served<{ ok: true }>> => ({
    meter: await ctx.runMutation(internal.newsApi.recordRequest, {
      apiKey: args.apiKey,
    }),
    result: { ok: true },
  }),
});
