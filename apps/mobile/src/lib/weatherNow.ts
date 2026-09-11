/**
 * Floor a timestamp so `weather.getByRaceSlug`'s `now` arg repeats.
 *
 * The Convex query cache keys on (function, args). `useNow` ticks every
 * second in the picks card and every 30s in the hero; a raw tick is a new
 * subscription, so the forecast drops to `undefined` and the row unmounts
 * until the round trip comes back. Web already buckets this (`weatherNow.ts`)
 * for the same reason.
 *
 * Eligibility is a nine-day horizon, so an hourly bucket costs no accuracy
 * the UI was using.
 */
export const WEATHER_NOW_BUCKET_MS = 60 * 60 * 1_000;

export function bucketWeatherNow(now: number): number {
  return Math.floor(now / WEATHER_NOW_BUCKET_MS) * WEATHER_NOW_BUCKET_MS;
}

type ForecastHour = {
  at: number;
  forecastPeriodHours: number;
};

/**
 * Hour covering `startAt`, else the nearest hour we have.
 *
 * MET hours are period windows, not exact session times. A lock a few minutes
 * outside the covering window used to hide the row even though a forecast was
 * already on the client.
 */
export function pickForecastHour<T extends ForecastHour>(
  hours: ReadonlyArray<T>,
  startAt: number,
): T | undefined {
  const covering = hours.find(
    (hour) =>
      hour.at <= startAt &&
      startAt < hour.at + hour.forecastPeriodHours * 3_600_000,
  );
  if (covering) {
    return covering;
  }
  if (hours.length === 0) {
    return undefined;
  }
  return hours.reduce((best, hour) =>
    Math.abs(hour.at - startAt) < Math.abs(best.at - startAt) ? hour : best,
  );
}
