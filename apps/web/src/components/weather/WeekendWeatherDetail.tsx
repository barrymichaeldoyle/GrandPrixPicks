import { ChevronRight } from 'lucide-react';

import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  localDateKey,
  type RaceWeather,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0];

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

/**
 * Everything about the weekend's weather that a schedule row cannot carry.
 *
 * Three things, in the order they matter: an alert about the hours either side
 * of the next session, which is the one weather fact a per-session figure
 * cannot express; the hour-by-hour model output, folded away; and the
 * provider's attribution, which its licence requires and which is the reason
 * this block exists at all rather than the numbers simply appearing on the
 * schedule unsourced.
 *
 * The hours are a disclosure on every weekend, not only a settled one. The grid
 * is the same size whether or not it has anything to say — three days of six
 * cells, most of them hours when nothing runs — and the schedule above now
 * answers the question a reader came with. What the hours add is *when*: which
 * part of an afternoon a shower lands in, and whether it clears before the next
 * session. Worth keeping, worth opening deliberately.
 *
 * `<details>` rather than React state, because these write-up pages are the
 * ones crawlers and logged-out visitors see: it opens with no JavaScript, it is
 * keyboard operable for free, and its contents stay in the SSR HTML where a
 * crawler can still read them.
 */
export function WeekendWeatherDetail({
  weather,
  race,
  now,
  alert,
}: {
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
  alert: string | null;
}) {
  const { forecast, isStale, attribution } = weather;
  const sessions = buildWeatherSessions(race);
  const timeline = buildWeatherTimeline(forecast, sessions);

  return (
    <div className="border-t border-border px-4 py-3">
      {(alert || isStale) && (
        <div className="mb-3">
          {alert && <p className="text-sm leading-6 text-text">{alert}</p>}
          {isStale && (
            <p className={`text-sm text-error ${alert ? 'mt-1' : ''}`}>
              The latest refresh failed, so this is the most recent available
              forecast.
            </p>
          )}
        </div>
      )}

      <details className="group">
        <summary className="gpp-touch-target flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-text hover:text-accent">
          <ChevronRight
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden
          />
          Hour-by-hour detail
        </summary>
        <div className="mt-3 space-y-5">
          {timeline.map((day) => {
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
            // A session goes missing from the forecast at both ends of the
            // weekend, and only one of them means "not yet". The model runs
            // about nine days out, so a distant session has no hours yet; but
            // the provider also starts at the current hour, so a session that
            // has already run has no hours any more. Telling someone to check
            // back closer to the weekend for a practice session they watched
            // this morning is the wrong half of that.
            const alreadyRun = uncovered.filter(
              (session) => session.endsAt <= now,
            );
            const notYetForecast = uncovered.filter(
              (session) => session.endsAt > now,
            );
            return (
              <section
                key={day.localDate}
                aria-label={formatDay(day.localDate, forecast.timeZone)}
              >
                <h3 className="font-title mb-2 text-sm font-medium text-text">
                  {formatDay(day.localDate, forecast.timeZone)}
                </h3>
                <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-3">
                  {day.periods.map((period) => {
                    const highlighted = period.sessions.length > 0;
                    return (
                      <li
                        key={period.startsAt}
                        className={
                          highlighted
                            ? 'bg-accent-muted px-3 py-2.5'
                            : 'bg-surface px-3 py-2.5'
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
                          <p className="mt-1 text-xs font-semibold text-accent">
                            {period.sessions
                              .map((session) => session.label)
                              .join(' · ')}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-text-muted">
                          {conditionLabel(period.conditionCode)}
                        </p>
                        <p className="gpp-mono mt-0.5 text-sm text-text">
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
                  {/* A short day used to leave the rest of the grid as one
                      empty block, which on race day meant the Grand Prix itself
                      showed an apparently broken container. It is not broken:
                      the hours either ran out ahead of the model or fell behind
                      the current hour. Say which, and name the session rather
                      than leaving a hole. */}
                  {uncovered.length > 0 && (
                    <li
                      className={`bg-surface px-3 py-2.5 ${fillerSpan(day.periods.length)}`}
                    >
                      <p className="gpp-mono text-sm text-text-muted">
                        {notYetForecast.length > 0
                          ? 'Not yet forecast'
                          : 'Already run'}
                      </p>
                      {notYetForecast.length > 0 && (
                        <p className="mt-1 text-sm text-text-muted">
                          {notYetForecast
                            .map((session) => session.label)
                            .join(' · ')}{' '}
                          {notYetForecast.length === 1 ? 'is' : 'are'} beyond
                          the model range for now. Check back closer to the
                          weekend.
                        </p>
                      )}
                      {alreadyRun.length > 0 && (
                        <p className="mt-1 text-sm text-text-muted">
                          {alreadyRun
                            .map((session) => session.label)
                            .join(' · ')}{' '}
                          {alreadyRun.length === 1 ? 'has' : 'have'} run. The
                          forecast starts from the current hour.
                        </p>
                      )}
                    </li>
                  )}
                </ol>
              </section>
            );
          })}
        </div>
      </details>

      <p className="mt-3 text-xs leading-5 text-text-muted">
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
    </div>
  );
}
