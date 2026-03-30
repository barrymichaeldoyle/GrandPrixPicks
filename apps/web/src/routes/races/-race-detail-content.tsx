import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleX,
  Pencil,
  Swords,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { DriverBadge } from '../../components/DriverBadge';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { H2HMatchupGrid } from '../../components/H2HMatchupGrid';
import { H2HWeekendSummary } from '../../components/H2HWeekendSummary';
import { InlineLoader } from '../../components/InlineLoader';
import { RandomizeButton } from '../../components/RandomizeButton';
import { Tooltip } from '../../components/Tooltip';
import { getRaceSessionLockAt } from '../../lib/raceSessions';
import type { SessionType } from '../../lib/sessions';
import { SESSION_LABELS } from '../../lib/sessions';
import { useNow } from '../../lib/testing/now';

// ───────────────────────── H2H Sections ─────────────────────────

interface H2HSectionProps {
  race: Doc<'races'>;
  selectedSession: SessionType;
  /** When provided, section is controlled by parent (e.g. to hide other section while editing). */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
  /** When true, show Randomize button in this section (Top 5 done, H2H still needed). */
  showRandomizeButton?: boolean;
  hasPredictions?: boolean;
  hasH2HPredictions?: boolean;
  onEditingDirtyChange?: (dirty: boolean) => void;
  hasUnsavedEditingChanges?: boolean;
}

export function H2HSection({
  race,
  selectedSession,
  editingSession: controlledEditing,
  onEditingSessionChange,
  showRandomizeButton,
  hasPredictions,
  hasH2HPredictions,
  onEditingDirtyChange,
  hasUnsavedEditingChanges = false,
}: H2HSectionProps) {
  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );
  const editingSession =
    onEditingSessionChange !== undefined
      ? (controlledEditing ?? null)
      : internalEditing;
  const setEditingSession = onEditingSessionChange ?? setInternalEditing;
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});
  const now = useNow();
  const selectedSessionLockTime = getRaceSessionLockAt(race, selectedSession);
  const selectedSessionLocked = now >= selectedSessionLockTime;
  const isLoadingPredictions =
    h2hPredictions === undefined || matchups === undefined;
  const canEditSelectedSession = Boolean(
    !isLoadingPredictions && hasH2HPredictions && !selectedSessionLocked,
  );
  const selectedSessionHasH2H =
    !isLoadingPredictions && h2hPredictions?.[selectedSession] != null;
  const shouldHighlightIncompleteH2H = Boolean(
    !isLoadingPredictions &&
    hasPredictions &&
    !selectedSessionHasH2H &&
    !selectedSessionLocked,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            <span className="sm:hidden">H2H Predictions</span>
            <span className="hidden sm:inline">Head-to-Head Predictions</span>
          </h2>
          {shouldHighlightIncompleteH2H ? (
            <Badge variant="locked" icon={<CircleAlert size={14} />}>
              H2H picks incomplete
            </Badge>
          ) : null}
          {hasH2HPredictions && (
            <>
              {editingSession ? (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={CircleX}
                  onClick={() => {
                    if (hasUnsavedEditingChanges) {
                      const confirmStop = window.confirm(
                        'You have unsaved H2H changes. Stop editing and discard them?',
                      );
                      if (!confirmStop) {
                        return;
                      }
                    }
                    setEditingSession(null);
                  }}
                  title={`Stop editing ${SESSION_LABELS[selectedSession]} predictions`}
                >
                  Stop Editing
                </Button>
              ) : canEditSelectedSession ? (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={Pencil}
                  onClick={() => setEditingSession(selectedSession)}
                  title={`Edit ${SESSION_LABELS[selectedSession]} Predictions`}
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              ) : (
                <Tooltip content="This session has started — predictions can't be changed">
                  <span className="inline-flex">
                    <Badge variant="locked" />
                  </span>
                </Tooltip>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showRandomizeButton &&
            hasPredictions !== undefined &&
            hasH2HPredictions !== undefined && (
              <RandomizeButton
                raceId={race._id}
                hasPredictions={hasPredictions}
                hasH2HPredictions={hasH2HPredictions}
              />
            )}
        </div>
      </div>

      {shouldHighlightIncompleteH2H ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-3 text-sm text-text">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <CircleAlert className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="font-medium text-text">
              Your Top 5 picks were recorded.
            </p>
            <p className="text-text-muted">
              You still need to submit your {SESSION_LABELS[selectedSession]}{' '}
              H2H picks before this session starts.
            </p>
          </div>
        </div>
      ) : null}

      <ErrorBoundary>
        {isLoadingPredictions ? (
          <InlineLoader />
        ) : (
          <H2HWeekendSummary
            race={race}
            h2hPredictions={h2hPredictions}
            matchups={matchups}
            selectedSession={selectedSession}
            editingSession={editingSession}
            onEditingSessionChange={setEditingSession}
            onEditingDirtyChange={onEditingDirtyChange}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}

interface H2HResultsSectionProps {
  raceId: Id<'races'>;
  selectedSession: SessionType;
}

function SessionBreakdownPillShell({
  label,
  variant,
  value,
}: {
  label: ReactNode;
  variant: 'default' | 'emphasis';
  value: ReactNode;
}) {
  const shellClassName =
    variant === 'emphasis'
      ? 'border border-accent/40 bg-accent-muted/30'
      : 'border border-border bg-surface';

  return (
    <div
      className={`w-full rounded-lg px-3 py-1.5 text-sm sm:w-auto ${shellClassName}`}
    >
      <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto sm:justify-start sm:gap-2">
        <span className="min-w-0 shrink text-xs text-text-muted">{label}</span>
        {value}
      </div>
    </div>
  );
}

function SessionBreakdownStatPill({
  label,
  points,
}: {
  label: string;
  points: number;
}) {
  return (
    <SessionBreakdownPillShell
      label={label}
      variant="default"
      value={
        <div className="leading-tight font-semibold text-accent">
          +{points} pts
        </div>
      }
    />
  );
}

function SessionBreakdownH2HStatPill({
  points,
  correctPicks,
  totalPicks,
}: {
  points: number;
  correctPicks: number;
  totalPicks: number;
}) {
  return (
    <SessionBreakdownPillShell
      label={
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
          <span>H2H</span>
          <span>
            {correctPicks}/{totalPicks} correct
          </span>
        </span>
      }
      variant="default"
      value={
        <div className="leading-tight font-semibold text-accent">
          +{points} pts
        </div>
      }
    />
  );
}

function SessionBreakdownSessionGainPill({ points }: { points: number }) {
  return (
    <SessionBreakdownPillShell
      label="Session Gain"
      variant="emphasis"
      value={
        <div className="leading-tight font-bold text-accent">+{points} pts</div>
      }
    />
  );
}

export function H2HResultsSection({
  raceId,
  selectedSession,
}: H2HResultsSectionProps) {
  const drivers = useQuery(api.drivers.listDrivers);
  const availableSessions = useQuery(api.results.getAllResultsForRace, {
    raceId,
  });
  const selectedTop5Result = useQuery(api.results.getResultForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const myTop5Predictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId,
  });
  const myTop5Scores = useQuery(api.results.getMyScoresForRace, {
    raceId,
  });
  const h2hResults = useQuery(api.h2h.getH2HResultsForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const myH2HScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const myH2HQualiScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: 'quali',
  });
  const myH2HSprintQualiScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: 'sprint_quali',
  });
  const myH2HSprintScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: 'sprint',
  });
  const myH2HRaceScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: 'race',
  });
  const myH2HPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId,
  });

  const [fullResultsExpanded, setFullResultsExpanded] = useState(false);

  const sessionHasResults = new Set(availableSessions ?? []);
  const isSelectedSessionScored = sessionHasResults.has(selectedSession);

  const top5PointsBySession: Record<SessionType, number> = {
    quali: myTop5Scores?.quali?.points ?? 0,
    sprint_quali: myTop5Scores?.sprint_quali?.points ?? 0,
    sprint: myTop5Scores?.sprint?.points ?? 0,
    race: myTop5Scores?.race?.points ?? 0,
  };

  const h2hPointsBySession: Record<SessionType, number> = {
    quali: myH2HQualiScore?.points ?? 0,
    sprint_quali: myH2HSprintQualiScore?.points ?? 0,
    sprint: myH2HSprintScore?.points ?? 0,
    race: myH2HRaceScore?.points ?? 0,
  };

  const selectedTop5Points = top5PointsBySession[selectedSession];
  const selectedH2HPoints = h2hPointsBySession[selectedSession];
  const sessionPointsGain = selectedTop5Points + selectedH2HPoints;

  const driverById = new Map(drivers?.map((driver) => [driver._id, driver]));
  const selectedTop5Picks = myTop5Predictions?.predictions[selectedSession];
  const top5Breakdown =
    myTop5Scores?.[selectedSession]?.enrichedBreakdown ?? [];
  const selectedSessionPicks = myH2HPredictions?.[selectedSession] ?? null;

  const top5ByPredictedPosition = new Map(
    top5Breakdown.map((b) => [b.predictedPosition, b]),
  );

  const classificationRows = selectedTop5Result?.enrichedClassification ?? [];
  const scoringRows = classificationRows.slice(0, 6);
  const remainingRows = classificationRows.slice(6);
  const remainingMidpoint = Math.ceil(remainingRows.length / 2);
  const remainingColumns = [
    remainingRows.slice(0, remainingMidpoint),
    remainingRows.slice(remainingMidpoint),
  ];
  const h2hSummaryItems: {
    rowId: string;
    matchupId: Id<'h2hMatchups'>;
    team: string;
    myPickId: Id<'drivers'> | null;
    winnerId: Id<'drivers'>;
    points: number;
  }[] = (h2hResults ?? []).map((result) => {
    const myPickId = selectedSessionPicks?.[result.matchupId] ?? null;
    const points = myPickId && myPickId === result.winnerId ? 1 : 0;
    return {
      rowId: `h2h-${result.matchupId}`,
      matchupId: result.matchupId,
      team: result.team,
      myPickId,
      winnerId: result.winnerId,
      points,
    };
  });
  const h2hResultMatchups = (h2hResults ?? [])
    .map((result) => {
      if (!result.driver1 || !result.driver2) {
        return null;
      }
      return {
        _id: result.matchupId,
        team: result.team,
        driver1: result.driver1,
        driver2: result.driver2,
      };
    })
    .filter(
      (matchup): matchup is NonNullable<typeof matchup> => matchup != null,
    );
  const h2hSelections = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.myPickId ?? undefined]),
  );
  const h2hWinners = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.winnerId]),
  );
  const h2hPointsMap = Object.fromEntries(
    h2hSummaryItems.map((item) => [item.matchupId, item.points]),
  );

  function renderActualDriverRow(
    entry: (typeof classificationRows)[number],
    compact = false,
  ) {
    return (
      <div className="flex items-center gap-2">
        <DriverBadge
          code={entry.code}
          team={entry.team}
          displayName={entry.displayName}
          number={entry.number}
          nationality={entry.nationality}
          size={compact ? 'sm' : 'md'}
        />
        <span
          className={`min-w-0 truncate text-text-muted ${
            compact ? 'text-sm' : 'hidden text-xs sm:inline'
          }`}
        >
          {entry.displayName}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-text sm:text-xl">
            Session Points Breakdown
          </h2>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[repeat(3,max-content)]">
          <SessionBreakdownStatPill label="Top 5" points={selectedTop5Points} />
          {myH2HScore ? (
            <SessionBreakdownH2HStatPill
              points={selectedH2HPoints}
              correctPicks={myH2HScore.correctPicks}
              totalPicks={myH2HScore.totalPicks}
            />
          ) : (
            <SessionBreakdownStatPill label="H2H" points={selectedH2HPoints} />
          )}
          <SessionBreakdownSessionGainPill points={sessionPointsGain} />
        </div>
      </div>

      {!isSelectedSessionScored ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-5 text-sm text-text-muted">
          No results published yet for {SESSION_LABELS[selectedSession]}. Points
          will appear here when results are in.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <div className="rounded-lg border border-border bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs uppercase sm:text-sm">
                    <th className="sticky top-0 z-20 bg-surface px-2 py-2 text-left text-text-muted sm:px-4">
                      Pos
                    </th>
                    <th className="sticky top-0 z-20 bg-surface px-2 py-2 text-left text-text-muted sm:px-4">
                      Actual
                    </th>
                    <th className="sticky top-0 z-20 bg-surface px-2 py-2 text-left text-text-muted sm:px-4">
                      Top 5
                    </th>
                    <th className="sticky top-0 z-20 bg-surface px-2 py-2 text-right text-text-muted sm:px-4">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scoringRows.map((entry) => {
                    const predictedPos =
                      entry.position <= 5 ? entry.position : null;
                    const pickDriverId =
                      predictedPos !== null
                        ? selectedTop5Picks?.[predictedPos - 1]
                        : undefined;
                    const pickDriver = pickDriverId
                      ? driverById.get(pickDriverId)
                      : undefined;
                    const top5 = predictedPos
                      ? top5ByPredictedPosition.get(predictedPos)
                      : undefined;
                    const top5Pts = top5?.points ?? 0;
                    const rowTotal = top5Pts;
                    const isTop5Actual = entry.position <= 5;

                    return (
                      <tr
                        key={entry.driverId}
                        className={`border-b border-border ${isTop5Actual ? 'bg-accent-muted/15' : ''}`}
                      >
                        <td className="px-2 py-2 text-xs font-semibold text-text-muted sm:px-4">
                          P{entry.position}
                        </td>
                        <td className="px-2 py-2 sm:px-4">
                          {renderActualDriverRow(entry)}
                        </td>
                        <td className="px-2 py-2 sm:px-4">
                          {predictedPos !== null ? (
                            <div className="flex items-center gap-2">
                              {pickDriver ? (
                                <DriverBadge
                                  code={pickDriver.code}
                                  team={pickDriver.team}
                                  displayName={pickDriver.displayName}
                                  number={pickDriver.number}
                                  nationality={pickDriver.nationality}
                                />
                              ) : (
                                <span className="text-xs text-text-muted">
                                  No pick
                                </span>
                              )}
                              <span
                                className={`text-xs font-semibold ${
                                  top5Pts > 0
                                    ? 'text-success'
                                    : 'text-text-muted'
                                }`}
                              >
                                +{top5Pts}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted/60">
                              —
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-2 py-2 text-right text-sm font-semibold sm:px-4 ${
                            rowTotal > 0 ? 'text-accent' : 'text-text-muted'
                          }`}
                        >
                          +{rowTotal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {remainingRows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td
                        colSpan={4}
                        className="border-t border-border px-2 py-0 sm:px-4"
                      >
                        <button
                          type="button"
                          onClick={() => setFullResultsExpanded((v) => !v)}
                          className="flex w-full items-center justify-center gap-1.5 py-2 text-sm text-text-muted transition-colors hover:text-text"
                        >
                          {fullResultsExpanded ? (
                            <>
                              <ChevronUp size={14} />
                              Hide full results
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              Show full results (P7–P{classificationRows.length}
                              )
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <AnimatePresence initial={false}>
              {fullResultsExpanded && remainingRows.length > 0 && (
                <motion.div
                  key="full-results"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-x-1 md:grid-cols-2">
                    {remainingColumns.map((column, index) => (
                      <div
                        key={index}
                        className={`overflow-hidden border border-border bg-surface ${
                          index === 0
                            ? 'rounded-t-lg md:rounded-lg'
                            : 'rounded-b-lg border-t-0 md:rounded-lg md:border-t'
                        }`}
                      >
                        <table className="w-full">
                          <thead
                            className={
                              index === 1 ? 'hidden md:table-header-group' : ''
                            }
                          >
                            <tr className="border-b border-border text-xs uppercase">
                              <th className="px-3 py-2 text-left text-text-muted">
                                Pos
                              </th>
                              <th className="px-3 py-2 text-left text-text-muted">
                                Driver
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {column.map((entry) => (
                              <tr
                                key={entry.driverId}
                                className="border-b border-border last:border-0"
                              >
                                <td className="px-3 py-2 text-xs font-semibold text-text-muted">
                                  P{entry.position}
                                </td>
                                <td className="px-3 py-2">
                                  {renderActualDriverRow(entry, true)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullResultsExpanded(false)}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 py-2 text-sm text-text-muted transition-colors hover:text-text"
                  >
                    <ChevronUp size={14} />
                    Hide full results
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-1.5">
              <Swords className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-semibold text-text">Head-to-Head</h3>
            </div>
            <span className="text-sm font-semibold text-accent">
              +{selectedH2HPoints} pts
            </span>
          </div>
          <H2HMatchupGrid
            matchups={h2hResultMatchups}
            selections={h2hSelections}
            winners={h2hWinners}
            pointsByMatchup={h2hPointsMap}
            mode="results"
          />

          <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-text">Session Total</span>
              <span className="font-semibold">
                <span className="text-text">Top 5 </span>
                <span className="text-accent">+{selectedTop5Points}</span>
                <span className="text-text-muted"> | </span>
                <span className="text-text">H2H </span>
                <span className="text-accent">+{selectedH2HPoints}</span>
                <span className="text-text-muted"> | </span>
                <span className="text-text">Total </span>
                <span className="text-accent">+{sessionPointsGain}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
