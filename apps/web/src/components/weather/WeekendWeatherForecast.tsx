import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { ChevronRight, Wind } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  forecastNarrative,
  localDateKey,
  nextWeatherSession,
  weekendWeatherOutlook,
  type RaceWeather,
  type WeatherDay,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0] & {
  slug: string;
  name: string;
};

function formatDay(localDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(new Date(`${localDate}T12:00:00Z`));
}

function formatUpdated(timestamp: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60_000));
  if (minutes < 2) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
}

function precipitationLabel(day: WeatherDay): string {
  if (day.maxPrecipitationProbability != null) {
    return `${Math.round(day.maxPrecipitationProbability)}% rain`;
  }
  return day.totalPrecipitationMm > 0
    ? `${day.totalPrecipitationMm.toFixed(1)} mm rain`
    : 'Dry signal';
}

/**
 * Grid columns the "not yet forecast" cell should cover so the row finishes
 * flush. The grid is 2 columns on mobile and 3 from `sm`, so a day holding a
 * single period leaves one gap on mobile and two above it.
 */
function fillerSpan(periods: number): string {
  if (periods === 1) {
    return 'col-span-1 sm:col-span-2';
  }
  return 'col-span-full sm:col-span-1';
}

export function WeekendWeatherForecast({
  weather,
  race,
  now,
}: {
  weather: RaceWeather | null;
  race: RaceSchedule;
  now: number;
}) {
  if (!weather) {
    return null;
  }

  const { forecast, isStale, attribution } = weather;
  const circuit = getCircuitForRace(race.slug);
  const sessions = buildWeatherSessions(race);
  const timeline = buildWeatherTimeline(forecast, sessions);
  const nextSession = nextWeatherSession(sessions, now) ?? sessions.at(-1);
  const outlook = weekendWeatherOutlook(forecast);

  return (
    <section
      className="py-12 sm:py-16"
      aria-labelledby="weekend-weather-heading"
    >
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="weekend-weather-heading"
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Weather around the sessions
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            {outlook.settled
              ? // Said once. The grid below repeats it in every cell, which is
                // why it is folded away when there is nothing to report.
                outlook.summary
              : `The forecast runs through each event day, because rain before or after a session can still arrive early, leave a damp circuit, or change the grip available when it starts.`}
          </p>
        </div>
        <p className="gpp-mono shrink-0 text-xs text-text-muted">
          {circuit?.locality.toUpperCase() ?? race.name.toUpperCase()} TIME
        </p>
      </div>

      {nextSession && !outlook.settled && (
        <div className="border-b border-border bg-surface-elevated px-4 py-5 sm:px-5">
          <p className="max-w-3xl text-base leading-7 text-text">
            {forecastNarrative(forecast, nextSession)}
          </p>
          {isStale && (
            <p className="mt-2 text-sm text-error">
              The latest refresh failed, so this is the most recent available
              forecast.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-px bg-border sm:grid-cols-3">
        {forecast.days.map((day) => (
          <div key={day.localDate} className="bg-surface px-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-title font-medium text-text">
                {formatDay(day.localDate, forecast.timeZone)}
              </p>
              <WeatherIcon
                conditionCode={
                  day.hasThunderRisk ? 'thunder' : day.dominantConditionCode
                }
                className={
                  day.hasThunderRisk
                    ? 'h-5 w-5 text-error'
                    : 'h-5 w-5 text-text-muted'
                }
              />
            </div>
            <p className="mt-3 text-sm text-text-muted">
              {day.hasThunderRisk
                ? 'Thunderstorm risk'
                : conditionLabel(day.dominantConditionCode)}
            </p>
            <div className="gpp-mono mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text">
              <span>
                {Math.round(day.minTemperatureC)}–
                {Math.round(day.maxTemperatureC)}°C
              </span>
              <span>{precipitationLabel(day)}</span>
              {day.maxWindGustMps != null && (
                <span className="inline-flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" aria-hidden />
                  {Math.round(day.maxWindGustMps * 3.6)} km/h gusts
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <TimelineShell settled={outlook.settled}>
        {timeline.map((day) => {
          const primarySession = day.sessions.find(
            (session) => session.endsAt >= now,
          );
          // Compared against the schedule, not against `day.sessions`: that
          // list is built from the hours the model returned, so a session
          // beyond the model's range is simply missing from it rather than
          // flagged, and nothing would ever be reported as uncovered.
          const uncovered = sessions.filter(
            (session) =>
              localDateKey(session.startsAt, forecast.timeZone) ===
                day.localDate &&
              !day.periods.some((period) =>
                period.sessions.some((held) => held.key === session.key),
              ),
          );
          return (
            <section
              key={day.localDate}
              aria-label={formatDay(day.localDate, forecast.timeZone)}
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-title text-lg font-medium text-text">
                  {formatDay(day.localDate, forecast.timeZone)}
                </h3>
                {primarySession && primarySession.key !== nextSession?.key && (
                  <p className="text-sm text-text-muted">
                    {forecastNarrative(forecast, primarySession)}
                  </p>
                )}
              </div>
              <ol
                className={`grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3 ${day.periods.length > 3 ? 'lg:grid-cols-6' : ''}`}
              >
                {day.periods.map((period) => {
                  const highlighted = period.sessions.length > 0;
                  return (
                    <li
                      key={period.startsAt}
                      className={
                        highlighted
                          ? 'bg-accent-muted px-3 py-4'
                          : 'bg-surface px-3 py-4'
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <time className="gpp-mono text-sm text-text">
                          {String(period.localHour).padStart(2, '0')}:00
                          {period.endsAt - period.startsAt >= 6 * 60 * 60_000
                            ? `–${String((period.localHour + 6) % 24).padStart(2, '0')}:00`
                            : ''}
                        </time>
                        <WeatherIcon
                          conditionCode={period.conditionCode}
                          className="h-4 w-4 text-text-muted"
                        />
                      </div>
                      {highlighted && (
                        <p className="mt-2 text-xs font-semibold text-accent">
                          {period.sessions
                            .map((session) => session.label)
                            .join(' · ')}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-text-muted">
                        {conditionLabel(period.conditionCode)}
                      </p>
                      <p className="gpp-mono mt-1 text-sm text-text">
                        {period.temperatureC}°C
                        <span className="text-text-muted"> · </span>
                        {period.precipitationProbability != null
                          ? `${Math.round(period.precipitationProbability)}%`
                          : period.precipitationAmountMm > 0
                            ? `${period.precipitationAmountMm.toFixed(1)} mm`
                            : 'dry'}
                      </p>
                    </li>
                  );
                })}
                {/* A short day used to leave the rest of the grid as one empty
                    block, which on race day meant the Grand Prix itself showed
                    an apparently broken container. It is not broken: the model
                    only runs about nine days out. Say so, and name the session
                    that is missing rather than leaving a hole. */}
                {uncovered.length > 0 && (
                  <li
                    className={`bg-surface px-3 py-4 ${fillerSpan(day.periods.length)}`}
                  >
                    <p className="gpp-mono text-sm text-text-muted">
                      Not yet forecast
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      {uncovered.map((session) => session.label).join(' · ')}{' '}
                      {uncovered.length === 1 ? 'is' : 'are'} beyond the model
                      range for now. Check back closer to the weekend.
                    </p>
                  </li>
                )}
              </ol>
            </section>
          );
        })}
      </TimelineShell>

      <footer className="mt-6 flex flex-col gap-2 text-xs leading-5 text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Forecasts can shift. Times and summaries use the latest available
          model data for the circuit coordinates.
        </p>
        <p className="shrink-0">
          <a
            href={attribution.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
          >
            {attribution.name}
          </a>{' '}
          ·{' '}
          <a
            href={attribution.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-border-strong underline-offset-4 hover:text-text"
          >
            {attribution.licenseName}
          </a>{' '}
          · updated {formatUpdated(forecast.checkedAt, now)}
        </p>
      </footer>
    </section>
  );
}

/**
 * Holds the hour-by-hour timeline, open or folded away.
 *
 * A settled weekend gets a disclosure rather than deletion: the detail is still
 * the honest record of what the model says, and someone weighing a marginal
 * pick may well want it. It just should not be the largest thing on the page
 * when every cell reads "dry".
 *
 * `<details>` rather than React state, because these write-up pages are the
 * ones crawlers and logged-out visitors see: it opens with no JavaScript, it is
 * keyboard operable for free, and its contents stay in the SSR HTML where a
 * crawler can still read them.
 */
function TimelineShell({
  settled,
  children,
}: {
  settled: boolean;
  children: ReactNode;
}) {
  if (!settled) {
    return <div className="mt-8 space-y-8">{children}</div>;
  }

  return (
    <details className="group mt-6 border-t border-border pt-5">
      <summary className="gpp-touch-target flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text hover:text-accent">
        <ChevronRight
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden
        />
        Hour-by-hour detail
      </summary>
      <div className="mt-6 space-y-8">{children}</div>
    </details>
  );
}
