/**
 * Floor a timestamp so a weather query's `now` argument repeats.
 *
 * The Convex query cache keys on (function, args). A raw `Date.now()` is a new
 * key on every mount, and a ticking clock is a new subscription every tick, so
 * the forecast drops to `undefined` until the round trip comes back. The idle
 * window on the cache is five minutes; an hourly bucket is coarser than that,
 * so the key still matches for as long as the answer is warm.
 *
 * The weather queries only use `now` for forecast eligibility (a nine-day
 * horizon) and lock lookups, so the hour costs no accuracy the UI relies on.
 * Shared by web and mobile, which each kept an identical copy.
 */
export const WEATHER_NOW_BUCKET_MS = 60 * 60 * 1_000;

export function bucketWeatherNow(now: number): number {
  return Math.floor(now / WEATHER_NOW_BUCKET_MS) * WEATHER_NOW_BUCKET_MS;
}
