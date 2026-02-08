import { useQuery } from 'convex/react';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useState } from 'react';

import { displayTeamName } from '@/lib/display';
import type { SessionType } from '@/lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '@/lib/sessions';

import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { DriverBadge } from './DriverBadge';
import { H2HPredictionForm } from './H2HPredictionForm';
import { Tooltip } from './Tooltip';

type Race = Doc<'races'>;

interface H2HWeekendSummaryProps {
  race: Race;
  /** Controlled editing: when set, parent can hide its own header. */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
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

export function H2HWeekendSummary({
  race,
  editingSession: controlledEditing,
  onEditingSessionChange,
}: H2HWeekendSummaryProps) {
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});

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

  const sessions = getSessionsForWeekend(!!race.hasSprint);
  const hasH2HPredictions =
    h2hPredictions && Object.values(h2hPredictions).some((p) => p !== null);

  // If user has no H2H predictions yet, show the form
  if (!hasH2HPredictions) {
    return (
      <div>
        <p className="mb-4 text-text-muted">
          Pick which teammate finishes ahead in each pairing. This prediction
          will apply to{' '}
          {race.hasSprint
            ? 'Qualifying, Sprint Qualifying, Sprint, and Race'
            : 'Qualifying and Race'}
          . You can fine-tune individual sessions after submitting.
        </p>
        <H2HPredictionForm raceId={race._id} />
      </div>
    );
  }

  // Editing a single session
  if (editingSession) {
    const existingPicks = h2hPredictions[editingSession] ?? undefined;
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
          Edit H2H — {SESSION_LABELS[editingSession]}
        </h3>
        <H2HPredictionForm
          raceId={race._id}
          sessionType={editingSession}
          existingPicks={existingPicks}
          onSuccess={() => setEditingSession(null)}
        />
      </div>
    );
  }

  // Summary table: rows are matchups, columns are sessions
  return (
    <div className="space-y-4">
      <p className="text-text-muted">
        Your head-to-head picks are set for this weekend.
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-sm">
              <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                Team
              </th>
              {sessions.map((session) => {
                const locked = isSessionLocked(race, session);
                return (
                  <th
                    key={session}
                    className="px-2 py-2 text-center text-text-muted sm:px-4"
                  >
                    <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
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
                      {locked ? (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-warning"
                          title="Locked"
                        />
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
            {matchups?.map((matchup) => (
              <tr
                key={matchup._id}
                className="border-b border-border last:border-0"
              >
                <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                  <span className="text-xs font-medium text-text-muted">
                    {displayTeamName(matchup.team)}
                  </span>
                </td>
                {sessions.map((session) => {
                  const sessionPicks = h2hPredictions[session];
                  const winnerId = sessionPicks
                    ? (sessionPicks[matchup._id as string] as
                        | Id<'drivers'>
                        | undefined)
                    : undefined;
                  const winner =
                    winnerId === matchup.driver1._id
                      ? matchup.driver1
                      : winnerId === matchup.driver2._id
                        ? matchup.driver2
                        : null;

                  return (
                    <td
                      key={session}
                      className="px-2 py-1.5 text-center sm:px-4 sm:py-2"
                    >
                      <div className="flex h-6 items-center justify-center">
                        {winner ? (
                          <DriverBadge
                            code={winner.code}
                            team={winner.team}
                            displayName={winner.displayName}
                            number={winner.number}
                            nationality={winner.nationality}
                            size="sm"
                          />
                        ) : (
                          <span className="text-text-muted/50">—</span>
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
