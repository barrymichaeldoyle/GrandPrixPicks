import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Check, Flag, Flame, Gauge, Trophy, Users, X } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { captureAnalyticsEvent } from '@/lib/analytics';

import { Avatar } from './Avatar';
import { DriverBadge, ScoredDriverBadge } from './DriverBadge';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { SESSION_LABELS_FULL } from '@/lib/sessions';
import { RaceFlag } from './RaceFlag';
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
  type:
    | 'score_published'
    | 'session_locked'
    | 'joined_league'
    | 'streak_milestone';
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
  recentRevUsers?: {
    userId: Id<'users'>;
    username?: string;
    avatarUrl?: string;
  }[];
  createdAt: number;
  viewerHasReved: boolean;
};

// Feed events carry sessionType as a plain string, so widen the shared map.
const SESSION_LABELS: Record<string, string> = SESSION_LABELS_FULL;

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
      search={{ from: undefined, fromLabel: undefined }}
      className="font-bold text-accent hover:text-accent-hover"
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
      return 'Four exact calls. Nearly flawless.';
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
    if (exact.length === 0 && missed.length === 0 && near.length === 0) {
      return 'All five in the top 5, just the wrong order.';
    }
    if (exact.length === 0 && missed.length === 0) {
      return 'Every pick scored, nothing spot on though.';
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
  const ROW_COUNT = 11;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-4 w-full max-w-xs rounded-xl border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className="font-semibold text-text">Head to Head</h3>
            <p className="text-xs text-text-muted">
              {displayName}&apos;s picks
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-0.5 text-text-muted hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-border" />

        {/* Rows */}
        <div className="py-1">
          {picks === undefined ? (
            [...Array(ROW_COUNT)].map((_, i) => (
              <div key={i} className="flex h-9 items-center gap-2 px-4">
                <div className="h-2 w-20 shrink-0 animate-pulse rounded bg-surface-muted" />
                <div className="ml-auto h-6 w-10 shrink-0 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-2 w-2.5 shrink-0 animate-pulse rounded bg-surface-muted" />
                <div className="h-6 w-10 shrink-0 animate-pulse rounded-md bg-surface-muted" />
                <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-surface-muted" />
              </div>
            ))
          ) : !picks || picks.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">
              No H2H picks for this session.
            </p>
          ) : (
            picks.map((pick) => {
              const d1Picked = pick.predictedWinnerId === pick.driver1._id;

              return (
                <div
                  key={pick.matchupId}
                  className="flex h-9 items-center gap-2 px-4"
                >
                  <span className="w-20 shrink-0 truncate text-[10px] leading-none text-text-muted">
                    {pick.team}
                  </span>

                  <span
                    className={`ml-auto inline-flex shrink-0 ${d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver1.code}
                      team={pick.driver1.team}
                      displayName={pick.driver1.displayName}
                      nationality={pick.driver1.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="shrink-0 text-[10px] leading-none text-text-muted/40">
                    vs
                  </span>

                  <span
                    className={`inline-flex shrink-0 ${!d1Picked ? '' : 'opacity-30'}`}
                  >
                    <DriverBadge
                      code={pick.driver2.code}
                      team={pick.driver2.team}
                      displayName={pick.driver2.displayName}
                      nationality={pick.driver2.nationality}
                      size="sm"
                    />
                  </span>

                  <span className="flex w-4 shrink-0 items-center">
                    {pick.hasResult ? (
                      pick.correct ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <X className="h-4 w-4 text-error" />
                      )
                    ) : null}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ItemHeader({ event, icon }: { event: FeedEvent; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/p/$username"
        params={{ username: event.username ?? '' }}
        search={{ from: undefined, fromLabel: undefined }}
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

function FollowButton({
  userId,
  isFollowing,
}: {
  userId: Id<'users'>;
  isFollowing: boolean;
}) {
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);

  const following = optimistic ?? isFollowing;

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOptimistic(!following);
    try {
      if (following) {
        await unfollow({ followeeId: userId });
        captureAnalyticsEvent('user_unfollowed', {
          followee_id: userId,
          source: 'feed_item',
        });
      } else {
        await follow({ followeeId: userId });
        captureAnalyticsEvent('user_followed', {
          followee_id: userId,
          source: 'feed_item',
        });
      }
    } catch {
      setOptimistic(null);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        following
          ? hovered
            ? 'border border-error/40 bg-error/10 text-error'
            : 'border border-border bg-surface-muted text-text-muted'
          : 'border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
      }`}
    >
      {following ? (hovered ? 'Unfollow' : 'Following') : 'Follow'}
    </button>
  );
}

function RevsModal({
  feedEventId,
  onClose,
}: {
  feedEventId: Id<'feedEvents'>;
  onClose: () => void;
}) {
  const users = useQuery(api.feed.getRevUsers, { feedEventId });
  const me = useQuery(api.users.me, {});
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const followedSet = new Set(followedIds ?? []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text">Rev'd by</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-72 overflow-y-auto py-2">
          {users === undefined ? (
            <div className="space-y-1 px-4 py-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-surface-muted" />
                  <div className="ml-auto h-6 w-16 animate-pulse rounded-full bg-surface-muted" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-text-muted">No revs yet.</p>
            </div>
          ) : (
            users.map((user) =>
              user ? (
                <div
                  key={user.userId}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-surface-muted"
                >
                  <Link
                    to="/p/$username"
                    params={{ username: user.username ?? '' }}
                    search={{ from: undefined, fromLabel: undefined }}
                    className="flex min-w-0 flex-1 items-center gap-3"
                    onClick={onClose}
                    tabIndex={user.username ? 0 : -1}
                  >
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      username={user.username}
                      size="sm"
                    />
                    <span className="truncate text-sm font-medium text-text">
                      {user.displayName ?? user.username ?? 'Unknown'}
                    </span>
                  </Link>
                  {me && user.userId !== me._id && (
                    <FollowButton
                      userId={user.userId}
                      isFollowing={followedSet.has(user.userId)}
                    />
                  )}
                </div>
              ) : null,
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ItemFooter({
  event,
  grouped,
}: {
  event: FeedEvent;
  grouped?: boolean;
}) {
  const [revsOpen, setRevsOpen] = useState(false);

  return (
    <>
      <div className="-mx-2.5 -mb-2.5 flex items-center justify-between gap-2 px-2.5 py-2">
        <RevButton
          feedEventId={event._id}
          revCount={event.revCount}
          viewerHasReved={event.viewerHasReved}
          recentRevUsers={event.recentRevUsers}
          onCountClick={() => setRevsOpen(true)}
        />
        {!grouped && (
          <span
            className="shrink-0 text-xs text-text-muted"
            suppressHydrationWarning
          >
            {formatRelativeTime(event.createdAt)}
          </span>
        )}
      </div>
      {revsOpen && (
        <RevsModal feedEventId={event._id} onClose={() => setRevsOpen(false)} />
      )}
    </>
  );
}

function ScorePublishedItem({
  event,
  grouped,
}: {
  event: FeedEvent;
  grouped?: boolean;
}) {
  const [h2hOpen, setH2hOpen] = useState(false);
  const [revsOpen, setRevsOpen] = useState(false);
  const isLocked = event.type === 'session_locked';

  return (
    <>
      <div className="space-y-2.5">
        {/* Header: avatar + name */}
        <div className="flex items-center gap-2">
          <Link
            to="/p/$username"
            params={{ username: event.username ?? '' }}
            search={{ from: undefined, fromLabel: undefined }}
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
            <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-snug">
              <UserLink
                username={event.username}
                displayName={event.displayName}
              />
              {event.username && (
                <span className="text-[11px] text-text-muted">
                  @{event.username}
                </span>
              )}
            </p>
            {!grouped && event.raceName && (
              <p className="text-[11px] text-text-muted">
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
                  <span className="font-medium text-text">
                    {event.raceName}
                  </span>
                )}
                {' · '}
                {SESSION_LABELS[event.sessionType ?? ''] ?? event.sessionType}
              </p>
            )}
          </div>
        </div>

        {/* Picks */}
        {event.picks && event.picks.length > 0 && (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {event.picks.map((pick) => (
                <div
                  key={pick.predictedPosition}
                  className="flex flex-col items-center gap-0.5"
                >
                  {!grouped && (
                    <span className="text-[10px] font-medium text-text-muted">
                      P{pick.predictedPosition}
                    </span>
                  )}
                  {isLocked ? (
                    <DriverBadge
                      code={pick.code}
                      team={pick.team}
                      displayName={pick.displayName}
                      nationality={pick.nationality}
                      size="sm"
                    />
                  ) : (
                    <ScoredDriverBadge
                      code={pick.code}
                      team={pick.team}
                      displayName={pick.displayName}
                      nationality={pick.nationality}
                      pickPoints={pick.points}
                      size="sm"
                    />
                  )}
                  {!isLocked && (
                    <span
                      className={`relative right-0.5 pt-1 text-[10px] leading-none font-semibold tabular-nums ${
                        pick.points === 5
                          ? 'text-success'
                          : pick.points === 3
                            ? 'text-warning'
                            : pick.points === 1
                              ? 'text-text-muted'
                              : 'text-error/60'
                      }`}
                    >
                      +{pick.points}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {!isLocked &&
              event.h2hScore &&
              event.raceId &&
              event.sessionType && (
                <button
                  type="button"
                  onClick={() => setH2hOpen(true)}
                  className="mb-0.5 inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/20"
                >
                  H2H {event.h2hScore.correctPicks}/{event.h2hScore.totalPicks}
                  <svg
                    className="h-2.5 w-2.5 opacity-70"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </button>
              )}
          </div>
        )}

        {/* Total points + comment (scored) or pending indicator (locked) */}
        {isLocked ? (
          <p className="text-xs text-text-muted/60 italic">
            Waiting for results...
          </p>
        ) : (
          event.points !== undefined &&
          (() => {
            const total = event.points + (event.h2hScore?.points ?? 0);
            return (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-bold text-accent tabular-nums">
                  +{total} {total === 1 ? 'point' : 'points'}
                </span>
                <p className="text-xs text-text-muted italic">
                  {getScoreComment(event.points, event.picks)}
                </p>
              </div>
            );
          })()
        )}

        <div className="-mx-2.5 -mb-2.5 flex items-center justify-between gap-2 px-2.5 py-2">
          <RevButton
            feedEventId={event._id}
            revCount={event.revCount}
            viewerHasReved={event.viewerHasReved}
            recentRevUsers={event.recentRevUsers}
            onCountClick={() => setRevsOpen(true)}
          />
          {!grouped && (
            <span
              className="shrink-0 text-xs text-text-muted"
              suppressHydrationWarning
            >
              {formatRelativeTime(event.createdAt)}
            </span>
          )}
        </div>
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
      {revsOpen && (
        <RevsModal feedEventId={event._id} onClose={() => setRevsOpen(false)} />
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

export function FeedItem({
  event,
  grouped,
  position,
}: {
  event: FeedEvent;
  grouped?: boolean;
  position?: 'first' | 'middle' | 'last';
}) {
  const radiusClass =
    position === 'first'
      ? 'rounded-t-none'
      : position === 'middle'
        ? 'rounded-none'
        : position === 'last'
          ? 'rounded-b-xl rounded-t-none'
          : 'rounded-xl';

  const borderClass =
    position === 'first' || position === 'middle' || position === 'last'
      ? 'border-t-0'
      : '';

  return (
    <div
      className={`border border-border bg-surface p-2.5 ${radiusClass} ${borderClass}`}
    >
      {event.type === 'score_published' || event.type === 'session_locked' ? (
        <ScorePublishedItem event={event} grouped={grouped} />
      ) : event.type === 'streak_milestone' ? (
        <StreakMilestoneItem event={event} />
      ) : (
        <JoinedLeagueItem event={event} />
      )}
    </div>
  );
}

function eventTotalPoints(event: FeedEvent): number {
  return (event.points ?? 0) + (event.h2hScore?.points ?? 0);
}

function RankMedal({ rank }: { rank: number | null }) {
  if (rank === null) {
    return <span className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />;
  }

  const medal =
    rank === 1
      ? 'bg-warning/15 text-warning ring-1 ring-warning/30'
      : rank === 2
        ? 'bg-text-muted/15 text-text-muted ring-1 ring-text-muted/25'
        : rank === 3
          ? 'bg-orange-400/15 text-orange-400 ring-1 ring-orange-400/30'
          : null;

  if (medal) {
    return (
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${medal}`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold text-text-muted/70 tabular-nums">
      {rank}
    </span>
  );
}

// 66px gutter matches a player row's rank + avatar so the P1–P5 badges line up
// as column headers above every player's picks.
function AnswerKeyRow({ top5 }: { top5: SessionHeader['top5'] }) {
  return (
    <div className="flex items-end gap-2.5 border border-t-0 border-border bg-surface-muted/40 px-2.5 py-2">
      <div className="flex h-8 w-[66px] shrink-0 items-center gap-1.5 text-text-muted">
        <Trophy className="h-4 w-4 shrink-0 text-accent" />
        <span className="text-[10px] font-semibold tracking-wide uppercase">
          Result
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {top5.map((driver, i) => (
          <div key={driver.code} className="flex flex-col items-center gap-0.5">
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

function SessionLeaderboardRow({
  event,
  rank,
  isViewer,
  isLast,
}: {
  event: FeedEvent;
  rank: number | null;
  isViewer: boolean;
  isLast: boolean;
}) {
  const [h2hOpen, setH2hOpen] = useState(false);
  const [revsOpen, setRevsOpen] = useState(false);
  const total = eventTotalPoints(event);

  return (
    <>
      <div
        className={`flex items-start gap-2.5 border border-t-0 border-border px-2.5 py-2 ${
          isLast ? 'rounded-b-xl' : ''
        } ${isViewer ? 'bg-accent/8 ring-1 ring-inset ring-accent/40' : 'bg-surface'}`}
      >
        <RankMedal rank={rank} />
        <Link
          to="/p/$username"
          params={{ username: event.username ?? '' }}
          search={{ from: undefined, fromLabel: undefined }}
          className="mt-0.5 shrink-0"
          tabIndex={event.username ? 0 : -1}
        >
          <Avatar
            avatarUrl={event.avatarUrl}
            username={event.username}
            size="sm"
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-sm leading-snug">
              <UserLink
                username={event.username}
                displayName={event.displayName}
              />
              {isViewer && (
                <span className="rounded-full bg-accent/15 px-1.5 py-px text-[10px] font-semibold tracking-wide text-accent uppercase">
                  You
                </span>
              )}
              {event.username && (
                <span className="truncate text-[11px] text-text-muted">
                  @{event.username}
                </span>
              )}
            </p>
            <span className="shrink-0 text-sm font-bold text-accent tabular-nums">
              +{total}
            </span>
          </div>

          {/* One wrap flow: badges fill first, Rev's ml-auto keeps it right and
              lets it drop to its own line on narrow screens. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(event.picks ?? []).map((pick) => (
              <ScoredDriverBadge
                key={pick.predictedPosition}
                code={pick.code}
                team={pick.team}
                displayName={pick.displayName}
                nationality={pick.nationality}
                pickPoints={pick.points}
                hideDot
                size="sm"
              />
            ))}
            {event.h2hScore && event.raceId && event.sessionType && (
              <button
                type="button"
                onClick={() => setH2hOpen(true)}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/20"
              >
                H2H {event.h2hScore.correctPicks}/{event.h2hScore.totalPicks}
              </button>
            )}
            <div className="ml-auto shrink-0">
              <RevButton
                feedEventId={event._id}
                revCount={event.revCount}
                viewerHasReved={event.viewerHasReved}
                recentRevUsers={event.recentRevUsers}
                onCountClick={() => setRevsOpen(true)}
              />
            </div>
          </div>
        </div>
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
      {revsOpen && (
        <RevsModal feedEventId={event._id} onClose={() => setRevsOpen(false)} />
      )}
    </>
  );
}

// Scored sessions render as a ranked mini-leaderboard; locked/pending ones fall
// back to the standard stacked rows.
export function SessionGroup({
  session,
  events,
  viewerId,
}: {
  session: SessionHeader;
  events: FeedEvent[];
  viewerId?: Id<'users'>;
}) {
  const sessionWithTime = {
    ...session,
    createdAt: events[events.length - 1]?.createdAt,
  };

  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);

  if (!isScored) {
    return (
      <div>
        <SessionSeparator session={sessionWithTime} grouped />
        {events.map((event, i) => (
          <FeedItem
            key={event._id}
            event={event}
            grouped
            position={
              i === events.length - 1 ? 'last' : i === 0 ? 'first' : 'middle'
            }
          />
        ))}
      </div>
    );
  }

  // Rank by total points (Top 5 + H2H), descending. Equal scores share a rank.
  // A lone row isn't a ranking, so skip the medal there.
  const ranked = [...events].sort(
    (a, b) => eventTotalPoints(b) - eventTotalPoints(a),
  );
  const showRanks = ranked.length > 1;
  let lastPoints: number | null = null;
  let lastRank = 0;

  return (
    <div>
      <SessionSeparator session={sessionWithTime} grouped showResult={false} />
      <AnswerKeyRow top5={session.top5} />
      {ranked.map((event, i) => {
        const pts = eventTotalPoints(event);
        if (pts !== lastPoints) {
          lastRank = i + 1;
          lastPoints = pts;
        }
        return (
          <SessionLeaderboardRow
            key={event._id}
            event={event}
            rank={showRanks ? lastRank : null}
            isViewer={!!viewerId && event.userId === viewerId}
            isLast={i === ranked.length - 1}
          />
        );
      })}
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
  title,
  message,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-text-muted/50" />
      {title ? (
        <h2 className="text-lg font-semibold text-text">{title}</h2>
      ) : null}
      <p className={`${title ? 'mt-2' : ''} text-sm text-text-muted`}>
        {message}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

type SessionHeader = {
  raceName: string;
  sessionType: string;
  raceSlug?: string;
  createdAt?: number;
  top5: {
    code: string;
    displayName: string;
    team?: string;
    nationality?: string;
  }[];
};

function SessionSeparator({
  session,
  grouped,
  showResult = true,
}: {
  session: SessionHeader;
  grouped?: boolean;
  showResult?: boolean;
}) {
  const label = SESSION_LABELS[session.sessionType] ?? session.sessionType;
  const countryCode = session.raceSlug
    ? getCountryCodeForRace({ slug: session.raceSlug })
    : null;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    if (!grouped) {
      return;
    }
    const el = sentinelRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setIsStuck(!entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [grouped]);

  const roundedClass = grouped
    ? isStuck
      ? 'rounded-none'
      : 'rounded-t-xl'
    : 'rounded-xl';

  const content = (
    <div className="overflow-hidden">
      {/* Top row: flag + race name/session/time */}
      <div className="flex items-stretch border-b border-border">
        {countryCode ? (
          <div className="h-10 shrink-0 self-stretch overflow-hidden border-r border-border">
            <RaceFlag countryCode={countryCode} size="full" />
          </div>
        ) : (
          <div className="flex w-10 shrink-0 items-center justify-center">
            <Flag className="h-4 w-4 text-accent" />
          </div>
        )}
        <div className="flex flex-1 items-center justify-between gap-2 px-2 py-1">
          <div>
            <p className="font-title text-sm leading-tight font-semibold text-text">
              {session.raceName}
            </p>
            <p className="text-xs text-text-muted">{label}</p>
          </div>
          {session.createdAt && (
            <span
              className="shrink-0 text-xs text-text-muted"
              suppressHydrationWarning
            >
              {formatRelativeTime(session.createdAt)}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: actual results */}
      {showResult && session.top5.length > 0 && (
        <div className="flex gap-2 px-3 pt-2 pb-2.5">
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
      )}
    </div>
  );

  return (
    <>
      {grouped && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
      <div
        className={[
          'overflow-hidden border border-border bg-surface',
          grouped ? 'sticky top-0 z-10' : '',
          roundedClass,
        ].join(' ')}
      >
        {session.raceSlug ? (
          <Link to="/races/$raceSlug" params={{ raceSlug: session.raceSlug }}>
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </>
  );
}
