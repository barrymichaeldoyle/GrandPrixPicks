import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { CircleCheck, CircleX, Pencil, Swords } from 'lucide-react';
import { useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { DriverBadge } from '../../components/DriverBadge';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { H2HWeekendSummary } from '../../components/H2HWeekendSummary';
import { RandomizeButton } from '../../components/RandomizeButton';
import { Tooltip } from '../../components/Tooltip';
import type { SessionType } from '../../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../lib/sessions';

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
  const selectedSessionLockTime = (() => {
    switch (selectedSession) {
      case 'quali':
        return race.qualiLockAt;
      case 'sprint_quali':
        return race.sprintQualiLockAt;
      case 'sprint':
        return race.sprintLockAt;
      case 'race':
        return race.predictionLockAt;
    }
  })();
  const selectedSessionLocked =
    selectedSessionLockTime !== undefined &&
    Date.now() >= selectedSessionLockTime;
  const canEditSelectedSession = Boolean(
    hasH2HPredictions && !selectedSessionLocked,
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            Head-to-Head Predictions
          </h2>
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

      <ErrorBoundary>
        <H2HWeekendSummary
          race={race}
          selectedSession={selectedSession}
          editingSession={editingSession}
          onEditingSessionChange={setEditingSession}
          onEditingDirtyChange={onEditingDirtyChange}
        />
      </ErrorBoundary>
    </div>
  );
}

interface H2HResultsSectionProps {
  raceId: Id<'races'>;
  race: Doc<'races'>;
}

export function H2HResultsSection({ raceId, race }: H2HResultsSectionProps) {
  const sessions = getSessionsForWeekend(!!race.hasSprint);
  const [selectedSession, setSelectedSession] = useState<SessionType>(
    sessions[sessions.length - 1],
  );

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
  const h2hSummaryItems: Array<{
    rowId: string;
    team: string;
    myPickId: Id<'drivers'> | null;
    winnerId: Id<'drivers'>;
    points: number;
  }> = (h2hResults ?? []).map((result) => {
    const myPickId = selectedSessionPicks?.[result.matchupId] ?? null;
    const points = myPickId && myPickId === result.winnerId ? 1 : 0;
    return {
      rowId: `h2h-${result.matchupId}`,
      team: result.team,
      myPickId,
      winnerId: result.winnerId,
      points,
    };
  });

  return (
    <div className="p-4">
      {sessions.length > 1 && (
        <div
          className="-mx-4 -mt-4 mb-3 flex gap-1 border-b-3 border-border bg-surface-muted/50"
          role="tablist"
          aria-label="Race results by session"
        >
          {sessions.map((session) =>
            (() => {
              const hasResults = sessionHasResults.has(session);
              const isActive = selectedSession === session;
              const valueClass = hasResults
                ? isActive
                  ? 'font-semibold text-white'
                  : 'text-text-muted'
                : isActive
                  ? 'font-semibold text-white/90'
                  : 'text-text-muted';
              return (
                <Button
                  key={session}
                  variant="tab"
                  size="tab"
                  active={selectedSession === session}
                  onClick={() => setSelectedSession(session)}
                  className="flex-1 !rounded-none"
                >
                  <span className="hidden sm:inline">
                    {SESSION_LABELS[session]}
                  </span>
                  {race.hasSprint ? (
                    <span className="sm:hidden">
                      <Tooltip content={SESSION_LABELS[session]}>
                        <span>{SESSION_LABELS_SHORT[session]}</span>
                      </Tooltip>
                    </span>
                  ) : (
                    <span className="sm:hidden">{SESSION_LABELS[session]}</span>
                  )}
                  <span
                    className={`ml-1 hidden text-xs sm:inline ${valueClass}`}
                  >
                    {hasResults
                      ? `+${top5PointsBySession[session] + h2hPointsBySession[session]}`
                      : 'Pending'}
                  </span>
                </Button>
              );
            })(),
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            Session Points Breakdown
          </h2>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[repeat(3,max-content)]">
          <div className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-text-muted">Top 5</span>
              <div className="leading-tight font-semibold text-accent">
                +{selectedTop5Points} pts
              </div>
            </div>
          </div>
          <div className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-sm sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-text-muted">H2H</span>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                {myH2HScore && (
                  <p className="text-xs leading-tight text-text-muted">
                    {myH2HScore.correctPicks}/{myH2HScore.totalPicks} correct
                  </p>
                )}
                <div className="leading-tight font-semibold text-accent">
                  +{selectedH2HPoints} pts
                </div>
              </div>
            </div>
          </div>
          <div className="w-full rounded-lg border border-accent/40 bg-accent-muted/30 px-3 py-1.5 text-sm sm:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs text-text-muted">Session Gain</span>
              <div className="leading-tight font-bold text-accent">
                +{sessionPointsGain} pts
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isSelectedSessionScored ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-5 text-sm text-text-muted">
          No results published yet for {SESSION_LABELS[selectedSession]}. Points
          will appear here when results are in.
        </div>
      ) : (
        <div className="space-y-3">
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
                {classificationRows.map((entry) => {
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
                        <div className="flex items-center gap-2">
                          <DriverBadge
                            code={entry.code}
                            team={entry.team}
                            displayName={entry.displayName}
                            number={entry.number}
                            nationality={entry.nationality}
                          />
                          <span className="hidden text-xs text-text-muted sm:inline">
                            {entry.displayName}
                          </span>
                        </div>
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
                                top5Pts > 0 ? 'text-success' : 'text-text-muted'
                              }`}
                            >
                              +{top5Pts}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted/60">—</span>
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
            </table>
          </div>

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">Head-to-Head</h3>
              <span className="text-sm font-semibold text-accent">
                +{selectedH2HPoints} pts
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {h2hSummaryItems.map((matchup) => {
                const pickedDriver = matchup.myPickId
                  ? driverById.get(matchup.myPickId)
                  : undefined;
                const winnerDriver = driverById.get(matchup.winnerId);
                const wonPick = matchup.points > 0;

                return (
                  <div
                    key={matchup.rowId}
                    className="rounded-md border border-border bg-surface-muted/35 p-2"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-muted">
                        {displayTeamName(matchup.team)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          wonPick ? 'text-success' : 'text-error'
                        }`}
                      >
                        {wonPick ? (
                          <CircleCheck className="h-3.5 w-3.5" />
                        ) : (
                          <CircleX className="h-3.5 w-3.5" />
                        )}
                        +{matchup.points}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {pickedDriver ? (
                        <DriverBadge
                          code={pickedDriver.code}
                          team={pickedDriver.team}
                          displayName={pickedDriver.displayName}
                          number={pickedDriver.number}
                          nationality={pickedDriver.nationality}
                        />
                      ) : (
                        <span className="text-xs text-text-muted">No pick</span>
                      )}
                      <span className="text-xs text-text-muted">vs</span>
                      {winnerDriver ? (
                        <DriverBadge
                          code={winnerDriver.code}
                          team={winnerDriver.team}
                          displayName={winnerDriver.displayName}
                          number={winnerDriver.number}
                          nationality={winnerDriver.nationality}
                        />
                      ) : (
                        <span className="text-xs text-text-muted">Winner</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface-muted/60 px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-text">Session Total</span>
              <span className="font-semibold text-accent">
                Top 5 +{selectedTop5Points} | H2H +{selectedH2HPoints} | Total +
                {sessionPointsGain}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
