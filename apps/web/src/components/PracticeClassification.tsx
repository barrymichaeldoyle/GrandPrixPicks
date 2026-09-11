import { useId, useState } from 'react';

import { PracticeClassificationDialog } from '@/components/PracticeClassificationDialog';
import { DriverBadge } from '@/components/DriverBadge';
import { practiceGapOrLap } from '@/components/PracticeResultsCard';
import { TabSwitch } from '@/components/TabSwitch';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  latestPracticeResult,
  PRACTICE_SESSION_LABELS,
  practiceSessionFact,
  publishedPracticeSessions,
  type PracticeResult,
  type PracticeResults,
  type PracticeSessionType,
} from '@/lib/practiceSessions';

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

/** Published practice sessions, with a top-six preview and full timing sheet. */
export function PracticeClassification({
  results,
  raceSlug,
}: {
  results: PracticeResults | undefined;
  raceSlug: string;
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
  const rest = selected.entries.slice(PRACTICE_COLLAPSED_ROWS);

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
      <table className="w-full table-fixed">
        <caption className="sr-only">
          {sessionLabel} classification, positions 1 to {top.length}.
        </caption>
        <tbody>
          {top.map((entry) => (
            <ClassificationRow key={entry.driverNumber} entry={entry} />
          ))}
        </tbody>
      </table>
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
        <caption>{sessionLabel} classification, remaining drivers</caption>
        <tbody>
          {rest.map((entry) => (
            <ClassificationRow key={entry.driverNumber} entry={entry} />
          ))}
        </tbody>
      </table>
      <PracticeClassificationDialog
        open={expanded}
        onClose={() => setExpanded(false)}
        results={sessions}
        initialSession={selected.sessionType}
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
      <div className="mt-7 overflow-hidden rounded-sm border border-border bg-surface">
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
    </section>
  );
}
