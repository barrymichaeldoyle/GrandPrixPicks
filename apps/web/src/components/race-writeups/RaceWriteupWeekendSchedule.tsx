import { useState, useSyncExternalStore } from 'react';

import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { WeekendWeatherDetail } from '@/components/weather/WeekendWeatherDetail';
import { formatTimeZoneAbbreviation } from '@/lib/date';
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

/** Two states of one control, so the difference between them is one place. */
function toggleClass(active: boolean) {
  return `px-2 py-1 text-xs transition-colors ${
    active
      ? 'bg-accent-muted font-medium text-accent'
      : 'text-text-muted hover:text-text'
  }`;
}

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
 * The viewer's own time zone, once the browser can be asked for it.
 *
 * Null on the server and through hydration, so the markup React hydrates is
 * the markup Nitro sent: this card is on pages the edge caches for an hour, and
 * a time zone baked into that HTML would be one reader's zone served to
 * everybody. `useSyncExternalStore` is what makes that safe rather than an
 * effect that sets state on mount. Null too when the viewer is already in the
 * track's zone, where the toggle would offer a choice between two identical
 * columns.
 */
function useViewerTimeZone(trackTimeZone: string): string | null {
  const zone = useSyncExternalStore(
    subscribeToNothing,
    readDeviceTimeZone,
    readNoTimeZone,
  );
  return zone !== null && zone !== trackTimeZone ? zone : null;
}

/** The device zone never changes under us, so there is nothing to subscribe to. */
function subscribeToNothing() {
  return () => {};
}

function readDeviceTimeZone(): string | null {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
}

function readNoTimeZone(): string | null {
  return null;
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
 * hours either side of the next session, a way into the hour-by-hour detail
 * (a modal, so the grid gets a viewport rather than a card column), and the
 * provider's attribution, which its licence requires.
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

  const viewerTimeZone = useViewerTimeZone(timeZone);
  const [inViewerTime, setInViewerTime] = useState(false);
  const showViewerTime = inViewerTime && viewerTimeZone !== null;
  const activeTimeZone = showViewerTime ? viewerTimeZone! : timeZone;
  const firstStartAt = race.fp1StartAt ?? race.raceStartAt;
  const activeZoneLabel = showViewerTime
    ? (formatTimeZoneAbbreviation(firstStartAt, viewerTimeZone!) ?? 'Your time')
    : timeZoneLabel;

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
        <div className="flex items-center gap-2">
          <span className="gpp-mono text-xs text-text-muted uppercase">
            {activeZoneLabel}
          </span>
          {viewerTimeZone ? (
            <div
              className="flex items-center overflow-hidden rounded-sm border border-border"
              role="group"
              aria-label="Show session times in"
            >
              <button
                type="button"
                onClick={() => setInViewerTime(false)}
                aria-pressed={!showViewerTime}
                className={toggleClass(!showViewerTime)}
              >
                Track time
              </button>
              <button
                type="button"
                onClick={() => setInViewerTime(true)}
                aria-pressed={showViewerTime}
                className={`border-l border-border ${toggleClass(showViewerTime)}`}
              >
                My time
              </button>
            </div>
          ) : null}
        </div>
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
              // Centred, not baseline-aligned. The forecast cell is a flex box
              // whose first item is a 16px icon, so its baseline came from the
              // icon rather than the temperature beside it and the whole cell
              // sat low against the session name and start time. With one line
              // of similar text in each cell, centring aligns all three and
              // does not depend on what the third one happens to contain.
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-b border-border/60 px-4 py-2 last:border-b-0 sm:py-2.5 ${
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
                  ? formatTrackTimeShort(timestamp, activeTimeZone)
                  : formatTrackTime(timestamp, activeTimeZone)}
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
          timeZoneLabel={timeZoneLabel}
        />
      )}
    </section>
  );
}
