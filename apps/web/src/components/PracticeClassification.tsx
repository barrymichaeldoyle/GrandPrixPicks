import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { useId, useState } from 'react';

import { PracticeClassificationDialog } from '@/components/PracticeClassificationDialog';
import { DriverBadge } from '@/components/DriverBadge';
import {
  CompactColumns,
  CompactPracticeRow,
  practiceGapOrLap,
} from '@/components/PracticeResultsCard';
import { TabSwitch } from '@/components/TabSwitch';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { formatSessionClockTime, useMinuteCountdown } from '@/lib/date';
import {
  latestPracticeResult,
  nextTrackSession,
  PRACTICE_SESSION_LABELS,
  practiceSessionFact,
  publishedPracticeSessions,
  type PracticeResult,
  type PracticeResults,
  type PracticeSessionType,
  type TrackSessionSchedule,
} from '@/lib/practiceSessions';
import { useSessionTimeView } from '@/lib/sessionTimeView';
import { useNow } from '@/lib/testing/now';

type PracticeEntry = PracticeResult['entries'][number];

/** How many rows the closed table shows: the classification's scoring-relevant top. */
const PRACTICE_COLLAPSED_ROWS = 6;

function ClassificationRow({ entry }: { entry: PracticeEntry }) {
  return (
    <tr className="border-b border-border last:border-0">
      <th
        scope="row"
        className="gpp-mono w-14 px-3 py-1.5 text-left text-xs font-semibold text-text-muted"
      >
        P{entry.position}
      </th>
      <td className="min-w-0 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <DriverBadge
            code={entry.code}
            displayName={entry.displayName}
            team={entry.team ?? undefined}
            size="sm"
            prerenderTooltip={false}
          />
          <span className="min-w-0 truncate text-sm text-text">
            {entry.displayName}
          </span>
        </div>
      </td>
      <td className="gpp-mono w-20 px-3 py-1.5 text-right text-xs font-semibold text-text">
        {practiceGapOrLap(entry)}
      </td>
    </tr>
  );
}

function NextSessionNote({
  schedule,
  published,
  raceSlug,
}: {
  schedule: TrackSessionSchedule | undefined;
  published: readonly PracticeSessionType[];
  raceSlug: string;
}) {
  const now = useNow();
  const next = nextTrackSession(schedule, published, now);
  const trackTimeZone = getCircuitForRace(raceSlug)?.timeZone;
  const { activeTimeZone } = useSessionTimeView(trackTimeZone ?? 'UTC');
  const countdown = useMinuteCountdown(next?.startAt ?? 0);
  if (!next?.practiceSession) {
    return null;
  }
  const clock = trackTimeZone
    ? formatSessionClockTime(next.startAt, activeTimeZone)
    : null;
  const live = next.status === 'live' || countdown === 'Started';
  const spoken = live
    ? `${next.label} is underway`
    : clock
      ? `${next.label} ${clock} in ${countdown}`
      : `${next.label} in ${countdown}`;
  return (
    <div
      aria-label={spoken}
      className="gpp-stripe mt-3 overflow-hidden rounded-sm border border-border bg-surface px-4 py-3"
    >
      <p className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-title text-base font-medium text-text">
            {next.label}
          </span>
          {clock ? (
            <span className="gpp-mono text-xs text-text-muted">{clock}</span>
          ) : null}
        </span>
        <span className="gpp-mono shrink-0 text-sm font-semibold text-text">
          {live ? 'Underway' : countdown}
        </span>
      </p>
    </div>
  );
}

/** Published practice sessions, with a top-six preview and full timing sheet. */
export function PracticeClassification({
  results,
  raceSlug,
  schedule,
}: {
  results: PracticeResults | undefined;
  raceSlug: string;
  schedule?: TrackSessionSchedule;
}) {
  const [expanded, setExpanded] = useState(false);
  // `null` follows the newest session, so a page left open on the default tab
  // moves to FP2 when FP2 publishes. Choosing a tab pins it.
  const [pinnedSession, setPinnedSession] =
    useState<PracticeSessionType | null>(null);
  const headingId = useId();
  const tablesId = useId();
  const tabsId = `${useId().replaceAll(':', '')}-practice-tabs`;
  const sessions = publishedPracticeSessions(results);
  const newest = latestPracticeResult(results);
  if (!newest) {
    return null;
  }

  const showTabs = sessions.length > 1;
  const selected =
    (pinnedSession
      ? sessions.find((session) => session.sessionType === pinnedSession)
      : undefined) ?? newest;

  const sessionLabel = PRACTICE_SESSION_LABELS[selected.sessionType];
  const top = selected.entries.slice(0, PRACTICE_COLLAPSED_ROWS);

  function selectSession(sessionType: PracticeSessionType) {
    setPinnedSession(sessionType);
    captureAnalyticsEvent('session_results_tab_selected', {
      session_type: sessionType,
      race_slug: raceSlug,
      surface: 'writeup',
    });
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      captureAnalyticsEvent('session_results_expanded', {
        race_slug: raceSlug,
        surface: 'writeup',
      });
    }
  }

  const tables = (
    <>
      <CompactColumns
        entries={top}
        getKey={(entry) => entry.driverNumber}
        renderRow={(entry) => (
          <CompactPracticeRow entry={entry} size="md" fill="sunken" />
        )}
      />
      <button
        type="button"
        onClick={toggleExpanded}
        aria-haspopup="dialog"
        className="gpp-touch-target flex min-h-11 w-full items-center justify-center border-t border-border py-2 text-sm text-text-muted hover:text-text"
      >
        View full results
      </button>
      {/* Keep the complete classification in the server-rendered article. */}
      <table hidden>
        <caption>{sessionLabel} classification</caption>
        <tbody>
          {selected.entries.map((entry) => (
            <ClassificationRow key={entry.driverNumber} entry={entry} />
          ))}
        </tbody>
      </table>
      <PracticeClassificationDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        results={sessions}
        initialSession={selected.sessionType}
        raceName={schedule?.name}
        raceSlug={raceSlug}
      />
    </>
  );

  return (
    <section
      aria-labelledby={headingId}
      data-testid="weekend-practice"
      className="py-8 sm:py-16"
    >
      <h2
        id={headingId}
        className="font-title text-2xl font-medium text-text sm:text-3xl"
      >
        Free practice
      </h2>
      <p className="mt-2 text-sm font-semibold text-text">
        {practiceSessionFact(selected)}
      </p>
      <div className="mt-7">
        <div className="overflow-hidden rounded-sm border border-border bg-surface">
          {showTabs ? (
            <div className="border-b border-border p-2">
              <TabSwitch
                value={selected.sessionType}
                onChange={selectSession}
                options={sessions.map((session) => ({
                  value: session.sessionType,
                  label: PRACTICE_SESSION_LABELS[session.sessionType],
                }))}
                className="flex gap-1"
                buttonClassName="flex-1"
                ariaLabel="Free practice session"
                id={tabsId}
                panelId={tablesId}
              />
            </div>
          ) : null}
          <div
            id={tablesId}
            role={showTabs ? 'tabpanel' : undefined}
            aria-labelledby={
              showTabs ? `${tabsId}-${selected.sessionType}` : undefined
            }
          >
            {tables}
          </div>
        </div>
        <NextSessionNote
          schedule={schedule}
          published={sessions.map((session) => session.sessionType)}
          raceSlug={raceSlug}
        />
      </div>
    </section>
  );
}
