import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { Avatar } from '../Avatar';
import { RaceFlag } from '../RaceFlag';
import { ReactionButton } from '../ReactionButton';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { podiumClasses } from '@/lib/podium';
import { useEffect, useRef, useState } from 'react';
import { Flag, Trophy } from 'lucide-react';
import { DriverBadge, ScoredDriverBadge } from '../DriverBadge';
import type { FeedEvent, SessionHeader } from './types';
import { FeedItem } from './FeedItem';
import { H2HPicksDialog } from './H2HPicksDialog';
import { ReactionsModal } from './ReactionsModal';
import { UserLink } from './UserLink';
import {
  SESSION_LABELS,
  eventTotalPoints,
  formatRelativeTime,
} from './helpers';

function RankMedal({ rank }: { rank: number | null }) {
  if (rank === null) {
    return <span className="mt-0.5 h-6 w-6 shrink-0" aria-hidden />;
  }

  const medal = podiumClasses(rank);

  if (medal) {
    return (
      <span
        className={`gpp-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold ${medal}`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span className="gpp-mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold text-text-muted/70">
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
        <span className="text-xs font-semibold tracking-label uppercase">
          Result
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {top5.map((driver, i) => (
          <div key={driver.code} className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium text-text-muted">
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
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const total = eventTotalPoints(event);

  return (
    <>
      <div
        className={`flex items-start gap-2.5 border border-t-0 border-border px-2.5 py-2 ${
          isLast ? 'rounded-b-sm' : ''
        } ${isViewer ? 'bg-accent/8 ring-1 ring-accent/40 ring-inset' : 'bg-surface'}`}
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
                <span className="rounded-sm bg-accent/15 px-1.5 py-px text-xs font-semibold tracking-label text-accent uppercase">
                  You
                </span>
              )}
              {event.username && (
                <span className="truncate text-xs text-text-muted">
                  @{event.username}
                </span>
              )}
            </p>
            <span className="gpp-mono shrink-0 text-sm font-semibold text-accent">
              +{total}
            </span>
          </div>

          {/* One wrap flow: badges fill first, reactions stay right and
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
                className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/20"
              >
                H2H {event.h2hScore.correctPicks}/{event.h2hScore.totalPicks}
              </button>
            )}
            <div className="ml-auto shrink-0">
              <ReactionButton
                feedEventId={event._id}
                reactionCount={event.reactionCount}
                reactionCounts={event.reactionCounts}
                viewerReaction={event.viewerReaction}
                onCountClick={() => setReactionsOpen(true)}
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
      {reactionsOpen && (
        <ReactionsModal
          feedEventId={event._id}
          onClose={() => setReactionsOpen(false)}
        />
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
    // Feed events arrive newest-first, so the group should inherit its newest
    // activity rather than the oldest row at the bottom of the group.
    createdAt: events[0]?.createdAt,
  };

  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);

  if (!isScored) {
    return (
      <div>
        <SessionSeparator session={sessionWithTime} grouped pending />
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

function SessionSeparator({
  session,
  grouped,
  pending = false,
  showResult = true,
}: {
  session: SessionHeader;
  grouped?: boolean;
  pending?: boolean;
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
      : 'rounded-t-sm'
    : 'rounded-sm';

  const content = (
    <div className="overflow-hidden">
      {/* Top row: flag + race name/session/time */}
      <div className="flex items-stretch border-b border-border bg-surface-elevated">
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
          <div className="shrink-0 text-right">
            {session.createdAt && (
              <span
                className="block text-xs text-text-muted"
                suppressHydrationWarning
              >
                {formatRelativeTime(session.createdAt)}
              </span>
            )}
            {pending ? (
              <span className="block text-[9px] font-semibold tracking-label text-accent uppercase">
                Awaiting results
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom row: actual results */}
      {showResult && session.top5.length > 0 && (
        <div className="flex gap-2 px-3 pt-2 pb-2.5">
          {session.top5.map((driver, i) => (
            <div key={driver.code} className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-text-muted">
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
