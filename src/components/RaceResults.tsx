import { useQuery } from 'convex/react';
import { Clock, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { displayTeamName } from '@/lib/display';

import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import type { SessionType } from '../lib/sessions';
import { getSessionsForWeekend, SESSION_LABELS } from '../lib/sessions';
import { Button } from './Button';
import { DriverBadge } from './DriverBadge';
import { Flag } from './Flag';
import { InlineLoader } from './InlineLoader';
import { Tooltip } from './Tooltip';

const SCORING_LEGEND = [
  {
    dot: 'bg-success',
    label: 'Exact',
    labelFull: 'Exact position',
    pts: 5,
    title: 'Your pick finished exactly where you predicted',
  },
  {
    dot: 'bg-warning',
    label: '±1',
    labelFull: '±1 position',
    pts: 3,
    title: 'Your pick was off by one position',
  },
  {
    dot: 'bg-text-muted',
    label: 'Top 5',
    labelFull: 'Top 5',
    pts: 1,
    title: 'Your pick finished in the top 5, off by 2+ positions',
  },
];

export function ScoringLegend({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${className}`}
    >
      {SCORING_LEGEND.map(({ dot, label, labelFull, pts, title }) => (
        <Tooltip key={pts} content={title}>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent-muted/50 px-2 py-0.5 text-xs text-text-muted sm:gap-1.5 sm:px-3 sm:py-1">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
              aria-hidden
            />
            <span className="hidden sm:inline">{labelFull}</span>
            <span className="sm:hidden">{label}</span>
            <span className="font-semibold text-text">{pts}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

interface RaceResultsProps {
  raceId: Id<'races'>;
  race?: Doc<'races'>;
  /** Hide the header (title, points, legend) - used when header is rendered elsewhere */
  hideHeader?: boolean;
}

export function RaceResults({ raceId, race, hideHeader }: RaceResultsProps) {
  const [selectedSession, setSelectedSession] = useState<SessionType | null>(
    null,
  );

  const availableSessions = useQuery(api.results.getAllResultsForRace, {
    raceId,
  });

  // Determine which sessions are expected for this race
  const expectedSessions = getSessionsForWeekend(!!race?.hasSprint);

  // Default to the latest available session (last in the sorted array)
  useEffect(() => {
    if (availableSessions && availableSessions.length > 0 && !selectedSession) {
      setSelectedSession(availableSessions[availableSessions.length - 1]);
    }
  }, [availableSessions, selectedSession]);

  const effectiveSession = selectedSession ?? 'race';

  const result = useQuery(api.results.getResultForRace, {
    raceId,
    sessionType: effectiveSession,
  });
  const mySessionScore = useQuery(api.results.getMyScoreForRace, {
    raceId,
    sessionType: effectiveSession,
  });

  if (availableSessions === undefined) {
    return <InlineLoader />;
  }

  if (availableSessions.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
        <p className="text-text-muted">Results not yet published</p>
      </div>
    );
  }

  // Find pending sessions (expected but not yet published)
  const pendingSessions = expectedSessions.filter(
    (s) => !availableSessions.includes(s),
  );

  // Check if race results are pending
  const raceResultsPending =
    pendingSessions.includes('race') && race?.status === 'locked';

  // Create lookup: driver code → driver details (for badges)
  const driverByCode = new Map<
    string,
    {
      team: string | null;
      displayName: string;
      number: number | null;
      nationality: string | null;
    }
  >();
  if (result?.enrichedClassification) {
    for (const entry of result.enrichedClassification) {
      driverByCode.set(entry.code, {
        team: entry.team,
        displayName: entry.displayName,
        number: entry.number,
        nationality: entry.nationality,
      });
    }
  }

  // Create lookup: position → user's pick for that position
  const myPickByPosition = new Map<number, { code: string; points: number }>();
  if (mySessionScore?.enrichedBreakdown) {
    for (const item of mySessionScore.enrichedBreakdown) {
      myPickByPosition.set(item.predictedPosition, {
        code: item.code,
        points: item.points,
      });
    }
  }

  const hasMyPicks = myPickByPosition.size > 0;

  return (
    <div>
      {/* Header - hidden when rendered in parent */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold text-text sm:text-xl">
              Weekend Results
            </h2>
          </div>
          {mySessionScore && (
            <Tooltip content="Points you scored for this session">
              <span className="text-lg font-bold text-accent sm:text-xl">
                {mySessionScore.points}{' '}
                <span className="hidden sm:inline">
                  {mySessionScore.points === 1 ? 'point' : 'points'}
                </span>
                <span className="sm:hidden">pts</span>
              </span>
            </Tooltip>
          )}
        </div>
      )}

      {/* Session Tabs - show all expected sessions */}
      {(availableSessions.length > 1 || pendingSessions.length > 0) && (
        <div
          className="flex gap-1 border border-border bg-surface p-1"
          role="tablist"
          aria-label="Race session results"
        >
          {expectedSessions.map((session) => {
            const hasResults = availableSessions.includes(session);
            const isSelected = effectiveSession === session;

            return (
              <Button
                key={session}
                variant="tab"
                size="tab"
                active={isSelected}
                disabled={!hasResults}
                tooltip={!hasResults ? 'Results not yet published' : undefined}
                onClick={() => hasResults && setSelectedSession(session)}
                className="flex-1"
              >
                {SESSION_LABELS[session]}
                {!hasResults && (
                  <Clock className="ml-1 inline h-3 w-3 opacity-50" />
                )}
              </Button>
            );
          })}
        </div>
      )}

      {mySessionScore === null && (
        <div className="rounded-lg border border-border bg-surface-muted p-4 text-center">
          <p className="text-text-muted">
            You didn't submit a prediction for{' '}
            {SESSION_LABELS[effectiveSession].toLowerCase()}
          </p>
        </div>
      )}

      {/* Race Results Pending Notice */}
      {raceResultsPending && effectiveSession !== 'race' && (
        <div className="rounded-lg border border-warning/30 bg-warning-muted p-3 text-sm text-warning">
          <Clock className="mr-2 inline h-4 w-4" />
          Race results pending
        </div>
      )}

      {/* Scoring Legend - hidden when rendered in parent */}
      {!hideHeader && hasMyPicks && (
        <ScoringLegend className="relative -top-4 -mb-2 justify-end" />
      )}

      {/* Results Table */}
      <div>
        {result === undefined ? (
          <InlineLoader />
        ) : result ? (
          <div className="overflow-hidden rounded-lg rounded-t-none border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-sm">
                  <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                    <Tooltip content="Position">Pos</Tooltip>
                  </th>
                  <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                    Result
                  </th>
                  {hasMyPicks && (
                    <th className="px-2 py-2 text-left text-text-muted sm:px-4">
                      <Tooltip content="Your predicted finisher and points for this pick">
                        Pick
                      </Tooltip>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {result.enrichedClassification.map((entry) => {
                  const myPick = myPickByPosition.get(entry.position);
                  const showPickColumn = entry.position <= 5;

                  return (
                    <tr
                      key={entry.driverId}
                      className={`border-b border-border last:border-0 ${
                        entry.position <= 5 ? 'bg-accent-muted/50' : ''
                      }`}
                    >
                      <td className="px-2 py-1.5 text-text-muted sm:px-4 sm:py-2">
                        P{entry.position}
                      </td>
                      <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <DriverBadge
                            code={entry.code}
                            team={entry.team}
                            displayName={entry.displayName}
                            number={entry.number}
                            nationality={entry.nationality}
                          />
                          <div className="hidden sm:block">
                            <div className="font-medium text-text">
                              {entry.displayName}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-text-muted">
                              {entry.nationality && (
                                <Flag code={entry.nationality} size="xs" />
                              )}
                              {entry.number != null && (
                                <span className="font-mono font-medium">
                                  #{entry.number}
                                </span>
                              )}
                              {entry.team && (
                                <span className="text-text-muted">
                                  {displayTeamName(entry.team)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {hasMyPicks && (
                        <td className="px-2 py-1.5 sm:px-4 sm:py-2">
                          {showPickColumn && myPick ? (
                            <div className="flex items-center gap-2">
                              <DriverBadge
                                code={myPick.code}
                                team={driverByCode.get(myPick.code)?.team}
                                displayName={
                                  driverByCode.get(myPick.code)?.displayName
                                }
                                number={driverByCode.get(myPick.code)?.number}
                                nationality={
                                  driverByCode.get(myPick.code)?.nationality
                                }
                              />
                              <span
                                className={`font-bold shrink-0 ${
                                  myPick.points ? 'text-success' : 'text-error'
                                }`}
                              >
                                +{myPick.points}
                              </span>
                            </div>
                          ) : showPickColumn ? (
                            <span className="text-text-muted/50">—</span>
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border py-8 text-center">
            <p className="text-text-muted">
              No results for {SESSION_LABELS[effectiveSession].toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
