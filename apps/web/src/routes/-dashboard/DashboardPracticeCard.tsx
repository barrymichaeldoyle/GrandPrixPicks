import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { practiceGapOrLap } from '@/components/PracticeResultsCard';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';

import { liveOrSsr } from './dashboardState';

export type PracticeResults = FunctionReturnType<
  typeof api.practiceResults.getPracticeResultsForRace
>;

type PracticeEntry = PracticeResults[number]['entries'][number];

const SESSION_LABELS = { fp1: 'FP1', fp2: 'FP2', fp3: 'FP3' } as const;

/** How many rows the closed card shows: the classification's scoring-relevant top. */
const COLLAPSED_ROWS = 6;

/**
 * The session a returning player wants is the newest one, so FP3 wins over FP2
 * wins over FP1. Older sessions stay a link away rather than a tab: the
 * dashboard card reports what just happened, the practice page compares.
 */
export function latestPracticeResult(
  results: PracticeResults,
): PracticeResults[number] | null {
  return (
    (['fp3', 'fp2', 'fp1'] as const)
      .map((sessionType) =>
        results.find((result) => result.sessionType === sessionType),
      )
      .find((result) => result !== undefined) ?? null
  );
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

/**
 * The latest free practice classification, between the picks card and the
 * feed.
 *
 * Practice times already exist on the race page, but a returning player lands
 * here, and "what happened in FP2 while I was away" was a page away. The card
 * shows the top {@link COLLAPSED_ROWS} — the slice that informs a pick — and
 * discloses the rest in place, so checking the midfield does not cost a
 * navigation.
 *
 * Remaining rows stay mounted while closed: height 0, `inert`, `aria-hidden`.
 * That is the same disclosure as session results and the FAQ. Unmounting them
 * would make `aria-controls` point at nothing and would remount sixteen badges
 * on every expand. The closed height is still the default; opening is client
 * state only, not persisted, because six rows is the most this page should
 * spend on a session nobody scores points in.
 *
 * Renders from the SSR seed (`home.getDashboardPageData`) so it neither pops
 * in under the feed after hydration nor holds the auth curtain; the live
 * query then keeps it current while a session is being published.
 */
export function DashboardPracticeCard({
  raceId,
  raceSlug,
  initialResults,
}: {
  raceId: Id<'races'>;
  raceSlug: string;
  initialResults?: PracticeResults;
}) {
  const [expanded, setExpanded] = useState(false);
  const headingId = useId();
  const toggleId = useId();
  const panelId = useId();
  const results = liveOrSsr(
    useQuery(api.practiceResults.getPracticeResultsForRace, { raceId }),
    initialResults,
  );
  const latest = results ? latestPracticeResult(results) : null;
  // Most of the calendar has no published practice for the open weekend, and
  // then the card takes no space at all rather than showing an empty state.
  if (!latest || latest.entries.length === 0) {
    return null;
  }

  const sessionLabel = SESSION_LABELS[latest.sessionType];
  const leader = latest.entries.find((entry) => entry.position === 1);
  const top = latest.entries.slice(0, COLLAPSED_ROWS);
  const rest = latest.entries.slice(COLLAPSED_ROWS);
  // Two columns that read top-to-bottom in order (P7..P13 | P14..P20), same
  // split as the race page's compact sheet.
  const half = Math.ceil(rest.length / 2);
  const restColumns = [rest.slice(0, half), rest.slice(half)];

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      captureAnalyticsEvent('session_results_expanded', {
        race_slug: raceSlug,
        surface: 'dashboard',
      });
    }
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
            {leader
              ? `${sessionLabel} · ${leader.displayName} fastest`
              : sessionLabel}
          </span>
        </h2>
        <Link
          to="/races/$raceSlug/practice"
          params={{ raceSlug }}
          className="gpp-touch-target inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
        >
          Full lap times and gaps
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
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
                Show full results (P{COLLAPSED_ROWS + 1}–P
                {latest.entries.length})
              </>
            )}
          </button>
          {/*
            Kept mounted rather than conditionally rendered, matching session
            results and the FAQ: the panel is what `aria-controls` points at,
            and collapsing it is height 0 plus inert rather than deleting it.
            Height animates via grid-template-rows so nothing has to measure.
          */}
          <div
            id={panelId}
            role="region"
            aria-label={`Positions ${COLLAPSED_ROWS + 1} to ${latest.entries.length}`}
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
    </section>
  );
}
