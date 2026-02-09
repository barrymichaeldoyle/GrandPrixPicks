import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Check, ChevronDown, EyeOff, Lock, Swords, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { displayTeamName } from '@/lib/display';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '@/lib/sessions';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Badge, StatusBadge } from './Badge';
import {
  DriverBadge,
  DriverBadgeSkeleton,
  ScoredDriverBadge,
} from './DriverBadge';
import { getCountryCodeForRace, RaceFlag } from './RaceCard';
import { ScoreRing } from './ScoreRing';

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

type BreakdownItem = {
  driverId: Id<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number; // 0, 1, 3, or 5
};

type Driver = {
  _id: Id<'drivers'>;
  code: string;
  displayName: string;
  team?: string | null;
  number?: number | null;
  nationality?: string | null;
};

type SessionData = {
  picks: Array<{ driverId: Id<'drivers'>; code: string }>;
  points: number | null;
  breakdown: Array<BreakdownItem> | null;
  submittedAt: number;
  isHidden?: boolean;
} | null;

type Weekend = {
  raceId: Id<'races'>;
  raceName: string;
  raceRound: number;
  raceStatus: string;
  raceDate: number;
  hasSprint: boolean;
  sessions: Record<SessionType, SessionData>;
  totalPoints: number;
  hasScores: boolean;
  submittedAt: number;
};

type H2HWeekend = {
  raceId: Id<'races'>;
  sessions: Record<
    SessionType,
    { correctPicks: number; totalPicks: number; points: number } | null
  >;
};

type H2HPick = {
  raceId: Id<'races'>;
  sessions: Record<SessionType, boolean>;
};

type CardState =
  | 'upcoming_editable'
  | 'upcoming_hidden'
  | 'locked'
  | 'finished';

function getCardState(weekend: Weekend, isOwner: boolean): CardState {
  if (weekend.hasScores) return 'finished';
  if (weekend.raceStatus === 'locked') return 'locked';
  if (!isOwner) {
    const allHidden = Object.values(weekend.sessions).every(
      (s) => s === null || s.isHidden,
    );
    if (allHidden) return 'upcoming_hidden';
  }
  return 'upcoming_editable';
}

const BORDER_LEFT: Record<CardState, string> = {
  upcoming_editable: 'rounded-l-sm border-l-8 border-l-accent/30',
  upcoming_hidden: '',
  locked: 'rounded-l-sm border-l-8 border-l-warning/30',
  finished: 'rounded-l-sm border-l-8 border-l-success/30',
};

/** Compute weekend summary counts from breakdown data across all sessions. */
function getWeekendSummary(
  weekend: Weekend,
  sessions: ReadonlyArray<SessionType>,
) {
  let exact = 0;
  let close = 0;
  let inTop5 = 0;
  let miss = 0;
  let hasScoredSessions = false;

  for (const session of sessions) {
    const data = weekend.sessions[session];
    if (!data?.breakdown) continue;
    hasScoredSessions = true;
    for (const item of data.breakdown) {
      if (item.points === 5) exact++;
      else if (item.points === 3) close++;
      else if (item.points === 1) inTop5++;
      else miss++;
    }
  }

  return { exact, close, inTop5, miss, hasScoredSessions };
}

function SummaryLine({
  weekend,
  sessions,
  cardState,
}: {
  weekend: Weekend;
  sessions: ReadonlyArray<SessionType>;
  cardState: CardState;
}) {
  if (cardState === 'upcoming_editable') {
    return <span className="text-xs text-text-muted">Awaiting race</span>;
  }
  if (cardState === 'upcoming_hidden') {
    return null;
  }
  if (cardState === 'locked') {
    return <span className="text-xs text-text-muted">Awaiting results</span>;
  }

  const { exact, close, inTop5, miss, hasScoredSessions } = getWeekendSummary(
    weekend,
    sessions,
  );

  if (!hasScoredSessions) {
    return <span className="text-xs text-text-muted">Awaiting results</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {exact > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
          {exact} exact
        </span>
      )}
      {close > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-warning" />
          {close} close
        </span>
      )}
      {inTop5 > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-text-muted/40" />
          {inTop5} in top 5
        </span>
      )}
      {miss > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-error/40" />
          {miss} miss
        </span>
      )}
    </div>
  );
}

function H2HSummaryLine({
  weekend,
  sessions,
  h2hHistory,
  h2hPicksByRace,
}: {
  weekend: Weekend;
  sessions: ReadonlyArray<SessionType>;
  h2hHistory: Array<H2HWeekend> | undefined;
  h2hPicksByRace: Array<H2HPick> | undefined;
}) {
  const h2hWeekend = h2hHistory?.find((h) => h.raceId === weekend.raceId);
  const h2hPicks = h2hPicksByRace?.find((p) => p.raceId === weekend.raceId);
  if (!h2hWeekend && !h2hPicks) return null;

  // Has scored results — show per-session scores
  if (h2hWeekend) {
    const parts = sessions
      .map((s) => {
        const data = h2hWeekend.sessions[s];
        if (!data) return null;
        return {
          session: s,
          correct: data.correctPicks,
          total: data.totalPicks,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    if (parts.length > 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Swords className="h-3 w-3 text-accent" />
          <span className="font-semibold">H2H</span>
          {parts.map((p) => (
            <span key={p.session}>
              {SESSION_LABELS_SHORT[p.session]} {p.correct}/{p.total}
            </span>
          ))}
        </div>
      );
    }
  }

  return null;
}

type H2HMatchupPick = {
  matchupId: Id<'h2hMatchups'>;
  team: string;
  driver1: Driver;
  driver2: Driver;
  predictedWinnerId: Id<'drivers'>;
  actualWinnerId: Id<'drivers'> | null;
  isCorrect: boolean | null;
};

/** Header for H2H section — always shown when H2H block is present. */
function H2HSectionHeader() {
  return (
    <div className="mb-1.5 flex items-center gap-1">
      <Swords className="h-3 w-3 text-accent" />
      <span className="text-xs font-semibold text-text-muted">H2H</span>
    </div>
  );
}

/** H2H picks list only (no header; empty = render nothing, parent shows "No selections"). */
function H2HSessionPicks({ picks }: { picks: Array<H2HMatchupPick> }) {
  if (picks.length === 0) {
    return null;
  }

  return (
    <div className="-ml-2.5 flex flex-wrap items-center gap-1.5">
      {picks.map((pick) => {
        const pickedDriver =
          pick.predictedWinnerId === pick.driver1._id
            ? pick.driver1
            : pick.driver2;

        return (
          <div
            key={pick.matchupId}
            className="flex w-16 min-w-16 flex-col items-center"
          >
            {pick.team && (
              <span className="w-full truncate text-center text-[10px] font-medium text-text-muted">
                {displayTeamName(pick.team)}
              </span>
            )}
            <DriverBadge
              code={pickedDriver.code}
              team={pickedDriver.team}
              displayName={pickedDriver.displayName}
              number={pickedDriver.number}
              nationality={pickedDriver.nationality}
            />
            {pick.isCorrect !== null && (
              <span
                className={`mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full ${
                  pick.isCorrect
                    ? 'bg-success-muted text-success'
                    : 'bg-error-muted text-error'
                }`}
              >
                {pick.isCorrect ? (
                  <Check size={10} strokeWidth={3} />
                ) : (
                  <X size={10} strokeWidth={3} />
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WeekendCard({
  weekend,
  drivers,
  h2hHistory,
  h2hPicksByRace,
  userId,
  isOwner,
  isNextRace,
}: {
  weekend: Weekend;
  drivers: Array<Driver> | undefined;
  h2hHistory: Array<H2HWeekend> | undefined;
  h2hPicksByRace: Array<H2HPick> | undefined;
  userId: Id<'users'>;
  isOwner: boolean;
  isNextRace?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sessions = getSessionsForWeekend(!!weekend.hasSprint);
  const cardState = getCardState(weekend, isOwner);
  const countryCode = getCountryCodeForRace({
    slug:
      weekend.raceName
        .toLowerCase()
        .replace(/ grand prix$/i, '')
        .replace(/ /g, '-') + '-2026',
  });

  const scoredSessionCount = sessions.filter(
    (s) => weekend.sessions[s]?.points != null,
  ).length;
  const maxPoints = scoredSessionCount * 25;
  const canExpand = cardState !== 'upcoming_hidden';

  // Keep content mounted during collapse so height can animate
  const [contentMounted, setContentMounted] = useState(false);
  useEffect(() => {
    if (expanded) setContentMounted(true);
    else {
      const t = setTimeout(() => setContentMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  const h2hDetailedPicks = useQuery(
    api.h2h.getUserH2HDetailedPicks,
    canExpand ? { userId, raceId: weekend.raceId } : 'skip',
  );

  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-surface ${BORDER_LEFT[cardState]}`}
    >
      {/* Header — stacked on mobile, row on desktop */}
      <div className="flex flex-col gap-4 p-4 transition-colors hover:bg-surface-hover sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Link
          to="/races/$raceId"
          params={{ raceId: weekend.raceId }}
          className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
        >
          {countryCode && (
            <span className="shrink-0">
              <RaceFlag countryCode={countryCode} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-muted">
                Round {weekend.raceRound}
              </span>
              {cardState !== 'finished' && (
                <StatusBadge status={weekend.raceStatus} isNext={isNextRace} />
              )}
              {weekend.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
            </div>
            <h3 className="line-clamp-2 text-lg leading-snug font-semibold text-text">
              {weekend.raceName}
            </h3>
            <div className="mt-1.5 flex flex-col gap-1 sm:flex-row sm:gap-4">
              <SummaryLine
                weekend={weekend}
                sessions={sessions}
                cardState={cardState}
              />
              <H2HSummaryLine
                weekend={weekend}
                sessions={sessions}
                h2hHistory={h2hHistory}
                h2hPicksByRace={h2hPicksByRace}
              />
            </div>
          </div>
        </Link>

        <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
          <ScoreRing
            earned={weekend.totalPoints}
            max={maxPoints}
            {...(!weekend.hasScores && { emptyLabel: '-' })}
          />
          {canExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setExpanded((prev) => !prev);
              }}
              className="-mr-2 -mb-2 flex min-h-10 min-w-10 items-center justify-center gap-1 text-sm text-accent transition-colors hover:text-accent/80 focus:outline-none focus-visible:text-accent/80 sm:min-h-0 sm:min-w-0 sm:justify-start"
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide breakdown' : 'Show breakdown'}
            >
              {expanded ? 'Hide breakdown' : 'Show breakdown'}
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Collapsed message for hidden upcoming picks */}
      {cardState === 'upcoming_hidden' && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border/60 px-4 py-3">
          <Lock className="h-3.5 w-3.5 text-text-muted/50" />
          <span className="text-sm text-text-muted">
            Picks submitted — revealed when session locks
          </span>
        </div>
      )}

      {/* Expandable breakdown + show/hide link */}
      {canExpand && (
        <>
          <div
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
          >
            <div className="min-h-0 overflow-hidden">
              {contentMounted && (
                <div className="divide-y divide-border/50 border-t border-border/60 p-3 sm:p-4">
                  {sessions.map((session) => {
                    const sessionData = weekend.sessions[session];
                    if (!sessionData) return null;

                    // Hidden session (visitor before lock)
                    if (sessionData.isHidden) {
                      return (
                        <div
                          key={session}
                          className="flex items-center gap-2 rounded-lg bg-surface-muted/40 px-3 py-2.5 first:pt-0"
                        >
                          <span className="text-sm font-medium text-text-muted">
                            {SESSION_LABELS[session]}
                          </span>
                          <span className="text-text-muted/30">&middot;</span>
                          <Lock className="h-3 w-3 text-text-muted/40" />
                          <span className="text-xs text-text-muted/60">
                            Hidden until lock
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={session} className="py-4 first:pt-0 last:pb-0">
                        {/* Session header */}
                        <div className="mb-2.5 flex items-center justify-between">
                          <span className="text-sm font-semibold text-text">
                            {SESSION_LABELS[session]}
                          </span>
                          {sessionData.points != null && (
                            <span className="text-sm font-bold text-accent">
                              {sessionData.points} pts
                            </span>
                          )}
                        </div>
                        {/* Picks flow */}
                        <div className="flex flex-wrap gap-2.5">
                          {sessionData.picks.map((pick, position) => {
                            const driver = drivers?.find(
                              (d) => d._id === pick.driverId,
                            );
                            const breakdownItem = sessionData.breakdown?.find(
                              (b) => b.predictedPosition === position + 1,
                            );

                            return (
                              <div
                                key={position}
                                className="flex flex-col items-center gap-0.5"
                              >
                                <span className="text-[10px] font-semibold text-text-muted/60">
                                  P{position + 1}
                                </span>
                                {driver ? (
                                  <div className="flex items-center gap-1">
                                    {breakdownItem !== undefined ? (
                                      <ScoredDriverBadge
                                        code={driver.code}
                                        team={driver.team}
                                        displayName={driver.displayName}
                                        number={driver.number}
                                        nationality={driver.nationality}
                                        pickPoints={breakdownItem.points}
                                      />
                                    ) : (
                                      <DriverBadge
                                        code={driver.code}
                                        team={driver.team}
                                        displayName={driver.displayName}
                                        number={driver.number}
                                        nationality={driver.nationality}
                                      />
                                    )}
                                  </div>
                                ) : drivers === undefined ? (
                                  <DriverBadgeSkeleton />
                                ) : (
                                  <span className="flex h-8 items-center text-text-muted/50">
                                    —
                                  </span>
                                )}
                                {breakdownItem !== undefined && (
                                  <span
                                    className={`text-[10px] font-bold ${
                                      breakdownItem.points
                                        ? 'text-success'
                                        : 'text-error/60'
                                    }`}
                                  >
                                    {breakdownItem.points
                                      ? `+${breakdownItem.points}`
                                      : '-'}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {/* H2H section — header always shown, then skeleton / picks / no selections */}
                        <div className="mt-2.5 pt-2.5">
                          <H2HSectionHeader />
                          {h2hDetailedPicks === undefined ? (
                            <p className="text-xs text-text-muted">Loading…</p>
                          ) : (h2hDetailedPicks?.[session]?.length ?? 0) > 0 ? (
                            <H2HSessionPicks
                              picks={(h2hDetailedPicks ?? {})[session] ?? []}
                            />
                          ) : (
                            <p className="text-xs text-text-muted">
                              No selections
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Owner visibility notice */}
                  {isOwner &&
                    Object.values(weekend.sessions).some(
                      (s) => s && !s.isHidden && s.points === null,
                    ) &&
                    weekend.raceStatus === 'upcoming' && (
                      <div className="-mb-3 flex items-center justify-center gap-1.5 px-3 py-1">
                        <EyeOff className="h-3 w-3 text-text-muted/60" />
                        <span className="text-xs text-text-muted/60">
                          Only visible to you until session locks
                        </span>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
