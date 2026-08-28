import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import {
  getEventDates,
  isForecastStale,
  isWeatherEligible,
  parseMetNoForecast,
  shouldRefreshWeather,
  weatherDayValidator,
  weatherHourValidator,
} from './lib/weather';

const HOUR = 60 * 60 * 1_000;
const DAY = 24 * HOUR;
const MAX_CANDIDATES = 4;
const MET_NO_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
const USER_AGENT =
  'GrandPrixPicks/1.0 https://grandprixpicks.com noreply@grandprixpicks.com';

const weatherForecastFields = {
  raceId: v.id('races'),
  raceSlug: v.string(),
  timeZone: v.string(),
  latitude: v.number(),
  longitude: v.number(),
  elevation: v.optional(v.number()),
  provider: v.literal('met_no'),
  providerUpdatedAt: v.number(),
  eventDates: v.array(v.string()),
  hours: v.array(weatherHourValidator),
  days: v.array(weatherDayValidator),
  fetchedAt: v.number(),
  checkedAt: v.number(),
  expiresAt: v.number(),
  lastModified: v.optional(v.string()),
  lastRefreshError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
};

const weatherForecastValidator = v.object({
  _id: v.id('weatherForecasts'),
  _creationTime: v.number(),
  ...weatherForecastFields,
});

const attributionValidator = v.object({
  name: v.string(),
  url: v.string(),
  licenseName: v.string(),
  licenseUrl: v.string(),
});

const publicWeatherValidator = v.union(
  v.null(),
  v.object({
    forecast: weatherForecastValidator,
    isStale: v.boolean(),
    attribution: attributionValidator,
  }),
);

export const WEATHER_ATTRIBUTION = {
  name: 'MET Norway',
  url: 'https://www.met.no/en',
  licenseName: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
} as const;

function publicWeather(forecast: Doc<'weatherForecasts'> | null) {
  if (!forecast) {
    return null;
  }
  return {
    forecast,
    isStale: isForecastStale(forecast),
    attribution: WEATHER_ATTRIBUTION,
  };
}

/** Detailed forecast for an indexable race/writeup page. */
export const getByRaceSlug = query({
  args: { raceSlug: v.string(), now: v.number() },
  returns: publicWeatherValidator,
  handler: async (ctx, args) => {
    const forecast = await ctx.db
      .query('weatherForecasts')
      .withIndex('by_raceSlug', (q) => q.eq('raceSlug', args.raceSlug))
      .unique();
    if (!forecast) {
      return null;
    }
    const race = await ctx.db.get('races', forecast.raceId);
    if (!race || !isWeatherEligible(race, args.now)) {
      return null;
    }
    return publicWeather(forecast);
  },
});

/** Current weekend forecast for the dashboard/feed context card. */
export const getUpcoming = query({
  args: { now: v.number() },
  returns: publicWeatherValidator,
  handler: async (ctx, args) => {
    const lockedRace = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'locked').gt('predictionLockAt', args.now - 3 * DAY),
      )
      .order('desc')
      .first();
    const race =
      lockedRace ??
      (await ctx.db
        .query('races')
        .withIndex('by_status_and_predictionLockAt', (q) =>
          q.eq('status', 'upcoming').gt('predictionLockAt', args.now),
        )
        .first());
    if (!race) {
      return null;
    }
    const forecast = await ctx.db
      .query('weatherForecasts')
      .withIndex('by_raceId', (q) => q.eq('raceId', race._id))
      .unique();
    if (!isWeatherEligible(race, args.now)) {
      return null;
    }
    return publicWeather(forecast);
  },
});

const refreshCandidateValidator = v.object({
  raceId: v.id('races'),
  raceSlug: v.string(),
  timeZone: v.string(),
  fp1StartAt: v.optional(v.number()),
  fp2StartAt: v.optional(v.number()),
  fp3StartAt: v.optional(v.number()),
  qualiStartAt: v.optional(v.number()),
  sprintQualiStartAt: v.optional(v.number()),
  sprintStartAt: v.optional(v.number()),
  raceStartAt: v.number(),
  previous: v.union(
    v.null(),
    v.object({
      checkedAt: v.number(),
      expiresAt: v.number(),
      lastModified: v.optional(v.string()),
    }),
  ),
});

export const findRefreshCandidates = internalQuery({
  args: { now: v.number() },
  returns: v.array(refreshCandidateValidator),
  handler: async (ctx, args) => {
    // A GP is normally two days after FP1, so a race-time range of 12 days
    // covers MET Norway's nine-day horizon from the first event session.
    const races = await ctx.db
      .query('races')
      .withIndex('by_raceStartAt', (q) =>
        q
          .gte('raceStartAt', args.now - DAY)
          .lte('raceStartAt', args.now + 12 * DAY),
      )
      .take(12);

    const candidates = [];
    for (const race of races) {
      if (
        (race.status !== 'upcoming' && race.status !== 'locked') ||
        !isWeatherEligible(race, args.now)
      ) {
        continue;
      }
      const previous = await ctx.db
        .query('weatherForecasts')
        .withIndex('by_raceId', (q) => q.eq('raceId', race._id))
        .unique();
      if (!shouldRefreshWeather(race, args.now, previous)) {
        continue;
      }
      candidates.push({
        raceId: race._id,
        raceSlug: race.slug,
        timeZone: race.timeZone ?? 'UTC',
        fp1StartAt: race.fp1StartAt,
        fp2StartAt: race.fp2StartAt,
        fp3StartAt: race.fp3StartAt,
        qualiStartAt: race.qualiStartAt,
        sprintQualiStartAt: race.sprintQualiStartAt,
        sprintStartAt: race.sprintStartAt,
        raceStartAt: race.raceStartAt,
        previous: previous
          ? {
              checkedAt: previous.checkedAt,
              expiresAt: previous.expiresAt,
              lastModified: previous.lastModified,
            }
          : null,
      });
      if (candidates.length >= MAX_CANDIDATES) {
        break;
      }
    }
    return candidates;
  },
});

export const saveForecast = internalMutation({
  args: {
    raceId: v.id('races'),
    raceSlug: v.string(),
    timeZone: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    elevation: v.optional(v.number()),
    providerUpdatedAt: v.number(),
    eventDates: v.array(v.string()),
    hours: v.array(weatherHourValidator),
    days: v.array(weatherDayValidator),
    fetchedAt: v.number(),
    checkedAt: v.number(),
    expiresAt: v.number(),
    lastModified: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query('weatherForecasts')
      .withIndex('by_raceId', (q) => q.eq('raceId', args.raceId))
      .unique();
    const value = {
      ...args,
      provider: 'met_no' as const,
      createdAt: previous?.createdAt ?? args.fetchedAt,
      updatedAt: args.checkedAt,
    };
    if (previous) {
      await ctx.db.replace('weatherForecasts', previous._id, value);
    } else {
      await ctx.db.insert('weatherForecasts', value);
    }
    return null;
  },
});

export const recordNotModified = internalMutation({
  args: {
    raceId: v.id('races'),
    checkedAt: v.number(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query('weatherForecasts')
      .withIndex('by_raceId', (q) => q.eq('raceId', args.raceId))
      .unique();
    if (previous) {
      await ctx.db.patch('weatherForecasts', previous._id, {
        checkedAt: args.checkedAt,
        expiresAt: args.expiresAt,
        lastRefreshError: undefined,
        updatedAt: args.checkedAt,
      });
    }
    return null;
  },
});

export const recordRefreshFailure = internalMutation({
  args: {
    raceId: v.id('races'),
    checkedAt: v.number(),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const previous = await ctx.db
      .query('weatherForecasts')
      .withIndex('by_raceId', (q) => q.eq('raceId', args.raceId))
      .unique();
    if (previous) {
      // Retain the last good forecast and delay retry until the next hourly
      // cron tick. Provider downtime must not erase weather from live pages.
      await ctx.db.patch('weatherForecasts', previous._id, {
        checkedAt: args.checkedAt,
        expiresAt: args.checkedAt + HOUR,
        lastRefreshError: args.message.slice(0, 500),
        updatedAt: args.checkedAt,
      });
    }
    return null;
  },
});

function expiryFromHeaders(headers: Headers, now: number): number {
  const expires = headers.get('expires');
  const parsed = expires ? Date.parse(expires) : Number.NaN;
  return Number.isFinite(parsed) && parsed > now ? parsed : now + HOUR;
}

function forecastUrl(latitude: number, longitude: number, elevation?: number) {
  const url = new URL(MET_NO_URL);
  // MET Norway asks callers to round coordinates to avoid cache fragmentation.
  url.searchParams.set('lat', latitude.toFixed(4));
  url.searchParams.set('lon', longitude.toFixed(4));
  if (elevation !== undefined) {
    url.searchParams.set('altitude', String(Math.round(elevation)));
  }
  return url.toString();
}

async function refreshCandidate(
  ctx: ActionCtx,
  candidate: {
    raceId: Id<'races'>;
    raceSlug: string;
    timeZone: string;
    fp1StartAt?: number;
    fp2StartAt?: number;
    fp3StartAt?: number;
    qualiStartAt?: number;
    sprintQualiStartAt?: number;
    sprintStartAt?: number;
    raceStartAt: number;
    previous: { lastModified?: string } | null;
  },
) {
  const circuit = getCircuitForRace(candidate.raceSlug);
  if (!circuit) {
    throw new Error(`No circuit location for ${candidate.raceSlug}`);
  }
  const eventDates = getEventDates(candidate, candidate.timeZone);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': USER_AGENT,
  };
  if (candidate.previous?.lastModified) {
    headers['If-Modified-Since'] = candidate.previous.lastModified;
  }
  const checkedAt = Date.now();
  const response = await fetch(
    forecastUrl(circuit.latitude, circuit.longitude, circuit.elevation),
    { headers },
  );
  const expiresAt = expiryFromHeaders(response.headers, checkedAt);
  if (response.status === 304) {
    await ctx.runMutation(internal.weather.recordNotModified, {
      raceId: candidate.raceId,
      checkedAt,
      expiresAt,
    });
    return;
  }
  if (!response.ok) {
    throw new Error(`MET Norway returned HTTP ${response.status}`);
  }
  const parsed = parseMetNoForecast(
    (await response.json()) as unknown,
    candidate.timeZone,
    new Set(eventDates),
  );
  await ctx.runMutation(internal.weather.saveForecast, {
    raceId: candidate.raceId,
    raceSlug: candidate.raceSlug,
    timeZone: candidate.timeZone,
    latitude: circuit.latitude,
    longitude: circuit.longitude,
    elevation: circuit.elevation,
    providerUpdatedAt: parsed.providerUpdatedAt,
    eventDates,
    hours: parsed.hours,
    days: parsed.days,
    fetchedAt: checkedAt,
    checkedAt,
    expiresAt,
    lastModified: response.headers.get('last-modified') ?? undefined,
  });
}

/** Hourly cron target. Adaptive cadence and provider expiry are enforced here. */
export const refreshWeather = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const candidates = await ctx.runQuery(
      internal.weather.findRefreshCandidates,
      { now },
    );
    for (const candidate of candidates) {
      try {
        await refreshCandidate(ctx, candidate);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(
          `Weather refresh failed for ${candidate.raceSlug}`,
          error,
        );
        await ctx.runMutation(internal.weather.recordRefreshFailure, {
          raceId: candidate.raceId,
          checkedAt: Date.now(),
          message,
        });
      }
    }
    return null;
  },
});
