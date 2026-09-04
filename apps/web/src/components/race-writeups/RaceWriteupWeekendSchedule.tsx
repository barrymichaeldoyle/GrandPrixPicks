import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { WeekendWeatherDetail } from '@/components/weather/WeekendWeatherDetail';
import {
  buildWeatherSessions,
  conditionLabel,
  forecastAlert,
  nextWeatherSession,
  summarizeSessionWindow,
  type RaceWeather,
  type WeatherWindowSummary,
} from '@/lib/weatherPresentation';

type ScheduleRace = {
  fp1StartAt?: number;
  fp2StartAt?: number;
  fp3StartAt?: number;
  hasSprint?: boolean;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
};

function formatTrackTime(timestamp: number | undefined, timeZone: string) {
  if (timestamp === undefined) {
    return 'To be confirmed';
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
    timeZoneName: 'short',
  }).format(timestamp);
}

/**
 * The short form, for a row that also carries a forecast.
 *
 * The date and the zone abbreviation are what give way: the card header names
 * the time zone, the hero eyebrow above it carries the dates, and the weekday
 * is unambiguous inside one race weekend. Keeping all four fields left no room
 * for the two figures that are the reason the forecast is here at all.
 */
function formatTrackTimeShort(
  timestamp: number | undefined,
  timeZone: string,
): string {
  if (timestamp === undefined) {
    return 'TBC';
  }
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(timestamp);
}

/** How warm, and how likely rain is, in the width a table cell has. */
function summaryFigures(summary: WeatherWindowSummary): string {
  const rain =
    summary.precipitationProbability != null
      ? `${Math.round(summary.precipitationProbability)}%`
      : summary.precipitationAmountMm > 0
        ? `${summary.precipitationAmountMm.toFixed(1)} mm`
        : 'dry';
  return `${summary.temperatureC}°C · ${rain}`;
}

/**
 * When each session runs, and what it is forecast to be like.
 *
 * **One table, because it answers one question.** These were two blocks: this
 * card in the hero, and a weather section under it that opened with a
 * paragraph about forecasts in general, summarised three days in cells, and
 * then printed an hour grid — three days of six periods, most of them hours
 * when nothing runs — which was the largest thing on the page whatever the
 * model said. Between them they named every session twice and its start time
 * twice, and the half a reader actually wanted, *what it will be like when my
 * picks are decided*, was the half neither said outright.
 *
 * So the forecast rides on the schedule row it belongs to. What survives from
 * the old section is what a per-session row cannot carry: an alert about the
 * hours either side of the next session, the hour-by-hour detail behind a
 * disclosure, and the provider's attribution, which its licence requires.
 *
 * `weather` is optional and independent of the schedule: a page with no
 * forecast loaded, or a race that has already run, renders exactly the table
 * this component rendered before.
 */
export function RaceWriteupWeekendSchedule({
  race,
  timeZone,
  timeZoneLabel,
  weather,
  now,
}: {
  race: ScheduleRace;
  timeZone: string;
  timeZoneLabel: string;
  weather?: RaceWeather | null;
  /** Required alongside `weather`: decides which session is the next one. */
  now?: number;
}) {
  const sessions: readonly (readonly [string, number | undefined])[] =
    race.hasSprint
      ? [
          ['Practice 1', race.fp1StartAt],
          ['Sprint Qualifying', race.sprintQualiStartAt],
          ['Sprint', race.sprintStartAt],
          ['Qualifying', race.qualiStartAt],
          ['Grand Prix', race.raceStartAt],
        ]
      : [
          ['Practice 1', race.fp1StartAt],
          ['Practice 2', race.fp2StartAt],
          ['Practice 3', race.fp3StartAt],
          ['Qualifying', race.qualiStartAt],
          ['Grand Prix', race.raceStartAt],
        ];

  const forecast = weather?.forecast ?? null;
  const weatherSessions = forecast ? buildWeatherSessions(race) : [];
  const nextSession =
    forecast && now !== undefined
      ? nextWeatherSession(weatherSessions, now)
      : null;
  const alert =
    forecast && nextSession ? forecastAlert(forecast, nextSession) : null;

  return (
    <section
      aria-labelledby="weekend-timing"
      className="rounded-sm bg-surface-elevated"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-4 py-2.5 sm:py-3">
        <h2 id="weekend-timing" className="font-title font-medium text-text">
          {forecast ? 'Schedule and forecast' : 'Weekend schedule'}
        </h2>
        <span className="gpp-mono text-xs text-text-muted">
          {timeZoneLabel}
        </span>
      </div>
      <dl>
        {sessions.map(([label, timestamp]) => {
          const session = weatherSessions.find(
            (candidate) => candidate.startsAt === timestamp,
          );
          const summary =
            forecast && session
              ? summarizeSessionWindow(forecast, session)
              : null;
          const isNext = Boolean(session && session.key === nextSession?.key);
          return (
            <div
              key={label}
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 last:border-b-0 sm:py-2.5 ${
                forecast
                  ? 'sm:grid-cols-[minmax(0,1fr)_auto_auto]'
                  : 'sm:grid-cols-[6.5rem_1fr]'
              } ${isNext ? 'bg-accent-muted' : ''}`}
            >
              <dt
                className={`text-sm ${isNext ? 'font-medium text-accent' : 'text-text-muted'}`}
              >
                {label}
              </dt>
              <dd className="gpp-mono text-right text-sm text-text">
                {forecast
                  ? formatTrackTimeShort(timestamp, timeZone)
                  : formatTrackTime(timestamp, timeZone)}
              </dd>
              {forecast && (
                // Third cell on its own line below `sm`, where the two above
                // it already use the full width of a phone. A session with no
                // forecast keeps the dash that gives the column its shape on a
                // wide card, and drops the whole cell on a phone rather than
                // spending a second line of a row on an em dash.
                <dd
                  className={`col-span-2 items-center justify-end gap-1.5 text-right sm:col-span-1 sm:flex ${
                    summary ? 'flex' : 'hidden'
                  }`}
                >
                  {summary ? (
                    <>
                      <WeatherIcon
                        conditionCode={summary.conditionCode}
                        className="h-4 w-4 shrink-0 text-text-muted"
                      />
                      {/* The icon carries the condition for anyone who can see
                          it, and carries nothing at all otherwise. */}
                      <span className="sr-only">
                        {conditionLabel(summary.conditionCode)},{' '}
                      </span>
                      <span className="gpp-mono text-sm text-text-muted">
                        {summaryFigures(summary)}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="sr-only">
                        {timestamp !== undefined &&
                        now !== undefined &&
                        timestamp < now
                          ? 'Has run'
                          : 'Not yet forecast'}
                      </span>
                      <span className="text-sm text-text-disabled" aria-hidden>
                        &mdash;
                      </span>
                    </>
                  )}
                </dd>
              )}
            </div>
          );
        })}
      </dl>
      {forecast && now !== undefined && (
        <WeekendWeatherDetail
          weather={weather!}
          race={race}
          now={now}
          alert={alert}
        />
      )}
    </section>
  );
}
