import {
  buildWeatherSessions,
  buildWeatherTimeline,
  conditionLabel,
  localDateKey,
  type RaceWeather,
  type WeatherTimelineDay,
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
  timeZone = weather.forecast.timeZone,
}: {
  weather: RaceWeather;
  race: RaceSchedule;
  now: number;
  timeZone?: string;
}) {
  const { forecast } = weather;
  const sessions = buildWeatherSessions(race);
  // Keep the model's periods intact; only their displayed date and time change.
  const trackTimeline = buildWeatherTimeline(forecast, sessions);
  const days = new Map<string, WeatherTimelineDay>();
  for (const period of trackTimeline.flatMap((day) => day.periods)) {
    const localDate = localDateKey(period.startsAt, timeZone);
    const day = days.get(localDate) ?? { localDate, periods: [], sessions: [] };
    day.periods.push(period);
    days.set(localDate, day);
  }
  const coveredSessions = new Set(
    trackTimeline.flatMap((day) =>
      day.periods.flatMap((period) =>
        period.sessions.map((session) => session.key),
      ),
    ),
  );
  for (const session of sessions) {
    if (coveredSessions.has(session.key)) {
      continue;
    }
    const localDate = localDateKey(session.startsAt, timeZone);
    if (!days.has(localDate)) {
      days.set(localDate, { localDate, periods: [], sessions: [] });
    }
  }
  const timeline = [...days.values()].sort((a, b) =>
    a.localDate.localeCompare(b.localDate),
  );
  function formatTime(at: number) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(at);
  }

  return (
    <div className="space-y-5">
      {timeline.map((day) => {
        // Compared against the schedule, not against `day.sessions`: that
        // list is built from the hours the model returned, so a session
        // beyond the model's range is simply missing from it rather than
        // flagged, and nothing would ever be reported as uncovered.
        const uncovered = sessions.filter(
          (session) =>
            localDateKey(session.startsAt, timeZone) === day.localDate &&
            !trackTimeline
              .flatMap((entry) => entry.periods)
              .some((period) =>
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
            aria-label={formatWeatherDay(day.localDate, 'UTC')}
          >
            <h3 className="font-title mb-3 text-base font-medium text-text">
              {formatWeatherDay(day.localDate, 'UTC')}
            </h3>
            <ol className="divide-y divide-border overflow-hidden rounded-sm border border-border">
              {day.periods.map((period) => {
                const highlighted = period.sessions.length > 0;
                return (
                  <li
                    key={period.startsAt}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_4rem_8rem] ${highlighted ? 'bg-surface-hover' : 'bg-surface'}`}
                  >
                    <div className="min-w-0">
                      <time
                        dateTime={new Date(period.startsAt).toISOString()}
                        className="gpp-mono text-sm whitespace-nowrap text-text"
                      >
                        {formatTime(period.startsAt)}–
                        {formatTime(period.endsAt)}
                      </time>
                      {highlighted && (
                        <p className="mt-1 text-xs font-medium text-text">
                          {period.sessions
                            .map((session) => session.label)
                            .join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="col-start-1 row-start-2 flex items-center gap-2 text-sm text-text-muted sm:col-start-2 sm:row-start-1">
                      <WeatherIcon
                        conditionCode={period.conditionCode}
                        className="h-5 w-5 shrink-0"
                      />
                      {conditionLabel(period.conditionCode)}
                    </div>
                    <p className="gpp-mono col-start-2 row-start-1 text-right text-base text-text sm:col-start-3">
                      {period.temperatureC}°C
                    </p>
                    <p className="col-start-2 row-start-2 text-right text-xs text-text-muted sm:col-start-4 sm:row-start-1">
                      {period.precipitationProbability != null
                        ? `${Math.round(period.precipitationProbability)}% chance of rain`
                        : period.precipitationAmountMm > 0
                          ? `${period.precipitationAmountMm.toFixed(1)} mm rain`
                          : 'Dry'}
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
                <li className="bg-surface px-3 py-3">
                  <p className="text-sm font-medium text-text">
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
