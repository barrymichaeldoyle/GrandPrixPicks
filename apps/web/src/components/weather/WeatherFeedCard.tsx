import { Link } from '@tanstack/react-router';
import { ArrowRight, CloudSun } from 'lucide-react';

import { getRaceWriteup } from '@/lib/raceWriteups';
import {
  buildWeatherSessions,
  conditionLabel,
  forecastNarrative,
  nextWeatherSession,
  summarizeWeatherHours,
  type RaceWeather,
  type WeatherForecast,
  type WeatherWindowSummary,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0] & {
  slug: string;
  name: string;
};

function formatTime(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(timestamp);
}

function formatDay(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    timeZone,
  }).format(timestamp);
}

function rainLabel(summary: WeatherWindowSummary): string {
  if (summary.precipitationProbability != null) {
    return `${Math.round(summary.precipitationProbability)}% rain`;
  }
  return summary.precipitationAmountMm > 0
    ? `${summary.precipitationAmountMm.toFixed(1)} mm`
    : 'Dry signal';
}

function buildContextWindows(
  forecast: WeatherForecast,
  session: ReturnType<typeof buildWeatherSessions>[number],
) {
  const sixHours = 6 * 60 * 60_000;
  function overlaps(
    hour: WeatherForecast['hours'][number],
    startsAt: number,
    endsAt: number,
  ) {
    return (
      hour.at < endsAt &&
      hour.at + hour.forecastPeriodHours * 60 * 60_000 > startsAt
    );
  }
  return [
    {
      label: 'Before',
      detail: `${formatTime(session.startsAt - sixHours, forecast.timeZone)}–${formatTime(session.startsAt, forecast.timeZone)}`,
      summary: summarizeWeatherHours(
        forecast.hours.filter((hour) =>
          overlaps(hour, session.startsAt - sixHours, session.startsAt),
        ),
      ),
    },
    {
      label: session.label,
      detail: `${formatTime(session.startsAt, forecast.timeZone)}–${formatTime(session.endsAt, forecast.timeZone)}`,
      summary: summarizeWeatherHours(
        forecast.hours.filter((hour) =>
          overlaps(hour, session.startsAt, session.endsAt),
        ),
      ),
      highlighted: true,
    },
    {
      label: 'After',
      detail: `${formatTime(session.endsAt, forecast.timeZone)}–${formatTime(session.endsAt + sixHours, forecast.timeZone)}`,
      summary: summarizeWeatherHours(
        forecast.hours.filter((hour) =>
          overlaps(hour, session.endsAt, session.endsAt + sixHours),
        ),
      ),
    },
  ].flatMap((window) =>
    window.summary == null
      ? []
      : [{ ...window, summary: window.summary as WeatherWindowSummary }],
  );
}

export function WeatherFeedCard({
  race,
  weather,
  now,
}: {
  race?: RaceSchedule | null;
  weather: RaceWeather | null | undefined;
  now: number;
}) {
  if (!race || !weather || weather.forecast.raceSlug !== race.slug) {
    return null;
  }

  const { forecast, isStale, attribution } = weather;
  const session = nextWeatherSession(buildWeatherSessions(race), now);
  if (!session) {
    return null;
  }

  const writeup = getRaceWriteup(race.slug);
  const windows = buildContextWindows(forecast, session);

  return (
    <article className="mb-4 overflow-hidden rounded-sm border border-border bg-surface">
      <header className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h3 className="font-title flex items-center gap-2 font-medium text-text">
            <CloudSun className="h-5 w-5 text-text-muted" aria-hidden />
            {formatDay(session.startsAt, forecast.timeZone)} weather
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Around the next session · {race.name}
          </p>
        </div>
        <p className="gpp-mono shrink-0 text-xs text-text-muted">
          {isStale ? 'LAST AVAILABLE' : 'LIVE OUTLOOK'}
        </p>
      </header>

      <p className="px-4 pt-4 text-sm leading-6 text-text sm:px-5">
        {forecastNarrative(forecast, session)}
      </p>

      <div
        className={`mt-4 grid gap-px bg-border ${
          windows.length === 1
            ? 'sm:grid-cols-1'
            : windows.length === 2
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-3'
        }`}
      >
        {windows.map((window) => (
          <div
            key={window.label}
            className={
              window.highlighted
                ? 'bg-accent-muted px-4 py-4'
                : 'bg-surface-elevated px-4 py-4'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={
                    window.highlighted
                      ? 'text-xs font-semibold text-accent'
                      : 'text-xs font-semibold text-text-muted'
                  }
                >
                  {window.label}
                </p>
                <p className="gpp-mono mt-1 text-xs text-text-muted">
                  {window.detail}
                </p>
              </div>
              <WeatherIcon
                conditionCode={window.summary.conditionCode}
                className="h-4 w-4 text-text-muted"
              />
            </div>
            <p className="mt-3 text-sm text-text">
              {conditionLabel(window.summary.conditionCode)}
            </p>
            <p className="gpp-mono mt-1 text-xs text-text-muted">
              {window.summary.temperatureC}°C · {rainLabel(window.summary)}
            </p>
          </div>
        ))}
      </div>

      <footer className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="text-xs text-text-muted">
          Data from{' '}
          <a
            href={attribution.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border-strong underline-offset-4 hover:text-text"
          >
            {attribution.name}
          </a>
        </p>
        {writeup ? (
          <Link
            to={writeup.to}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text hover:text-accent"
          >
            Full weekend forecast
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: race.slug }}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text hover:text-accent"
          >
            Open race weekend
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </footer>
    </article>
  );
}
