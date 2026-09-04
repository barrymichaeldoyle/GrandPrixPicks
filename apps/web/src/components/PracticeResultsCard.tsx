import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from '@/integrations/convex/query';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { TabSwitch } from '@/components/TabSwitch';
import { captureAnalyticsEvent } from '@/lib/analytics';

type PracticeSessionType = 'fp1' | 'fp2' | 'fp3';
type CompetitiveSessionType = 'sprint_quali' | 'sprint' | 'quali';
type ResultsTab = PracticeSessionType | CompetitiveSessionType;

type PracticeResult = FunctionReturnType<
  typeof api.practiceResults.getPracticeResultsForRace
>[number];
type CompetitiveResult = FunctionReturnType<
  typeof api.results.getResultForRace
>;

const SESSION_LABELS: Record<PracticeSessionType, string> = {
  fp1: 'FP1',
  fp2: 'FP2',
  fp3: 'FP3',
};
const RESULTS_TAB_LABELS: Record<ResultsTab, string> = {
  ...SESSION_LABELS,
  sprint_quali: 'Sprint Quali',
  sprint: 'Sprint',
  quali: 'Quali',
};

export function formatLap(seconds?: number) {
  if (seconds === undefined) {
    return '—';
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
}

/** Leader's lap, or the gap behind them. The one number a compact row shows. */
export function practiceGapOrLap(entry: {
  position: number;
  bestLapSeconds?: number;
  gapToLeaderSeconds?: number;
}): string {
  if (entry.position === 1) {
    return formatLap(entry.bestLapSeconds);
  }
  return entry.gapToLeaderSeconds === undefined
    ? '\u2014'
    : `+${entry.gapToLeaderSeconds.toFixed(3)}`;
}

/**
 * Splits a classification down the middle so two columns read top-to-bottom in
 * order (P1..P11 | P12..P22) rather than snaking across the page. CSS columns
 * would do this too, but only after guessing a height for the container.
 */
function splitIntoColumns<T>(entries: T[]): [T[], T[]] {
  const half = Math.ceil(entries.length / 2);
  return [entries.slice(0, half), entries.slice(half)];
}

/** Position, driver, and the one number that matters: the gap, or the time at the front. */
export function CompactPracticeRow({
  entry,
}: {
  entry: PracticeResult['entries'][number];
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5">
      <span className="gpp-mono text-xs font-semibold text-text-muted">
        P{entry.position}
      </span>
      <DriverBadge
        code={entry.code}
        displayName={entry.displayName}
        team={entry.team ?? undefined}
        size="sm"
        prerenderTooltip={false}
      />
      <span className="gpp-mono text-right text-xs font-semibold text-text">
        {practiceGapOrLap(entry)}
      </span>
    </div>
  );
}

function CompactCompetitiveRow({
  position,
  code,
  displayName,
  team,
}: {
  position: number;
  code: string;
  displayName: string;
  team?: string;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 px-3 py-1.5">
      <span className="gpp-mono text-xs font-semibold text-text-muted">
        P{position}
      </span>
      <DriverBadge
        code={code}
        displayName={displayName}
        team={team}
        size="sm"
      />
    </div>
  );
}

/**
 * Two columns from `sm` up, one below it. The divider between them is a border
 * on the second column rather than a `divide-x` on the wrapper, so it does not
 * appear when the columns stack.
 */
function CompactColumns<T>({
  entries,
  getKey,
  renderRow,
}: {
  entries: T[];
  getKey: (entry: T) => string | number;
  renderRow: (entry: T) => ReactNode;
}) {
  const [left, right] = splitIntoColumns(entries);
  return (
    <div className="grid sm:grid-cols-2">
      <div className="divide-y divide-border">
        {left.map((entry) => (
          <div key={getKey(entry)}>{renderRow(entry)}</div>
        ))}
      </div>
      <div className="divide-y divide-border border-t border-border sm:border-t-0 sm:border-l">
        {right.map((entry) => (
          <div key={getKey(entry)}>{renderRow(entry)}</div>
        ))}
      </div>
    </div>
  );
}

function PracticeResultsTable({ result }: { result: PracticeResult }) {
  return (
    <div className="divide-y divide-border">
      {result.entries.map((entry) => (
        <div
          key={entry.driverNumber}
          className="grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_4.5rem_3.5rem] items-center gap-2 px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-text-muted">
            P{entry.position}
          </span>
          <DriverBadge
            code={entry.code}
            displayName={entry.displayName}
            team={entry.team ?? undefined}
            size="sm"
          />
          <span className="min-w-0 text-xs text-text-muted">
            {entry.isReserve ? (
              <span className="rounded-full border border-accent/40 px-1.5 py-0.5 font-semibold text-accent">
                Reserve
              </span>
            ) : entry.lapCount === undefined ? null : (
              `${entry.lapCount} laps`
            )}
          </span>
          <span className="gpp-mono text-right text-xs font-semibold text-text">
            {formatLap(entry.bestLapSeconds)}
          </span>
          <span className="text-right text-xs text-text-muted">
            {entry.position === 1
              ? 'Leader'
              : entry.gapToLeaderSeconds === undefined
                ? '—'
                : `+${entry.gapToLeaderSeconds.toFixed(3)}`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PracticeResultsPanel({
  results,
  initialSession,
  competitiveResults,
  layout = 'full',
}: {
  results: PracticeResult[];
  initialSession?: ResultsTab;
  competitiveResults?: Partial<
    Record<CompetitiveSessionType, CompetitiveResult>
  >;
  /**
   * `full` is the timing sheet: one row per driver with lap count, best lap and
   * gap. `compact` halves the height by dropping to two columns and the single
   * number a reader actually scans for, and is what the race page uses now that
   * the sheet sits below the picks as reference rather than as the headline.
   */
  layout?: 'full' | 'compact';
}) {
  const practiceSessions = (['fp1', 'fp2', 'fp3'] as const).filter(
    (sessionType) =>
      results.some((result) => result.sessionType === sessionType),
  );
  const availableCompetitiveSessions = (
    ['sprint_quali', 'sprint', 'quali'] as const
  ).filter((sessionType) => competitiveResults?.[sessionType]);
  const availableSessions: ResultsTab[] = [
    ...practiceSessions,
    ...availableCompetitiveSessions,
  ];
  const [selectedSessionState, setSelectedSession] = useState<ResultsTab>(
    initialSession ?? availableSessions[0] ?? 'fp1',
  );
  const selectedSession = availableSessions.includes(selectedSessionState)
    ? selectedSessionState
    : (availableSessions[0] ?? 'fp1');

  const selectedPractice = results.find(
    (result) => result.sessionType === selectedSession,
  );
  const selectedCompetitive =
    selectedSession === 'fp1' ||
    selectedSession === 'fp2' ||
    selectedSession === 'fp3'
      ? undefined
      : competitiveResults?.[selectedSession];
  if (!selectedPractice && !selectedCompetitive) {
    return (
      <p className="px-4 py-8 text-center text-sm text-text-muted">
        Practice results have not been published yet.
      </p>
    );
  }

  return (
    <>
      {availableSessions.length > 1 ? (
        <div className="border-b border-border p-2">
          <TabSwitch
            value={selectedSession}
            onChange={(session) => {
              setSelectedSession(session);
              captureAnalyticsEvent('session_results_tab_selected', {
                session_type: session,
              });
            }}
            options={availableSessions.map((sessionType) => ({
              value: sessionType,
              label: RESULTS_TAB_LABELS[sessionType],
            }))}
            className="flex gap-1"
            buttonClassName="flex-1"
            ariaLabel="Free practice session"
          />
        </div>
      ) : null}
      {selectedCompetitive ? (
        layout === 'compact' ? (
          <CompactColumns
            entries={selectedCompetitive.enrichedClassification}
            getKey={(entry) => entry.driverId}
            renderRow={(entry) => (
              <CompactCompetitiveRow
                position={entry.position}
                code={entry.code}
                displayName={entry.displayName}
                team={entry.team ?? undefined}
              />
            )}
          />
        ) : (
          <div className="divide-y divide-border">
            {selectedCompetitive.enrichedClassification.map((entry) => (
              <div
                key={entry.driverId}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-2 px-4 py-2.5"
              >
                <span className="text-sm font-semibold text-text-muted">
                  P{entry.position}
                </span>
                <DriverBadge
                  code={entry.code}
                  displayName={entry.displayName}
                  team={entry.team ?? undefined}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )
      ) : selectedPractice ? (
        layout === 'compact' ? (
          <CompactColumns
            entries={selectedPractice.entries}
            getKey={(entry) => entry.driverNumber}
            renderRow={(entry) => <CompactPracticeRow entry={entry} />}
          />
        ) : (
          <PracticeResultsTable result={selectedPractice} />
        )
      ) : null}
    </>
  );
}

/** "FP3 · Norris fastest" — enough to decide whether it is worth opening. */
function summarise(results: PracticeResult[]): string | null {
  const latest = (['fp3', 'fp2', 'fp1'] as const)
    .map((sessionType) =>
      results.find((result) => result.sessionType === sessionType),
    )
    .find((result) => result !== undefined);
  if (!latest) {
    return null;
  }
  const leader = latest.entries.find((entry) => entry.position === 1);
  if (!leader) {
    return SESSION_LABELS[latest.sessionType];
  }
  return `${SESSION_LABELS[latest.sessionType]} · ${leader.displayName} fastest`;
}

/**
 * The weekend's timing sheets, closed.
 *
 * This used to render open, above the picks, as a full-width twenty-two row
 * classification. That put the least urgent thing on the page in front of the
 * most urgent one: someone landing here wants to make or check their picks,
 * and practice times are what you consult *while* deciding, not what you came
 * for. So it sits at the bottom now, shut, behind a summary line that says
 * whether there is anything new in it.
 *
 * Opening is client state only, deliberately not persisted: the default is the
 * one that keeps the page short, and a reader who wants the full sheet has the
 * practice page linked inside.
 */
export function PracticeResultsCard({
  raceId,
  raceSlug,
}: {
  raceId: Id<'races'>;
  raceSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const results = useQuery(api.practiceResults.getPracticeResultsForRace, {
    raceId,
  });
  if (!results || results.length === 0) {
    return null;
  }

  const summary = summarise(results);

  return (
    <section
      className="mt-5 overflow-hidden rounded-sm border border-border bg-surface-elevated"
      data-testid="practice-results"
    >
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            captureAnalyticsEvent('session_results_expanded', {
              race_slug: raceSlug,
            });
          }
        }}
        aria-expanded={open}
        aria-controls="session-results-panel"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted/40"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-label text-text-muted uppercase">
            Session results
          </span>
          <span className="mt-0.5 block truncate text-sm font-semibold text-text">
            {summary ?? 'Practice, sprint and qualifying times'}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent">
          {open ? 'Hide' : 'Show'}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {open ? (
        <div id="session-results-panel" className="border-t border-border">
          <PracticeResultsPanel results={results} layout="compact" />
          <div className="border-t border-border px-4 py-2.5 text-right">
            <Link
              to="/races/$raceSlug/practice"
              params={{ raceSlug }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
            >
              Full lap times and gaps
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
