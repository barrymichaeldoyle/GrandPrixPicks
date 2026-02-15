import { useQuery } from 'convex/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import type { SessionType } from '../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../lib/sessions';
import { Badge } from './Badge';
import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from './DriverBadge';
import { PredictionForm } from './PredictionForm';
import { Tooltip } from './Tooltip';

type Race = Doc<'races'>;

interface WeekendPredictionsProps {
  race: Race;
  /** Controlled editing: when set, parent can hide its own header. */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
}

function getSessionsForRace(race: Race): ReadonlyArray<SessionType> {
  return getSessionsForWeekend(!!race.hasSprint);
}

function getSessionLockTime(
  race: Race,
  session: SessionType,
): number | undefined {
  switch (session) {
    case 'quali':
      return race.qualiLockAt;
    case 'sprint_quali':
      return race.sprintQualiLockAt;
    case 'sprint':
      return race.sprintLockAt;
    case 'race':
      return race.predictionLockAt;
  }
}

function isSessionLocked(race: Race, session: SessionType): boolean {
  const lockTime = getSessionLockTime(race, session);
  return lockTime !== undefined && Date.now() >= lockTime;
}

export function WeekendPredictions({
  race,
  editingSession: controlledEditing,
  onEditingSessionChange,
}: WeekendPredictionsProps) {
  const weekendPredictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId: race._id,
  });
  const scores = useQuery(api.results.getMyScoresForRace, {
    raceId: race._id,
  });
  const actualTop5BySession = useQuery(
    api.results.getEnrichedTop5BySession,
    { raceId: race._id },
  );
  const drivers = useQuery(api.drivers.listDrivers);

  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );

  const isControlled = onEditingSessionChange !== undefined;
  const editingSession = isControlled
    ? (controlledEditing ?? null)
    : internalEditing;
  const setEditingSession = isControlled
    ? (s: SessionType | null) => onEditingSessionChange(s)
    : setInternalEditing;

  const sessions = getSessionsForRace(race);
  const hasPredictions =
    weekendPredictions?.predictions &&
    Object.values(weekendPredictions.predictions).some((p) => p !== null);

  // If user has no predictions yet, show the simple form
  if (!hasPredictions) {
    return (
      <div>
        <p className="mb-4 text-text-muted">
          Pick your top 5 drivers. This prediction will apply to{' '}
          {race.hasSprint
            ? 'Qualifying, Sprint Qualifying, Sprint, and Race'
            : 'Qualifying and Race'}
          . You can fine-tune individual sessions after submitting.
        </p>
        <PredictionForm raceId={race._id} />
      </div>
    );
  }

  // Editing a single session: show form, return to table on save
  if (editingSession) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setEditingSession(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={18} />
          Back to summary
        </button>
        <h3 className="text-lg font-semibold text-text">
          Top 5 - Edit {SESSION_LABELS[editingSession]}
        </h3>
        <PredictionForm
          raceId={race._id}
          sessionType={editingSession}
          existingPicks={
            weekendPredictions.predictions[editingSession] ?? undefined
          }
          onSuccess={() => setEditingSession(null)}
        />
      </div>
    );
  }

  // Summary table with edit buttons in each session header
  return (
    <div className="space-y-4">
      <p className="text-text-muted">
        Your predictions are set for this weekend.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-sm">
              <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                Pos
              </th>
              {sessions.map((session) => {
                const locked = isSessionLocked(race, session);
                return (
                  <th
                    key={session}
                    className="px-2 py-2 text-left text-text-muted sm:px-4"
                  >
                    <div className="flex flex-col items-center justify-start gap-1 sm:flex-row sm:gap-2">
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
                        <span className="sm:hidden">
                          {SESSION_LABELS[session]}
                        </span>
                      )}
                      {scores?.[session] != null && (
                        <Tooltip content="Points you scored for this session">
                          <span className="text-sm font-bold text-accent">
                            {scores[session].points} pts
                          </span>
                        </Tooltip>
                      )}
                      {locked ? (
                        <Tooltip content="This session has started — predictions can’t be changed">
                          <span className="shrink-0">
                            <Badge variant="locked" />
                          </span>
                        </Tooltip>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingSession(session)}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent-muted/50"
                          title={`Edit ${SESSION_LABELS[session]}`}
                        >
                          <Pencil size={14} />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4].map((position) => (
              <tr
                key={position}
                className="border-b border-border last:border-0"
              >
                <td className="px-2 py-1.5 font-bold text-accent sm:px-4 sm:py-2">
                  P{position + 1}
                </td>
                {sessions.map((session) => {
                  const picks = weekendPredictions.predictions[session];
                  const driverId = picks?.[position];
                  const driver = driverId
                    ? drivers?.find((d) => d._id === driverId)
                    : null;
                  const sessionScore = scores?.[session];
                  const breakdownItem = sessionScore?.enrichedBreakdown.find(
                    (b) => b.predictedPosition === position + 1,
                  );
                  const actualDriver =
                    actualTop5BySession?.[session]?.[position];
                  return (
                    <td
                      key={session}
                      className="px-2 py-1.5 text-left sm:px-4 sm:py-2"
                    >
                      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
                        {driver ? (
                          breakdownItem !== undefined ? (
                            <>
                              <ScoredDriverBadge
                                code={driver.code}
                                team={driver.team}
                                displayName={driver.displayName}
                                number={driver.number}
                                nationality={driver.nationality}
                                size="sm"
                                pickPoints={breakdownItem.points}
                              />
                              <span
                                className={`flex shrink-0 items-center text-sm font-bold leading-none ${
                                  breakdownItem.points
                                    ? 'text-success'
                                    : 'text-error/60'
                                }`}
                              >
                                {breakdownItem.points
                                  ? `+${breakdownItem.points}`
                                  : '-'}
                              </span>
                            </>
                          ) : (
                            <DriverBadge
                              code={driver.code}
                              team={driver.team}
                              displayName={driver.displayName}
                              number={driver.number}
                              nationality={driver.nationality}
                              size="sm"
                            />
                          )
                        ) : driverId && drivers === undefined ? (
                          <DriverBadgeSkeleton size="sm" />
                        ) : (
                          <span className="text-text-muted/50">—</span>
                        )}
                        {actualDriver && (
                          <>
                            <span className="flex shrink-0 items-center text-xs text-text-muted leading-none">
                              Actual:
                            </span>
                            <span className="flex shrink-0 items-center">
                              <DriverBadge
                                code={actualDriver.code}
                                team={actualDriver.team}
                                displayName={actualDriver.displayName}
                                number={actualDriver.number}
                                nationality={actualDriver.nationality}
                                size="sm"
                              />
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
