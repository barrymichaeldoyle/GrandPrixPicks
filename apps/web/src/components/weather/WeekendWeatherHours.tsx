import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  localDateKey,
  type RaceWeather,
} from '@/lib/weatherPresentation';

import { WeatherIcon } from './WeatherIcon';

type RaceSchedule = Parameters<typeof buildWeatherSessions>[0];

function formatWeatherDay(localDate: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(new Date(`${localDate}T12:00:00Z`));
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
 * The model's own output: every forecast hour of the weekend, grouped by day,
 * with the sessions that fall inside them marked.
 *
 * This is three days of six cells whatever the model says, which is why it is
 * not on the page. The schedule row above already answers "what will it be
 * like when my picks are decided"; these hours answer *when* — which part of an
 * afternoon a shower lands in, and whether it clears before the next session —
 * and they need a surface of their own to be readable at that size. See
 * `WeekendWeatherHoursModal`.
 */
export function WeekendWeatherHours({
  weather,
  race,
  now,
}: {
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
}) {
  const { forecast } = weather;
  const sessions = buildWeatherSessions(race);
  const timeline = buildWeatherTimeline(forecast, sessions);

  return (
    <div className="space-y-5">
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
        const alreadyRun = uncovered.filter((session) => session.endsAt <= now);
        const notYetForecast = uncovered.filter(
          (session) => session.endsAt > now,
        );
        return (
          <section
            key={day.localDate}
            aria-label={formatWeatherDay(day.localDate, forecast.timeZone)}
          >
            <h3 className="font-title mb-2 text-sm font-medium text-text">
              {formatWeatherDay(day.localDate, forecast.timeZone)}
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
                      {notYetForecast.length === 1 ? 'is' : 'are'} beyond the
                      model range for now. Check back closer to the weekend.
                    </p>
                  )}
                  {alreadyRun.length > 0 && (
                    <p className="mt-1 text-sm text-text-muted">
                      {alreadyRun.map((session) => session.label).join(' · ')}{' '}
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
  );
}
