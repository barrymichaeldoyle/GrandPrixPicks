import { WeatherTimeToggle } from '@/components/weather/WeatherTimeToggle';

import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { WeekendWeatherDetail } from '@/components/weather/WeekendWeatherDetail';
import { formatSessionClockTime, formatTimeZoneAbbreviation } from '@/lib/date';
import { useSessionTimeView } from '@/lib/sessionTimeView';
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
  return formatSessionClockTime(timestamp, timeZone);
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

  const {
    activeTimeZone,
    showViewerTime,
    setInViewerTime,
    showToggle,
    viewerZone,
  } = useSessionTimeView(timeZone);
  const firstStartAt = race.fp1StartAt ?? race.raceStartAt;
  const activeZoneLabel = showViewerTime
    ? (formatTimeZoneAbbreviation(firstStartAt, viewerZone!) ?? 'Your time')
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
    // Named for assistive technology rather than by a visible heading. A
    // heading here would have read "Schedule and forecast" over five rows
    // that say `Practice 1 · Fri 13:30 · 28°C`, which is the redundant
    // heading `docs/product-voice.md` rules out: the table states its own
    // subject. `WeekendScheduleList` on the dashboard is named the same way.
    <section
      aria-label={forecast ? 'Schedule and forecast' : 'Weekend schedule'}
      className="rounded-sm border border-border bg-surface"
    >
      {/* The column head, in the timing-sheet sense: what unit the figures
          below are in, and the control that changes it. The zone label and the
          toggle are pinned to opposite edges rather than sharing one group at
          the right. Grouped, the label's width was the toggle's left edge, so
          switching to a zone with a shorter name ("Madrid time" to "SAST")
          slid the whole control sideways under the cursor that had just
          clicked it. */}
      <div className="flex items-center justify-between gap-x-3 border-b border-border px-4 py-2">
        <span className="gpp-mono text-xs text-text-muted">
          {activeZoneLabel}
        </span>
        {showToggle ? (
          <WeatherTimeToggle
            showViewerTime={showViewerTime}
            onTimeViewChange={setInViewerTime}
          />
        ) : null}
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
              // The stripe sits inside the shared 16px gutter rather than
              // pushing the row to `pl-5` the way a leaderboard row does: it is
              // 8px wide, the gutter clears it twice over, and the session
              // names are a column that has to stay straight to read as one.
              //
              // Centred, not baseline-aligned. The forecast cell is a flex box
              // whose first item is a 16px icon, so its baseline came from the
              // icon rather than the temperature beside it and the whole cell
              // sat low against the session name and start time. With one line
              // of similar text in each cell, centring aligns all three and
              // does not depend on what the third one happens to contain.
              className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 border-b border-border/60 px-4 py-2 last:border-b-0 sm:py-2.5 ${
                forecast
                  ? 'sm:grid-cols-[minmax(0,1fr)_auto_auto]'
                  : 'sm:grid-cols-[6.5rem_1fr]'
              } ${isNext ? 'gpp-stripe bg-surface-elevated' : ''}`}
            >
              <dt
                className={`text-sm ${summary ? 'row-span-2 sm:row-span-1' : ''} ${isNext ? 'font-medium text-text' : 'text-text-muted'}`}
              >
                {/* The row that matters carries the stripe, a surface step and
                    the heavier weight. It used to be an accent fill with accent
                    text, which is the treatment the pressed toggle above it
                    already owns: two elements lit the same way meaning "you
                    chose this" and "this one runs next". Colour alone also does
                    not say which, hence the name. */}
                {isNext ? (
                  <span className="sr-only">Next session: </span>
                ) : null}
                {label}
              </dt>
              <dd className="gpp-mono text-right text-sm text-text">
                {forecast
                  ? formatTrackTimeShort(timestamp, activeTimeZone)
                  : formatTrackTime(timestamp, activeTimeZone)}
              </dd>
              {forecast && (
                // Time and forecast share the right column below `sm`, so the
                // session name centres against both lines. Forecast used to
                // span the full width as a second row: the name sat on the
                // first line only, and the wrap drew a break under it that
                // was not the row rule.
                //
                // A session with no forecast keeps the dash that gives the
                // column its shape on a wide card, and drops the whole cell
                // on a phone rather than spending a second line of a row
                // on an em dash.
                <dd
                  className={`col-start-2 items-center justify-end gap-1.5 text-right sm:col-start-auto sm:flex ${
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
          timeZoneLabel={activeZoneLabel}
          timeZone={activeTimeZone}
          showToggle={showToggle}
          showViewerTime={showViewerTime}
          onTimeViewChange={setInViewerTime}
        />
      )}
    </section>
  );
}
