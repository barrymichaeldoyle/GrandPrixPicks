/**
 * Floor a timestamp so `weather.getUpcoming`'s `now` arg repeats.
 *
 * The Convex query cache keys on (function, args). A raw `Date.now()` is a
 * unique key on every dashboard mount, so a client navigation back to home
 * cannot reuse the forecast the socket is still holding — it paints empty and
 * fills in after a round trip. The idle window on that cache is five minutes
 * (`AppConvexQueryCache`); an hourly bucket is coarser than that, so the key
 * still matches for as long as the answer is warm.
 *
 * `getUpcoming` only uses `now` for forecast eligibility and a three-day lock
 * lookup, so the hour costs no accuracy the UI was relying on.
 */
export const WEATHER_NOW_BUCKET_MS = 60 * 60 * 1_000;

export function bucketWeatherNow(now: number): number {
  return Math.floor(now / WEATHER_NOW_BUCKET_MS) * WEATHER_NOW_BUCKET_MS;
}
