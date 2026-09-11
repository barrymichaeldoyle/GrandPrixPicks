import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { Avatar } from '../Avatar';
import { RaceFlag } from '../RaceFlag';
import { ReactionButton } from '../ReactionButton';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Flag, Trophy } from 'lucide-react';
import { useConstructorOrder } from '@/hooks/useConstructorOrder';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';
import { EmptySlot, PickSlot, ResultSlot } from './PickSlot';
import type { FeedEvent, SessionHeader } from './types';
import { useReorderFlip } from '../feed/useReorderFlip';
import { FeedItem } from './FeedItem';
import { H2HPicksDialog } from './H2HPicksDialog';
import { ReactionsModal } from './ReactionsModal';
import { UserLink } from './UserLink';
import {
  type LiveBoard,
  type LivePlayer,
  liveSessionType,
  rankLiveGroup,
} from '../feed/liveSessionBoard';
import {
  SESSION_LABELS,
  eventTotalPoints,
  formatRelativeTime,
} from './helpers';

/**
 * Edge to edge on a phone, the same bleed the picks card, practice and news
 * already take. A nested frame here was a card sitting in the gutter between
 * full-bleed neighbours. `-mt-px` collapses the stacked hairline where this
 * block meets the one above it.
 *
 * No `overflow-hidden` on this wrapper: the session header is sticky, and a
 * clipping ancestor would pin it inside the card instead of under the nav.
 * The header and the last row keep their own radii, so the corners still clip.
 */
const SESSION_GROUP_SHELL = 'bg-surface max-md:-mx-4 max-md:-mt-px';

/*
 * The five slots are one grid, shared by the result row in the header and by
 * every player row below it. Same columns, same padding, so a pick sits
 * directly under the position it was aiming at and the sticky header doubles as
 * a column key while you scroll the players.
 */
const SLOT_GRID = 'grid w-full max-w-[26rem] grid-cols-5 gap-1';

/** Every band in the group reads the same: quiet eyebrow, then the row. */
function BandLabel({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted/80">
      {children}
    </span>
  );
}

/* No "Result" eyebrow here: the session line above already says "Race Result",
   and repeating it costs a row of height in a header that has to stay short
   enough to sit on screen while you scroll the players under it. */
function ResultRow({ top5 }: { top5: SessionHeader['top5'] }) {
  /* Inert for a published result, which never reorders; the point of it is a
     running order, where a driver moving from P4 to P2 should be seen crossing
     the two cells rather than appearing in one. */
  const slotsRef = useReorderFlip<HTMLDivElement>();

  return (
    <div className="space-y-1">
      <div className={SLOT_GRID}>
        {top5.map((_, i) => (
          <span
            key={i}
            className="gpp-mono text-center text-[10px] leading-none text-text-muted/80"
          >
            P{i + 1}
          </span>
        ))}
      </div>
      <div className={SLOT_GRID} ref={slotsRef}>
        {top5.map((driver, i) => (
          <div key={driver.code} data-flip-key={driver.code}>
            <ResultSlot
              code={driver.code}
              team={driver.team}
              displayName={driver.displayName}
              position={i + 1}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Teammate duels, winners only: reading a code here means they beat the other car. */
function H2HWinnersRow({ h2h }: { h2h: NonNullable<SessionHeader['h2h']> }) {
  return (
    <div className="space-y-1">
      <BandLabel>H2H won</BandLabel>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {h2h.map((duel) => {
          const color =
            (duel.winner.team && TEAM_COLORS[duel.winner.team]) ||
            FALLBACK_TEAM_COLOR;
          return (
            <span
              key={duel.team}
              title={`${duel.winner.displayName} beat ${duel.loser.displayName} (${duel.team})`}
              className="gpp-team-bar flex h-4 items-center pr-1 pl-1.5"
              style={{ '--team-colour': color } as CSSProperties}
            >
              <span className="gpp-mono text-[10px] leading-none tracking-data text-text-muted uppercase">
                {duel.winner.code}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function SessionLeaderboardRow({
  event,
  isViewer,
  isLast,
  live,
}: {
  event: FeedEvent;
  isViewer: boolean;
  isLast: boolean;
  /**
   * This player's score against the running order, when the session is still
   * out on track. It stands in for the published numbers the row normally
   * reads off the event, which do not exist yet: the same layout, sourced from
   * the live snapshot instead of the result.
   */
  live?: LivePlayer;
}) {
  const [h2hOpen, setH2hOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  // Subscribed here rather than inside the dialog: the order has to be in hand
  // before the dialog opens, or its placeholder rows sort by last season and
  // reshuffle when the picks land.
  const teamOrder = useConstructorOrder();
  const total = live ? live.total : eventTotalPoints(event);

  const picks = [...(live?.picks ?? event.picks ?? [])].sort(
    (a, b) => a.predictedPosition - b.predictedPosition,
  );

  return (
    <>
      <div
        data-flip-key={event._id}
        className={`space-y-1.5 border border-t-0 border-border px-2.5 py-2 max-md:border-x-0 ${
          isLast ? 'rounded-b-sm max-md:rounded-none' : ''
        } ${isViewer ? 'bg-accent/8 ring-1 ring-accent/40 ring-inset' : 'bg-surface'}`}
      >
        {/* Identity line. No "You" chip (the highlighted row says it) and no
            rank number: the rows are already in points order, and a numbered
            column here competes with the leaderboard, which is where a
            standing is a fact rather than a by-product of sorting. */}
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
          <p className="flex min-w-0 flex-1 items-baseline gap-x-1.5 text-sm leading-snug">
            <UserLink
              username={event.username}
              displayName={event.displayName}
            />
            {event.username && (
              <span className="hidden truncate text-xs text-text-muted sm:inline">
                @{event.username}
              </span>
            )}
          </p>
          {(live ?? event.h2hScore) && event.raceId && event.sessionType && (
            <button
              type="button"
              onClick={() => setH2hOpen(true)}
              className="gpp-mono inline-flex shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[10px] font-semibold tracking-data text-text-muted uppercase transition-colors hover:border-accent/60 hover:text-accent"
            >
              {/* Live has no denominator: duels are only settled as the cars
                  cross the line, so "3/11" would read as eight lost duels when
                  eight of them are still being raced. */}
              {live
                ? `H2H +${live.h2hPoints}`
                : `H2H ${event.h2hScore?.correctPicks}/${event.h2hScore?.totalPicks}`}
            </button>
          )}
          <span className="gpp-mono shrink-0 text-sm font-semibold text-accent">
            +{total}
          </span>
        </div>

        {/* Picks, one per finishing slot, banded with their score colour. One
            wrap flow rather than a breakpoint: the reaction sits beside the
            slots whenever the row is genuinely wide enough for both, which a
            viewport query cannot know inside a 300px rail. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          {/* The floor is what makes the wrap happen: without it the slots
              squeeze to keep the reaction on the line and the codes collide. */}
          <div className={`${SLOT_GRID} min-w-[15rem] flex-1`}>
            {Array.from({ length: 5 }, (_, i) => {
              const pick = picks[i];
              return pick ? (
                <PickSlot
                  key={pick.predictedPosition}
                  code={pick.code}
                  team={pick.team}
                  displayName={pick.displayName}
                  points={pick.points}
                  predictedPosition={pick.predictedPosition}
                />
              ) : (
                <EmptySlot key={`empty-${i}`} />
              );
            })}
          </div>

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

      {h2hOpen && event.raceId && event.sessionType && event.userId && (
        <H2HPicksDialog
          userId={event.userId}
          raceId={event.raceId}
          sessionType={
            event.sessionType as 'quali' | 'sprint_quali' | 'sprint' | 'race'
          }
          displayName={event.displayName ?? event.username ?? 'User'}
          teamOrder={teamOrder}
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

// Scored sessions render as a ranked mini-leaderboard; a session still out on
// track renders as the same board against the running order; anything else
// falls back to the standard stacked rows.

export function SessionGroup({
  session,
  events,
  viewerId,
}: {
  session: SessionHeader;
  events: FeedEvent[];
  viewerId?: Id<'users'>;
}) {
  const isScored =
    session.top5.length > 0 &&
    events.every((e) => e.type === 'score_published' && e.points !== undefined);

  /*
   * Every player the group is about, so the board comes back scored for all of
   * them in one read rather than a subscription per row. Sorted so the args are
   * stable across renders — the feed's own order is by recency and shuffles as
   * events arrive, and an unstable arg here is a new cache key each time.
   */
  const raceId = events.find((event) => event.raceId)?.raceId;
  const sessionType = liveSessionType(
    events.find((event) => event.sessionType)?.sessionType,
  );
  const userIds = [
    ...new Set(events.flatMap((event) => (event.userId ? [event.userId] : []))),
  ].sort();
  const liveBoard = useQuery(
    api.liveScoring.getLiveSessionBoard,
    !isScored && raceId && sessionType && userIds.length > 0
      ? { raceId, sessionType, userIds }
      : 'skip',
  ) as LiveBoard | null | undefined;

  /* The board re-ranks on every snapshot, and the rows are the same players
     each time: a re-sort should look like the places changing hands, which is
     the only thing that did change. */
  const liveRowsRef = useReorderFlip<HTMLDivElement>();

  const sessionWithTime = {
    ...session,
    // Feed events arrive newest-first, so the group should inherit its newest
    // activity rather than the oldest row at the bottom of the group.
    createdAt: events[0]?.createdAt,
  };

  if (!isScored) {
    const live = rankLiveGroup(events, liveBoard);

    if (live) {
      return (
        <div className={SESSION_GROUP_SHELL}>
          <SessionSeparator
            session={{
              ...sessionWithTime,
              top5: liveBoard!.top5.map((driver) => ({
                ...driver,
                team: driver.team ?? undefined,
              })),
              // No live duel band. The header's winners row is a settled
              // statement about eleven pairs, and a car ahead on lap 30 has
              // not won anything; each player's own duels are one tap away on
              // their row instead.
              h2h: undefined,
            }}
            grouped
            live
          />
          <div ref={liveRowsRef}>
            {live.events.map((event) => (
              <SessionLeaderboardRow
                key={event._id}
                event={event}
                live={live.playerFor(event)}
                isViewer={!!viewerId && event.userId === viewerId}
                isLast={false}
              />
            ))}
          </div>
          {/* Inside the shell, not under it: a margin here was a stripe of
              page between two full-bleed cards. The same sentence the race
              page's live board carries, for the same reason: every number
              above this line moves, and a position read as a result is the
              one misreading to rule out. */}
          <p className="rounded-b-sm border border-t-0 border-border px-2.5 py-2 text-[11px] text-text-muted max-md:rounded-none max-md:border-x-0">
            Running order is live and can change, including after the flag.
          </p>
        </div>
      );
    }

    return (
      <div className={SESSION_GROUP_SHELL}>
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

  // Best total (Top 5 + H2H) first. The order is the whole statement; the
  // positions themselves belong to the leaderboard, not to a feed card.
  const ranked = [...events].sort(
    (a, b) => eventTotalPoints(b) - eventTotalPoints(a),
  );

  return (
    <div className={SESSION_GROUP_SHELL}>
      <SessionSeparator session={sessionWithTime} grouped />
      {ranked.map((event, i) => (
        <SessionLeaderboardRow
          key={event._id}
          event={event}
          isViewer={!!viewerId && event.userId === viewerId}
          isLast={i === ranked.length - 1}
        />
      ))}
    </div>
  );
}

function SessionSeparator({
  session,
  grouped,
  pending = false,
  live = false,
}: {
  session: SessionHeader;
  grouped?: boolean;
  pending?: boolean;
  /** The five in `session.top5` are the running order, not the result. */
  live?: boolean;
}) {
  const label = SESSION_LABELS[session.sessionType] ?? session.sessionType;
  const hasResult = session.top5.length > 0;
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
    // The panel pins under the site nav, so it is "stuck" once the sentinel
    // has passed behind the nav — not once it leaves the viewport.
    const navHeight =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--nav-height',
        ),
      ) || 0;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { rootMargin: `-${navHeight}px 0px 0px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [grouped]);

  const roundedClass = grouped
    ? isStuck
      ? 'rounded-none'
      : 'max-md:rounded-none md:rounded-t-sm'
    : 'max-md:rounded-none md:rounded-sm';

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
            <p className="flex items-center gap-1 text-xs text-text-muted">
              {live ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent motion-safe:animate-pulse"
                  aria-hidden
                />
              ) : hasResult ? (
                <Trophy className="h-3 w-3 shrink-0 text-accent" aria-hidden />
              ) : null}
              {/* "As it stands", not "Result": these five are the order on
                  track this second, and the same five cells directly above
                  everyone's picks is exactly where that could be misread. */}
              {live
                ? `${label} as it stands`
                : hasResult
                  ? `${label} Result`
                  : label}
            </p>
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
            {live ? (
              <span className="block text-[9px] font-medium text-accent">
                Live
              </span>
            ) : pending ? (
              <span className="block text-[9px] font-medium text-accent">
                Awaiting results
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* The published result and who won each teammate duel. Both belong to
          the header panel, so they share its raised surface and are set apart
          by spacing alone — a rule between two labelled bands is a separator
          doing work the labels already did. */}
      {hasResult && (
        <div className="space-y-2.5 bg-surface-elevated px-2.5 pt-2 pb-2.5">
          <ResultRow top5={session.top5} />
          {session.h2h && session.h2h.length > 0 && (
            <H2HWinnersRow h2h={session.h2h} />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {grouped && (
        <div ref={sentinelRef} className="-mb-px h-px" aria-hidden="true" />
      )}
      <div
        className={[
          'overflow-hidden bg-surface',
          // Pinned below the site nav: at top-0 the flag/race row slid under
          // the (z-50) header and only the result band stayed visible.
          grouped
            ? 'sticky top-(--nav-height) z-10 border border-border max-md:border-x-0'
            : 'border border-border',
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
