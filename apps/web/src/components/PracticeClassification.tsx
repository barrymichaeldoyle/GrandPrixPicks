import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { practiceGapOrLap } from '@/components/PracticeResultsCard';
import { TabSwitch } from '@/components/TabSwitch';
import { captureAnalyticsEvent } from '@/lib/analytics';

export type PracticeResults = FunctionReturnType<
  typeof api.practiceResults.getPracticeResultsForRace
>;

type PracticeEntry = PracticeResults[number]['entries'][number];
type PracticeSessionType = PracticeResults[number]['sessionType'];

const SESSION_LABELS = { fp1: 'FP1', fp2: 'FP2', fp3: 'FP3' } as const;

/** Friday morning to Saturday morning, the order the sessions ran in. */
const SESSION_ORDER = ['fp1', 'fp2', 'fp3'] as const;

/** How many rows the closed card shows: the classification's scoring-relevant top. */
const PRACTICE_COLLAPSED_ROWS = 6;

/**
 * The session a returning player wants first is the newest one, so FP3 wins
 * over FP2 wins over FP1. On the dashboard card that is the only session shown;
 * the write-up puts the earlier ones behind tabs.
 */
export function latestPracticeResult(
  results: PracticeResults,
): PracticeResults[number] | null {
  return (
    [...SESSION_ORDER]
      .reverse()
      .map((sessionType) =>
        results.find((result) => result.sessionType === sessionType),
      )
      .find((result) => result !== undefined) ?? null
  );
}

/** Published sessions in the order they ran, so the tabs read FP1, FP2, FP3. */
function publishedPracticeSessions(
  results: PracticeResults,
): PracticeResults[number][] {
  return SESSION_ORDER.flatMap((sessionType) => {
    const result = results.find(
      (candidate) =>
        candidate.sessionType === sessionType && candidate.entries.length > 0,
    );
    return result ? [result] : [];
  });
}

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

function PracticePageLink({ raceSlug }: { raceSlug: string }) {
  return (
    <Link
      to="/races/$raceSlug/practice"
      params={{ raceSlug }}
      className="gpp-touch-target inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover sm:text-sm"
    >
      Full lap times and gaps
      <ExternalLink className="h-3 w-3" aria-hidden />
    </Link>
  );
}

/**
 * Free practice, closed on the top six, with the rest disclosed in place.
 *
 * `card` is the dashboard chrome: a bordered block with a micro "Practice"
 * label, showing the newest session only, because a returning player wants the
 * freshest fact and the card has to stay short. `section` is the write-up: the
 * same table under a page heading, next to "What changed this weekend" at the
 * same type scale, and there every published session gets a tab. FP1 at a
 * low-drag circuit is not FP2 with different fuel and a rookie in four of the
 * cars, and a write-up is read on Friday night as well as Saturday.
 *
 * Remaining rows stay mounted while closed (height 0, `inert`, `aria-hidden`).
 * On a public write-up that is also what lets crawlers index a 22-car
 * classification rather than a six-car one.
 */
export function PracticeClassification({
  results,
  raceSlug,
  layout,
  analyticsSurface,
}: {
  results: PracticeResults | undefined;
  raceSlug: string;
  layout: 'card' | 'section';
  analyticsSurface: 'dashboard' | 'writeup';
}) {
  const [expanded, setExpanded] = useState(false);
  // `null` follows the newest session, so a page left open on the default tab
  // moves to FP2 when FP2 publishes. Choosing a tab pins it.
  const [pinnedSession, setPinnedSession] =
    useState<PracticeSessionType | null>(null);
  const headingId = useId();
  const toggleId = useId();
  const panelId = useId();
  const tablesId = useId();
  const tabsId = `${useId().replaceAll(':', '')}-practice-tabs`;
  const sessions = results ? publishedPracticeSessions(results) : [];
  const newest = sessions.at(-1);
  if (!newest) {
    return null;
  }

  const showTabs = layout === 'section' && sessions.length > 1;
  const selected =
    (showTabs && pinnedSession
      ? sessions.find((session) => session.sessionType === pinnedSession)
      : undefined) ?? newest;

  const sessionLabel = SESSION_LABELS[selected.sessionType];
  const leader = selected.entries.find((entry) => entry.position === 1);
  const fact = leader
    ? `${sessionLabel} · ${leader.displayName} fastest`
    : sessionLabel;
  const top = selected.entries.slice(0, PRACTICE_COLLAPSED_ROWS);
  const rest = selected.entries.slice(PRACTICE_COLLAPSED_ROWS);
  const half = Math.ceil(rest.length / 2);
  const restColumns = [rest.slice(0, half), rest.slice(half)];

  function selectSession(sessionType: PracticeSessionType) {
    setPinnedSession(sessionType);
    captureAnalyticsEvent('session_results_tab_selected', {
      session_type: sessionType,
      race_slug: raceSlug,
      surface: analyticsSurface,
    });
  }

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      captureAnalyticsEvent('session_results_expanded', {
        race_slug: raceSlug,
        surface: analyticsSurface,
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
      {rest.length > 0 ? (
        <>
          <button
            id={toggleId}
            type="button"
            onClick={toggleExpanded}
            aria-expanded={expanded}
            aria-controls={panelId}
            className="gpp-touch-target flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-sm text-text-muted transition-colors hover:text-text pointer-coarse:min-h-11"
          >
            {expanded ? (
              <>
                <ChevronUp size={14} aria-hidden />
                Hide full results
              </>
            ) : (
              <>
                <ChevronDown size={14} aria-hidden />
                {`Show full results (P${PRACTICE_COLLAPSED_ROWS + 1}–P${selected.entries.length})`}
              </>
            )}
          </button>
          <div
            id={panelId}
            role="region"
            aria-label={`Positions ${PRACTICE_COLLAPSED_ROWS + 1} to ${selected.entries.length}`}
            aria-hidden={!expanded}
            inert={!expanded}
            className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-200 ease-out ${
              expanded
                ? 'grid-rows-[1fr] opacity-100'
                : 'pointer-events-none grid-rows-[0fr] opacity-0'
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid border-t border-border sm:grid-cols-2">
                {restColumns.map((column, index) => (
                  <table
                    key={index}
                    className={`w-full table-fixed ${
                      index === 1
                        ? 'border-t border-border sm:border-t-0 sm:border-l'
                        : ''
                    }`}
                  >
                    <caption className="sr-only">
                      {sessionLabel} classification, remaining finishers (part{' '}
                      {index + 1} of {restColumns.length}).
                    </caption>
                    <tbody>
                      {column.map((entry) => (
                        <ClassificationRow
                          key={entry.driverNumber}
                          entry={entry}
                        />
                      ))}
                    </tbody>
                  </table>
                ))}
              </div>
              <button
                type="button"
                onClick={toggleExpanded}
                className="gpp-touch-target flex w-full items-center justify-center gap-1.5 border-t border-border py-2 text-sm text-text-muted transition-colors hover:text-text pointer-coarse:min-h-11"
              >
                <ChevronUp size={14} aria-hidden />
                Hide full results
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );

  if (layout === 'section') {
    return (
      <section
        aria-labelledby={headingId}
        data-testid="weekend-practice"
        className="py-8 sm:py-16"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h2
            id={headingId}
            className="font-title text-2xl font-medium text-text sm:text-3xl"
          >
            Free practice
          </h2>
          <PracticePageLink raceSlug={raceSlug} />
        </div>
        <p className="mt-2 text-sm font-semibold text-text">{fact}</p>
        <div className="mt-7 overflow-hidden rounded-sm border border-border bg-surface">
          {showTabs ? (
            <div className="border-b border-border p-2">
              <TabSwitch
                value={selected.sessionType}
                onChange={selectSession}
                options={sessions.map((session) => ({
                  value: session.sessionType,
                  label: SESSION_LABELS[session.sessionType],
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

  return (
    <section
      aria-labelledby={headingId}
      data-testid="dashboard-practice"
      className="overflow-hidden rounded-sm border border-border bg-surface-elevated"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id={headingId} className="min-w-0">
          <span className="gpp-label block text-text-muted">Practice</span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-text">
            {fact}
          </span>
        </h2>
        <PracticePageLink raceSlug={raceSlug} />
      </div>
      {tables}
    </section>
  );
}
