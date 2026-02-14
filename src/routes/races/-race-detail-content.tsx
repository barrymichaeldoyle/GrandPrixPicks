import { SignInButton, useAuth } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { Check, Lock, LogIn, Swords, Trophy, X } from 'lucide-react';
import { useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { api } from '../../../convex/_generated/api';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { Button } from '../../components/Button';
import { DriverBadge } from '../../components/DriverBadge';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { H2HWeekendSummary } from '../../components/H2HWeekendSummary';
import { InlineLoader } from '../../components/InlineLoader';
import { RaceResults } from '../../components/RaceResults';
import { RandomizeButton } from '../../components/RandomizeButton';
import { Tooltip } from '../../components/Tooltip';
import { WeekendPredictions } from '../../components/WeekendPredictions';
import { formatDate, formatTime } from '../../lib/date';
import type { SessionType } from '../../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../lib/sessions';

/** Card wrapper matching RaceResults table/block styling */
const SECTION_CARD =
  'overflow-hidden rounded-lg border border-border bg-surface';

interface Top5PredictionSectionProps {
  race: Doc<'races'>;
  /** When provided, section is controlled by parent (e.g. to hide other section while editing). */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
}

export function Top5PredictionSection({
  race,
  editingSession: controlledEditing,
  onEditingSessionChange,
}: Top5PredictionSectionProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );
  const editingSession =
    onEditingSessionChange !== undefined
      ? (controlledEditing ?? null)
      : internalEditing;
  const setEditingSession = onEditingSessionChange ?? setInternalEditing;

  return (
    <div className="space-y-2 p-4">
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          editingSession ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-xl font-semibold text-text">Top 5 Predictions</h2>
        </div>
      </div>

      {!isLoaded ? (
        <InlineLoader />
      ) : isSignedIn ? (
        <div
          key={editingSession ?? 'summary'}
          className="race-detail-content-in"
        >
          <ErrorBoundary>
            <WeekendPredictions
              race={race}
              editingSession={editingSession}
              onEditingSessionChange={setEditingSession}
            />
          </ErrorBoundary>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
          <LogIn className="mx-auto mb-4 h-12 w-12 text-text-muted" />
          <p className="mb-4 text-text-muted">
            Sign in to make your prediction
          </p>
          <SignInButton mode="modal">
            <Button size="sm">Sign In</Button>
          </SignInButton>
        </div>
      )}
    </div>
  );
}

interface NotYetOpenSectionProps {
  predictionOpenAt: number | null | undefined;
}

export function NotYetOpenSection({
  predictionOpenAt,
}: NotYetOpenSectionProps) {
  return (
    <div className={`${SECTION_CARD} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-5 w-5 text-text-muted" />
        <h2 className="text-xl font-semibold text-text">Not Yet Open</h2>
      </div>
      <div className="text-sm text-text-muted">
        <p>
          Predictions for this race will open after the previous race is
          complete.
        </p>
        {predictionOpenAt != null && (
          <p className="mt-2">
            Predictions open{' '}
            <strong className="text-text">
              {formatDate(predictionOpenAt)} at {formatTime(predictionOpenAt)}
            </strong>
          </p>
        )}
        {predictionOpenAt == null && <p className="mt-2">Check back soon!</p>}
      </div>
    </div>
  );
}

export function LockedSection() {
  return (
    <div className={`${SECTION_CARD} p-4`}>
      <h2 className="mb-2 text-xl font-semibold text-text">
        Predictions Locked
      </h2>
      <p className="text-sm text-text-muted">
        Predictions are closed. Results will be available after the race.
      </p>
    </div>
  );
}

interface ResultsSectionProps {
  raceId: Id<'races'>;
  race: Doc<'races'>;
}

export function ResultsSection({ raceId, race }: ResultsSectionProps) {
  return (
    <div>
      <ErrorBoundary>
        <div className="md:hidden">
          <RaceResults raceId={raceId} race={race} />
        </div>
        <div className="hidden md:block">
          <RaceResults raceId={raceId} race={race} hideHeader />
        </div>
      </ErrorBoundary>
    </div>
  );
}

// ───────────────────────── H2H Sections ─────────────────────────

interface H2HSectionProps {
  race: Doc<'races'>;
  /** When provided, section is controlled by parent (e.g. to hide other section while editing). */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
  /** When true, show Randomize button in this section (Top 5 done, H2H still needed). */
  showRandomizeButton?: boolean;
  hasPredictions?: boolean;
  hasH2HPredictions?: boolean;
}

export function H2HSection({
  race,
  editingSession: controlledEditing,
  onEditingSessionChange,
  showRandomizeButton,
  hasPredictions,
  hasH2HPredictions,
}: H2HSectionProps) {
  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );
  const editingSession =
    onEditingSessionChange !== undefined
      ? (controlledEditing ?? null)
      : internalEditing;
  const setEditingSession = onEditingSessionChange ?? setInternalEditing;

  return (
    <div className="space-y-2 p-4">
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          editingSession ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold text-text">
              Head-to-Head Predictions
            </h2>
          </div>
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
          editingSession={editingSession}
          onEditingSessionChange={setEditingSession}
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

  const h2hResults = useQuery(api.h2h.getH2HResultsForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const myH2HScore = useQuery(api.h2h.getMyH2HScoreForRace, {
    raceId,
    sessionType: selectedSession,
  });
  const myH2HPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId,
  });

  if (!h2hResults) {
    return null;
  }

  const sessionPicks = myH2HPredictions?.[selectedSession];

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            Head-to-Head Results
          </h2>
        </div>
        {myH2HScore && (
          <span className="rounded-full bg-accent-muted px-3 py-1 text-sm font-semibold text-accent">
            {myH2HScore.correctPicks}/{myH2HScore.totalPicks} correct ={' '}
            {myH2HScore.points} pts
          </span>
        )}
      </div>

      {/* Session tabs */}
      {sessions.length > 1 && (
        <div
          className="mb-4 flex gap-1 rounded-lg border border-border bg-surface-muted/50 p-1"
          role="tablist"
          aria-label="H2H session results"
        >
          {sessions.map((session) => (
            <Button
              key={session}
              variant="tab"
              size="tab"
              active={selectedSession === session}
              onClick={() => setSelectedSession(session)}
              className="flex-1"
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
            </Button>
          ))}
        </div>
      )}

      {/* Results table */}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-sm">
              <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                Team
              </th>
              <th className="px-2 py-2 text-center text-text-muted sm:px-4">
                Winner
              </th>
              {sessionPicks && (
                <>
                  <th className="px-2 py-2 text-center text-text-muted sm:px-4">
                    Your Pick
                  </th>
                  <th className="w-12 px-2 py-2 text-center text-text-muted sm:px-4" />
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {h2hResults.map((result) => {
              const myPick = sessionPicks
                ? sessionPicks[result.matchupId]
                : undefined;
              const isCorrect = myPick === result.winnerId;
              const pickDriver =
                myPick === result.driver1?._id
                  ? result.driver1
                  : myPick === result.driver2?._id
                    ? result.driver2
                    : null;

              return (
                <tr
                  key={result.matchupId}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                    <span className="text-xs font-medium text-text-muted">
                      {displayTeamName(result.team)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center sm:px-4 sm:py-2">
                    <div className="flex h-8 items-center justify-center">
                      <DriverBadge
                        code={result.winnerCode}
                        team={result.team}
                        displayName={
                          result.winnerId === result.driver1?._id
                            ? result.driver1.displayName
                            : result.driver2?.displayName
                        }
                        number={
                          result.winnerId === result.driver1?._id
                            ? result.driver1.number
                            : result.driver2?.number
                        }
                        nationality={
                          result.winnerId === result.driver1?._id
                            ? result.driver1.nationality
                            : result.driver2?.nationality
                        }
                      />
                    </div>
                  </td>
                  {sessionPicks && (
                    <>
                      <td className="px-2 py-1.5 text-center sm:px-4 sm:py-2">
                        <div className="flex h-8 items-center justify-center">
                          {pickDriver ? (
                            <DriverBadge
                              code={pickDriver.code}
                              team={pickDriver.team}
                              displayName={pickDriver.displayName}
                              number={pickDriver.number}
                              nationality={pickDriver.nationality}
                            />
                          ) : (
                            <span className="text-text-muted/50">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center sm:px-4 sm:py-2">
                        {myPick && (
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                              isCorrect
                                ? 'bg-success-muted text-success'
                                : 'bg-error-muted text-error'
                            }`}
                          >
                            {isCorrect ? (
                              <Check size={14} strokeWidth={3} />
                            ) : (
                              <X size={14} strokeWidth={3} />
                            )}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
