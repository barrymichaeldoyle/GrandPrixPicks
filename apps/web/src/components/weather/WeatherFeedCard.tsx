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
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h3 className="font-title flex items-center gap-2 font-medium text-text">
            <CloudSun
              className="h-5 w-5 shrink-0 text-text-muted"
              aria-hidden
            />
            {formatDay(session.startsAt, forecast.timeZone)} weather
          </h3>
          {/* One line on a phone, and the phrase gives way rather than the
              name: "Around the next session" is the sentence's filler, the
              Grand Prix is the fact. Truncating the whole string instead left
              "Italian ..." on a 390px screen. */}
          <p className="mt-0.5 truncate text-xs text-text-muted sm:mt-1 sm:text-sm">
            <span className="hidden sm:inline">Around the next session · </span>
            {race.name}
          </p>
        </div>
        <p className="gpp-mono shrink-0 text-xs text-text-muted">
          {isStale ? 'LAST AVAILABLE' : 'LIVE OUTLOOK'}
        </p>
      </header>

      <p className="px-4 pt-3 text-sm leading-6 text-text sm:px-5 sm:pt-4">
        {forecastNarrative(forecast, session)}
      </p>

      {/*
        A phone reads these as a list of three moments, so each window is one
        row there: when on the left, what on the right. Stacked as four separate
        lines they ran to about 200px each and pushed the rest of the feed off
        a 390px screen for information that is four short strings.

        From `sm` the three windows become columns instead, and a left/right
        split inside a ~200px column would be cramped, so the same two blocks
        stack again — one layout, two shapes, via the grid's column count.
      */}
      <div
        className={`mt-3 grid gap-px bg-border sm:mt-4 ${
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
                ? 'bg-accent-muted px-4 py-2.5 sm:py-4'
                : 'bg-surface-elevated px-4 py-2.5 sm:py-4'
            }
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-1">
              <div className="min-w-0">
                <p
                  className={
                    window.highlighted
                      ? 'text-xs font-semibold text-accent'
                      : 'text-xs font-semibold text-text-muted'
                  }
                >
                  {window.label}
                </p>
                <p className="gpp-mono mt-0.5 text-xs text-text-muted sm:mt-1">
                  {window.detail}
                </p>
              </div>
              {/* Right-aligned on a phone so the two columns read as one row,
                  left-aligned once it is a column of its own. */}
              <div className="flex min-w-0 flex-col items-end text-right sm:items-start sm:text-left">
                <p className="flex items-center gap-1.5 text-sm text-text">
                  <WeatherIcon
                    conditionCode={window.summary.conditionCode}
                    className="h-4 w-4 shrink-0 text-text-muted"
                  />
                  {conditionLabel(window.summary.conditionCode)}
                </p>
                <p className="gpp-mono mt-0.5 text-xs text-text-muted">
                  {window.summary.temperatureC}°C · {rainLabel(window.summary)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* One row at every width. Stacked, these two short lines cost 105px of a
          phone screen for an attribution and a link, because the link's 44px
          tap target was sitting on a row of padding of its own. Wrapping is
          still allowed: at 320px, or with a longer provider name, the link
          drops to a second line rather than squashing. */}
      <footer className="flex flex-wrap items-center justify-between gap-x-3 px-4 py-1 sm:px-5 sm:py-4">
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
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-text hover:text-accent"
          >
            Full weekend forecast
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: race.slug }}
            className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-text hover:text-accent"
          >
            Open race weekend
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </footer>
    </article>
  );
}
