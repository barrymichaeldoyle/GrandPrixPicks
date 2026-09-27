import { WeatherTimeToggle } from '@/components/weather/WeatherTimeToggle';

import { WeatherIcon } from '@/components/weather/WeatherIcon';
import { WeekendWeatherDetail } from '@/components/weather/WeekendWeatherDetail';
import { formatSessionClockTime, formatTimeZoneAbbreviation } from '@/lib/date';
import { useSessionTimeView } from '@/lib/sessionTimeView';
import {
  buildWeatherSessions,
  forecastAlert,
  nextWeatherSession,
  sessionWeatherLine,
  summarizeSessionWindow,
  weatherWord,
  type RaceWeather,
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

/**
 * Day, date and time, without the zone: the card header names it.
 *
 * Each row used to end in the zone abbreviation too, and that is the one field
 * whose width depends on the reader. "CEST" fitted the hero's card column;
 * "GMT+2" wrapped every row onto two lines, so pressing "My time" shifted the
 * whole hero. Without it the row is the same width in every zone.
 */
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
      className="@container rounded-sm border border-border bg-surface"
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
      {/* One grid for the whole list, and each row a subgrid of it, so a
          column is as wide as its widest cell on *any* row. One line per
          session: the name, the forecast in a word, the start time. The
          figures behind the word are in the hour-by-hour forecast below; on
          the row they wrapped every session onto a second line. */}
      <dl
        className={`grid gap-x-3 ${
          forecast
            ? 'grid-cols-[minmax(0,1fr)_auto_auto]'
            : 'grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[6.5rem_1fr]'
        }`}
      >
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
              // Centred, not baseline-aligned: the forecast cell leads with a
              // 16px icon, and a baseline taken from it sat the cell low.
              className={`col-span-full grid grid-cols-subgrid items-center border-b border-border/60 px-4 py-2.5 last:border-b-0 ${
                isNext ? 'gpp-stripe bg-surface-elevated' : ''
              }`}
            >
              <dt
                className={`col-[1] text-sm ${isNext ? 'font-medium text-text' : 'text-text-muted'}`}
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
              {forecast &&
                (summary ? (
                  <dd className="col-[2] flex items-center gap-1.5 text-sm text-text-muted">
                    <WeatherIcon
                      conditionCode={summary.conditionCode}
                      className="h-4 w-4 shrink-0"
                    />
                    {/* The word is for the eye; the full line is what a
                        screen reader hears, since it cannot open the hours
                        on a glance. */}
                    <span className="sr-only">
                      {sessionWeatherLine(summary, { wind: true })}
                    </span>
                    <span aria-hidden>{weatherWord(summary)}</span>
                  </dd>
                ) : (
                  // A session with no forecast keeps a dash in the column.
                  <dd className="col-[2]">
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
                  </dd>
                ))}
              <dd
                className={`gpp-mono text-right text-sm whitespace-nowrap text-text ${
                  forecast ? 'col-[3]' : 'col-[2]'
                }`}
              >
                {forecast
                  ? formatTrackTimeShort(timestamp, activeTimeZone)
                  : formatTrackTime(timestamp, activeTimeZone)}
              </dd>
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
