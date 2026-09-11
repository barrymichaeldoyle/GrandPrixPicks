import { useState, type ReactNode } from 'react';

import { PracticeClassificationDialog } from '@/components/PracticeClassificationDialog';
import {
  CompactColumns,
  CompactPracticeRow,
} from '@/components/PracticeResultsCard';
import { SessionWeatherFact } from '@/components/weather/WeatherSessionLine';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  latestPracticeResult,
  PRACTICE_SESSION_LABELS,
  publishedPracticeSessions,
  type PracticeResult,
  type PracticeResults,
  type PracticeSessionType,
  type TrackSessionSchedule,
} from '@/lib/practiceSessions';
import { weatherForSession, type RaceWeather } from '@/lib/weatherPresentation';

/** The scoring-relevant top of a classification, and all a highlight shows. */
const HIGHLIGHT_ROWS = 6;

function HighlightRow({ entry }: { entry: PracticeResult['entries'][number] }) {
  return <CompactPracticeRow entry={entry} size="md" fill="sunken" />;
}

function practiceWeatherFact(
  weather: RaceWeather | null | undefined,
  schedule: TrackSessionSchedule | undefined,
  raceSlug: string | undefined,
  sessionType: PracticeSessionType,
) {
  if (!weather || !schedule || !raceSlug) {
    return null;
  }
  if (weather.forecast.raceSlug !== raceSlug) {
    return null;
  }
  const resolved = weatherForSession(weather.forecast, schedule, sessionType);
  if (!resolved) {
    return null;
  }
  return (
    <SessionWeatherFact
      summary={resolved.summary}
      isStale={weather.isStale}
      label={PRACTICE_SESSION_LABELS[sessionType]}
    />
  );
}

function SessionColumn({
  result,
  labelled,
  weatherFact,
  splitPad,
}: {
  result: PracticeResult;
  /** False when the card header already names the only session. */
  labelled: boolean;
  weatherFact?: ReactNode;
  /** Room for the accent split so the times do not sit on the bar. */
  splitPad?: 'start' | 'end';
}) {
  const pad =
    splitPad === 'end' ? 'sm:pr-2' : splitPad === 'start' ? 'sm:pl-2' : '';
  const top = result.entries.slice(0, HIGHLIGHT_ROWS);
  const rows = labelled ? (
    <div className="divide-y divide-border">
      {top.map((entry) => (
        <HighlightRow key={entry.driverNumber} entry={entry} />
      ))}
    </div>
  ) : (
    // One session, full width: the compact row is a badge and a time, which
    // is a two-column list, not a six-row empty middle.
    <CompactColumns
      entries={top}
      getKey={(entry) => entry.driverNumber}
      renderRow={(entry) => <HighlightRow entry={entry} />}
    />
  );
  return (
    <div className={pad}>
      {labelled ? (
        <div className="flex items-center justify-between gap-2 px-4 py-1.5">
          <p className="text-xs font-medium text-text">
            {PRACTICE_SESSION_LABELS[result.sessionType]}
          </p>
          {weatherFact}
        </div>
      ) : null}
      {rows}
    </div>
  );
}

/**
 * Pair sessions so a two-up row can take the house stripe down the middle.
 *
 * A hairline between FP1 and FP2 did not split them: two six-row stacks just
 * looked like one list that wrapped. `.gpp-column-split` is the same cut the
 * compact classification already uses between P1–P11 and P12–P22.
 */
function pairSessions(sessions: PracticeResult[]): PracticeResult[][] {
  const pairs: PracticeResult[][] = [];
  for (let index = 0; index < sessions.length; index += 2) {
    pairs.push(sessions.slice(index, index + 2));
  }
  return pairs;
}

/**
 * Every published practice session's top six, side by side, on the dashboard.
 *
 * This block sits between the picks card and the feed, where a player is
 * scanning rather than studying, so it answers one question per session: who
 * was quick. The full classification is one dialog off the card, not a
 * second page: the old practice URL 301s to the race page now, and the sheet
 * already tabs between sessions.
 *
 * Columns follow the weekend: FP1, then FP2. P1 in each column is who was
 * quick; the header does not say it again.
 *
 * On a phone it bleeds like the picks card and the news block, and sits
 * flush against them: a nested frame here was a card sitting in the gutter
 * between two full-bleed neighbours. `-mt-px` collapses the two hairlines
 * that would otherwise stack where this block meets the one above it.
 */
export function PracticeHighlights({
  results,
  raceName,
  raceSlug,
  race,
  weather,
}: {
  results: PracticeResults | undefined;
  raceName?: string;
  raceSlug?: string;
  race?: TrackSessionSchedule;
  weather?: RaceWeather | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const sessions = publishedPracticeSessions(results);
  const latest = latestPracticeResult(results);
  if (!latest) {
    return null;
  }

  const multi = sessions.length > 1;
  const latestSessionType = latest.sessionType;

  function openFullResults() {
    setDialogOpen(true);
    if (raceSlug) {
      captureAnalyticsEvent('session_results_expanded', {
        race_slug: raceSlug,
        surface: 'dashboard',
        session_type: latestSessionType,
      });
    }
  }

  const loneWeather = multi
    ? null
    : practiceWeatherFact(weather, race, raceSlug, latestSessionType);

  return (
    <section
      aria-labelledby="dashboard-practice-heading"
      data-testid="dashboard-practice"
      className="overflow-hidden border-y border-border/80 bg-surface max-md:-mx-4 max-md:-mt-px md:rounded-sm md:border"
    >
      {/* No rule under the heading: the classification already divides on
          every row, and a second line between the title and P1 was one HR
          more than the block needed. */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <h2
          id="dashboard-practice-heading"
          className="text-xs font-medium text-accent"
        >
          Practice
        </h2>
        <div className="flex items-center gap-3">
          {loneWeather}
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={openFullResults}
            className="gpp-touch-target shrink-0 text-sm text-text-muted hover:text-text"
          >
            Full results
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-y-4 sm:gap-y-0">
        {pairSessions(sessions).map((pair) => {
          const split = pair.length === 2;
          return (
            <div
              key={pair[0]!.sessionType}
              className={
                split
                  ? 'grid grid-cols-1 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-y-0'
                  : undefined
              }
            >
              <SessionColumn
                result={pair[0]!}
                labelled={multi}
                splitPad={split ? 'end' : undefined}
                weatherFact={practiceWeatherFact(
                  weather,
                  race,
                  raceSlug,
                  pair[0]!.sessionType,
                )}
              />
              {split ? (
                <div className="gpp-column-split hidden sm:block" aria-hidden />
              ) : null}
              {pair[1] ? (
                <SessionColumn
                  result={pair[1]}
                  labelled={multi}
                  splitPad="start"
                  weatherFact={practiceWeatherFact(
                    weather,
                    race,
                    raceSlug,
                    pair[1].sessionType,
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {dialogOpen ? (
        <PracticeClassificationDialog
          open
          onClose={() => setDialogOpen(false)}
          results={sessions}
          initialSession={latestSessionType}
          raceName={raceName}
          raceSlug={raceSlug}
        />
      ) : null}
    </section>
  );
}
