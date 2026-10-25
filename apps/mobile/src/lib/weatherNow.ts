export {
  bucketWeatherNow,
  WEATHER_NOW_BUCKET_MS,
} from '@grandprixpicks/shared/weatherNow';

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

const COMPASS_POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

/**
 * Sustained wind for a forecast hour, e.g. "NE 16 km/h": the eight-point
 * direction it blows from, and the provider's m/s in km/h. Web formats it the
 * same way (`windFigure` in weatherPresentation).
 */
export function windLabel(hour: {
  windSpeedMps: number;
  windDirectionDegrees?: number;
}): string {
  const speed = `${Math.round(hour.windSpeedMps * 3.6)} km/h`;
  if (hour.windDirectionDegrees === undefined) {
    return speed;
  }
  const normalized = ((hour.windDirectionDegrees % 360) + 360) % 360;
  return `${COMPASS_POINTS[Math.round(normalized / 45) % 8]} ${speed}`;
}
