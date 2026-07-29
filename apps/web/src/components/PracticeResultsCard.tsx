import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from 'convex/react';
import { ExternalLink } from 'lucide-react';
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

function formatLap(seconds?: number) {
  if (seconds === undefined) {
    return '—';
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(3).padStart(6, '0')}`;
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
}: {
  results: PracticeResult[];
  initialSession?: ResultsTab;
  competitiveResults?: Partial<
    Record<CompetitiveSessionType, CompetitiveResult>
  >;
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
      ) : selectedPractice ? (
        <PracticeResultsTable result={selectedPractice} />
      ) : null}
    </>
  );
}

export function PracticeResultsCard({
  raceId,
  raceSlug,
}: {
  raceId: Id<'races'>;
  raceSlug: string;
}) {
  const results = useQuery(api.practiceResults.getPracticeResultsForRace, {
    raceId,
  });
  if (!results || results.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-5 overflow-hidden rounded-sm border border-border bg-surface-elevated"
      data-testid="practice-results"
    >
      <div className="flex items-end justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            Practice
          </p>
          <h2 className="mt-0.5 text-xl font-semibold text-text">
            Free Practice Results
          </h2>
        </div>
        <Link
          to="/races/$raceSlug/practice"
          params={{ raceSlug }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
        >
          Full page
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <PracticeResultsPanel results={results} />
    </section>
  );
}
