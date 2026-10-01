import {
  sessionWeatherLine,
  weatherForSession,
  type RaceWeather,
  type WeatherWindowSummary,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof weatherForSession>[1] & {
  slug: string;
};

export function SessionWeatherFact({
  summary,
  isStale = false,
  label,
  className,
}: {
  summary: WeatherWindowSummary;
  isStale?: boolean;
  /** Spoken name of the session this describes. */
  label: string;
  className?: string;
}) {
  const line = sessionWeatherLine(summary);
  return (
    // The spoken version is hidden text rather than an `aria-label`: a label on
    // a plain span is not allowed (axe `aria-prohibited-attr`) and screen
    // readers are free to ignore it. It failed the signed-in a11y smoke only
    // when the dashboard had a forecast to show, which is why it read as flaky.
    <span
      className={`inline-flex items-center gap-1.5 text-text-muted ${className ?? ''}`}
    >
      <WeatherIcon
        conditionCode={summary.conditionCode}
        className="size-3.5 shrink-0"
      />
      <span className="gpp-mono text-xs" aria-hidden>
        {line}
        {isStale ? ' (last available)' : ''}
      </span>
      <span className="sr-only">
        {`${label}: ${line}${isStale ? ', last available' : ''}`}
      </span>
    </span>
  );
}

/**
 * The weekend forecast as a fact in the picks-card header.
 *
 * Rain is an input to a pick, so it belongs beside the race name rather than
 * as its own labelled row. The surrounding card already names the session the
 * countdown is for; this only has to say what it will be like.
 */
export function WeatherSessionLine({
  race,
  weather,
  sessionKey,
  className,
}: {
  race?: RaceSchedule | null;
  weather: RaceWeather | null | undefined;
  /** The session the card is currently describing. */
  sessionKey?: string | null;
  className?: string;
}) {
  if (
    !race ||
    !weather ||
    !sessionKey ||
    weather.forecast.raceSlug !== race.slug
  ) {
    return null;
  }

  const resolved = weatherForSession(weather.forecast, race, sessionKey);
  if (!resolved) {
    return null;
  }

  return (
    <SessionWeatherFact
      summary={resolved.summary}
      isStale={weather.isStale}
      label={resolved.session.label}
      className={className}
    />
  );
}
