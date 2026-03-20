import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Flag, Flame, Gauge, Trophy, Users, X } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import { Avatar } from './Avatar';
import { DriverBadge, ScoredDriverBadge } from './DriverBadge';
import { getCountryCodeForRace, RaceFlag } from './RaceCard';
import { RevButton } from './RevButton';

type ScoredPick = {
  code: string;
  team?: string;
  displayName?: string;
  nationality?: string;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

type H2HScore = {
  correctPicks: number;
  totalPicks: number;
  points: number;
};

type FeedEvent = {
  _id: Id<'feedEvents'>;
  type: 'score_published' | 'joined_league' | 'streak_milestone';
  userId: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  // score_published
  raceId?: Id<'races'>;
  sessionType?: string;
  points?: number;
  raceName?: string;
  raceSlug?: string;
  season?: number;
  // enriched picks + H2H
  picks?: ScoredPick[];
  h2hScore?: H2HScore | null;
  // joined_league
  leagueId?: Id<'leagues'>;
  leagueName?: string;
  leagueSlug?: string;
  // streak_milestone
  streakCount?: number;
  revCount: number;
  createdAt: number;
  viewerHasReved: boolean;
};

const SESSION_LABELS: Record<string, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function ScoreBar({ points }: { points: number }) {
  const pct = Math.round((points / 25) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-text tabular-nums">
        {points}
        <span className="font-normal text-text-muted">/25</span>
      </span>
    </div>
  );
}

function UserLink({
  username,
  displayName,
}: {
  username?: string;
  displayName?: string;
}) {
  const name = displayName ?? username ?? 'Unknown';
  if (!username) {
    return <span className="font-semibold text-text">{name}</span>;
  }
  return (
    <Link
      to="/p/$username"
      params={{ username }}
      className="font-semibold text-text hover:text-accent"
    >
      {name}
    </Link>
  );
}

function getScoreComment(
  points: number,
  picks: ScoredPick[] | undefined,
): string {
  if (picks && picks.length > 0) {
    const exact = picks.filter((p) => p.points === 5);
    const near = picks.filter((p) => p.points === 3);
    const inTop5 = picks.filter((p) => p.points === 1);
    const missed = picks.filter((p) => p.points === 0);

    if (exact.length === 5) {
      return 'All five called perfectly.';
    }
    if (exact.length === 4) {
      return 'Four exact calls — nearly flawless.';
    }
    if (exact.length === 3) {
      return 'Three spot-on predictions.';
    }
    if (exact.length === 2) {
      return `P${exact[0].predictedPosition} and P${exact[1].predictedPosition} nailed.`;
    }
    if (exact.length === 1 && near.length + inTop5.length === 4) {
      return `P${exact[0].predictedPosition} perfect, rest in the points.`;
    }
    if (exact.length === 1) {
      return `P${exact[0].predictedPosition} called correctly.`;
    }
    if (missed.length === 5) {
      return 'Not a single top-5 pick landed.';
    }
    if (exact.length === 0 && missed.length === 0) {
      return 'All five in the top 5, just the wrong order.';
    }
    if (near.length >= 3) {
      return `${near.length} picks just one spot off.`;
    }
    if (missed.length >= 4) {
      return 'Hard to predict this one.';
    }
    if (near.length >= 2) {
      return `${near.length} picks one position away.`;
    }
    return points >= 15 ? 'Solid read on the session.' : 'Mixed results.';
  }

  // Fallback when no breakdown available
  if (points === 25) {
    return 'Perfect score.';
  }
  if (points >= 20) {
    return 'Excellent session.';
  }
  if (points >= 15) {
    return 'Solid picks.';
  }
  if (points >= 10) {
    return 'Getting there.';
  }
  if (points >= 5) {
    return 'Tough session.';
  }
  return 'Better luck next time.';
}

function H2HPicksDialog({
  userId,
  raceId,
  sessionType,
  displayName,
  onClose,
}: {
  userId: Id<'users'>;
  raceId: Id<'races'>;
  sessionType: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  displayName: string;
  onClose: () => void;
}) {
  const picks = useQuery(api.h2h.getH2HPicksForFeedItem, {
    userId,
    raceId,
    sessionType,
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-4 w-full max-w-xs rounded-xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text">
            {displayName}&apos;s H2H picks
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {picks === undefined ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-surface-muted"
              />
            ))}
          </div>
        ) : !picks || picks.length === 0 ? (
          <p className="text-sm text-text-muted">
            No H2H picks for this session.
          </p>
        ) : (
          <div className="space-y-1.5">
            {picks.map((pick) => {
              const d1Picked = pick.predictedWinnerId === pick.driver1._id;
              const d1Won =
                pick.hasResult && pick.actualWinnerId === pick.driver1._id;
              const d2Won =
                pick.hasResult && pick.actualWinnerId === pick.driver2._id;

              function badgeWrapClass(
                isPicked: boolean,
                isWinner: boolean,
              ): string {
                if (!pick.hasResult) {
                  return isPicked
                    ? 'rounded-md ring-2 ring-accent/60'
                    : 'opacity-40';
                }
                if (isPicked && isWinner) {
                  return 'rounded-md ring-2 ring-success';
                }
                if (isWinner) {
                  return 'rounded-md ring-2 ring-success';
                }
                if (isPicked) {
                  return 'rounded-md ring-2 ring-error/60 opacity-60';
                }
                return 'opacity-25';
              }

              return (
                <div
                  key={pick.matchupId}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-muted/50"
                >
                  {/* Team label */}
                  <span className="w-[4.5rem] shrink-0 truncate text-[10px] text-text-muted">
                    {pick.team}
                  </span>

                  {/* Driver 1 */}
                  <span className={badgeWrapClass(d1Picked, d1Won)}>
                    <DriverBadge
                      code={pick.driver1.code}
                      team={pick.driver1.team}
                      displayName={pick.driver1.displayName}
                      nationality={pick.driver1.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="shrink-0 text-[10px] text-text-muted/50">
                    vs
                  </span>

                  {/* Driver 2 */}
                  <span className={badgeWrapClass(!d1Picked, d2Won)}>
                    <DriverBadge
                      code={pick.driver2.code}
                      team={pick.driver2.team}
                      displayName={pick.driver2.displayName}
                      nationality={pick.driver2.nationality}
                      size="sm"
                    />
                  </span>

                  {/* Result */}
                  <span
                    className={[
                      'ml-auto shrink-0 text-xs font-bold',
                      !pick.hasResult
                        ? 'text-text-muted/40'
                        : pick.correct
                          ? 'text-success'
                          : 'text-error',
                    ].join(' ')}
                  >
                    {!pick.hasResult ? '–' : pick.correct ? '✓' : '✗'}
                  </span>
                </div>
              );
            })}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 border-t border-border pt-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-success" />
                winner
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-accent/60" />
                picked
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm opacity-60 ring-2 ring-error/60" />
                wrong pick
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function ItemHeader({
  event,
  icon,
}: {
  event: FeedEvent;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/p/$username"
        params={{ username: event.username ?? '' }}
        className="shrink-0"
        tabIndex={event.username ? 0 : -1}
      >
        <Avatar
          avatarUrl={event.avatarUrl}
          username={event.username}
          size="sm"
        />
      </Link>
      <div className="min-w-0 flex-1">
        <UserLink username={event.username} displayName={event.displayName} />
      </div>
      <span className="shrink-0 text-text-muted/50">{icon}</span>
    </div>
  );
}

function ItemFooter({
  event,
  comment,
}: {
  event: FeedEvent;
  comment?: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <RevButton
        feedEventId={event._id}
        revCount={event.revCount}
        viewerHasReved={event.viewerHasReved}
      />
      <span className="text-xs text-text-muted" suppressHydrationWarning>
        · {formatRelativeTime(event.createdAt)}
      </span>
      {comment && (
        <span className="ml-auto text-xs text-text-muted/70 italic">
          {comment}
        </span>
      )}
    </div>
  );
}

function ScorePublishedItem({ event }: { event: FeedEvent }) {
  const [h2hOpen, setH2hOpen] = useState(false);

  return (
    <>
      <div className="space-y-2.5">
        {/* Header: avatar + name + icon */}
        <div className="flex items-center gap-2">
          <Link
            to="/p/$username"
            params={{ username: event.username ?? '' }}
            className="shrink-0"
            tabIndex={event.username ? 0 : -1}
          >
            <Avatar
              avatarUrl={event.avatarUrl}
              username={event.username}
              size="sm"
            />
          </Link>
          <p className="min-w-0 flex-1 text-sm leading-snug text-text-muted">
            <UserLink
              username={event.username}
              displayName={event.displayName}
            />{' '}
            in{' '}
            {event.raceSlug ? (
              <Link
                to="/races/$raceSlug"
                params={{ raceSlug: event.raceSlug }}
                className="font-medium text-text hover:text-accent"
              >
                {event.raceName}
              </Link>
            ) : (
              <span className="font-medium text-text">{event.raceName}</span>
            )}{' '}
            <span className="text-text-muted">
              {SESSION_LABELS[event.sessionType ?? ''] ?? event.sessionType}
            </span>
          </p>
          <Trophy className="h-4 w-4 shrink-0 text-text-muted/50" />
        </div>

        {/* Scored picks */}
        {event.picks && event.picks.length > 0 && (
          <div className="flex gap-2">
            {event.picks.map((pick) => (
              <div
                key={pick.predictedPosition}
                className="flex flex-col items-center gap-0.5"
              >
                <span className="text-[10px] font-medium text-text-muted">
                  P{pick.predictedPosition}
                </span>
                <ScoredDriverBadge
                  code={pick.code}
                  team={pick.team}
                  displayName={pick.displayName}
                  nationality={pick.nationality}
                  pickPoints={pick.points}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Score + H2H */}
        <div className="flex items-center gap-3">
          <ScoreBar points={event.points ?? 0} />
          {event.h2hScore && event.raceId && event.sessionType && (
            <button
              type="button"
              onClick={() => setH2hOpen(true)}
              className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text"
            >
              H2H {event.h2hScore.correctPicks}/{event.h2hScore.totalPicks}
            </button>
          )}
        </div>

        {/* Footer */}
        <ItemFooter
          event={event}
          comment={
            event.points !== undefined
              ? getScoreComment(event.points, event.picks)
              : undefined
          }
        />
      </div>

      {h2hOpen && event.raceId && event.sessionType && (
        <H2HPicksDialog
          userId={event.userId}
          raceId={event.raceId}
          sessionType={
            event.sessionType as 'quali' | 'sprint_quali' | 'sprint' | 'race'
          }
          displayName={event.displayName ?? event.username ?? 'User'}
          onClose={() => setH2hOpen(false)}
        />
      )}
    </>
  );
}

function JoinedLeagueItem({ event }: { event: FeedEvent }) {
  return (
    <div className="space-y-2.5">
      <ItemHeader event={event} icon={<Users className="h-4 w-4" />} />
      <p className="text-sm text-text-muted">
        joined{' '}
        {event.leagueSlug ? (
          <Link
            to="/leagues/$slug"
            params={{ slug: event.leagueSlug }}
            className="font-medium text-text hover:text-accent"
          >
            {event.leagueName}
          </Link>
        ) : (
          <span className="font-medium text-text">{event.leagueName}</span>
        )}
      </p>
      <ItemFooter event={event} />
    </div>
  );
}

function StreakMilestoneItem({ event }: { event: FeedEvent }) {
  return (
    <div className="space-y-2.5">
      <ItemHeader
        event={event}
        icon={<Flame className="h-4 w-4 text-accent" />}
      />
      <p className="text-sm text-text-muted">
        on a{' '}
        <span className="font-bold text-accent">{event.streakCount}-race</span>{' '}
        scoring streak
      </p>
      <ItemFooter event={event} />
    </div>
  );
}

export function FeedItem({ event }: { event: FeedEvent }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      {event.type === 'score_published' ? (
        <ScorePublishedItem event={event} />
      ) : event.type === 'streak_milestone' ? (
        <StreakMilestoneItem event={event} />
      ) : (
        <JoinedLeagueItem event={event} />
      )}
    </div>
  );
}

export function FeedItemSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-surface-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-2.5 w-24 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}

export function FeedEmptyState({
  icon: Icon = Gauge,
  message,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  message: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-text-muted/50" />
      <p className="text-sm text-text-muted">{message}</p>
    </div>
  );
}

export type SessionHeader = {
  raceName: string;
  sessionType: string;
  raceSlug?: string;
  top5: {
    code: string;
    displayName: string;
    team: string;
    nationality?: string;
  }[];
};

export function SessionSeparator({ session }: { session: SessionHeader }) {
  const label = SESSION_LABELS[session.sessionType] ?? session.sessionType;
  const countryCode = session.raceSlug
    ? getCountryCodeForRace({ slug: session.raceSlug })
    : null;

  const header = (
    <div className="flex items-center gap-2">
      {countryCode ? (
        <RaceFlag countryCode={countryCode} size="sm" />
      ) : (
        <Flag className="h-3.5 w-3.5 shrink-0 text-accent" />
      )}
      <span className="text-xs font-semibold text-text">
        {session.raceName}
      </span>
      <span className="text-xs text-text-muted">— {label}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
      {session.raceSlug ? (
        <Link to="/races/$raceSlug" params={{ raceSlug: session.raceSlug }}>
          {header}
        </Link>
      ) : (
        header
      )}
      <div className="mt-3 flex gap-3">
        {session.top5.map((driver, i) => (
          <div key={driver.code} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-text-muted">
              P{i + 1}
            </span>
            <DriverBadge
              code={driver.code}
              team={driver.team}
              displayName={driver.displayName}
              nationality={driver.nationality}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
