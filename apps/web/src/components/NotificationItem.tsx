import type { ReactionType } from '@grandprixpicks/shared/reactions';
import { REACTION_BY_TYPE } from '@grandprixpicks/shared/reactions';
import type { Id } from '@convex-generated/dataModel';
import { SESSION_LABELS } from '@/lib/sessions';
import { Link } from '@tanstack/react-router';
import { Check, Gavel, Lock, Megaphone, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { Avatar } from './Avatar';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from './RaceFlag';

type ReactionActor = {
  userId?: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowed: boolean;
  reactionType: ReactionType;
};

export type Notification = {
  _id: Id<'inAppNotifications'>;
  type:
    | 'rev_received'
    | 'results_published'
    | 'results_amended'
    | 'session_locked'
    | 'announcement';
  readAt?: number;
  createdAt: number;
  raceId?: Id<'races'>;
  sessionType?: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  raceName?: string;
  raceSlug?: string;
  points?: number;
  amendmentNote?: string;
  // announcement
  title?: string;
  body?: string;
  linkPath?: string;
  actorUserId?: Id<'users'>;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  reactionType?: ReactionType;
  feedEventId?: Id<'feedEvents'>;
  // Grouped reaction fields.
  actors?: ReactionActor[];
  totalReactionCount?: number;
  totalRevCount?: number;
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationRaceChip({
  raceSlug,
  raceName,
  sessionType,
}: {
  raceSlug?: string;
  raceName?: string;
  sessionType?: Notification['sessionType'];
}) {
  if (!raceName) {
    return null;
  }

  const countryCode = raceSlug
    ? getCountryCodeForRace({ slug: raceSlug })
    : null;
  const sessionLabel = sessionType ? SESSION_LABELS[sessionType] : null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-surface-muted/55 px-2.5 py-1 text-xs font-medium text-text">
      {countryCode ? (
        <RaceFlag
          countryCode={countryCode}
          size="sm"
          className="rounded-[2px] shadow-none ring-0"
        />
      ) : null}
      <span>{sessionLabel ?? raceName}</span>
    </span>
  );
}

function firstName(actor: ReactionActor): string {
  const name = actor.displayName ?? actor.username ?? 'Someone';
  return name.split(' ')[0];
}

function ReactionActorNames({ actors }: { actors: ReactionActor[] }) {
  if (actors.length === 0) {
    return <span className="font-semibold text-text">Someone</span>;
  }

  function Name({ children }: { children: ReactNode }) {
    return (
      <span className="font-semibold text-accent transition-colors group-hover:text-accent-hover">
        {children}
      </span>
    );
  }

  if (actors.length === 1) {
    const a = actors[0];
    const label = a.displayName ?? a.username ?? 'Someone';
    return <Name>{label}</Name>;
  }
  if (actors.length === 2) {
    return (
      <>
        <Name>{firstName(actors[0])}</Name>
        <span className="font-semibold text-text"> and </span>
        <Name>{firstName(actors[1])}</Name>
      </>
    );
  }
  if (actors.length === 3) {
    return (
      <>
        <Name>{firstName(actors[0])}</Name>
        <span className="font-semibold text-text">, </span>
        <Name>{firstName(actors[1])}</Name>
        <span className="font-semibold text-text"> and </span>
        <Name>{firstName(actors[2])}</Name>
      </>
    );
  }
  const others = actors.length - 2;
  return (
    <>
      <Name>{firstName(actors[0])}</Name>
      <span className="font-semibold text-text">, </span>
      <Name>{firstName(actors[1])}</Name>
      <span className="font-semibold text-text"> and {others} others</span>
    </>
  );
}

export function NotificationItem({
  notification,
  onClose,
  onMarkRead,
}: {
  notification: Notification;
  onClose?: () => void;
  onMarkRead: (
    id: Id<'inAppNotifications'>,
    feedEventId?: Id<'feedEvents'>,
  ) => void;
}) {
  const isUnread = !notification.readAt;

  function markRead() {
    onMarkRead(notification._id, notification.feedEventId);
  }

  function handleClick() {
    if (isUnread) {
      markRead();
    }
    onClose?.();
  }

  const sessionLabel = notification.sessionType
    ? SESSION_LABELS[notification.sessionType]
    : '';

  const itemClass = `block w-full text-left transition-colors hover:bg-surface-muted/50 ${isUnread ? 'bg-accent/[0.04]' : ''}`;

  function LeftCol({ children }: { children: React.ReactNode }) {
    return <div className="flex w-8 shrink-0 items-start">{children}</div>;
  }

  const created = new Date(notification.createdAt);

  const rightMeta = (
    <div className="flex shrink-0 flex-col items-end justify-between self-stretch pl-1">
      {/* Reserves the corner the mark-as-read control is positioned over, so
          read and unread rows share one layout. */}
      <span aria-hidden className="mt-1 h-2 w-2" />
      <time
        dateTime={created.toISOString()}
        title={created.toLocaleString()}
        className="text-xs whitespace-nowrap text-text-muted"
      >
        {timeAgo(notification.createdAt)}
      </time>
    </div>
  );

  /**
   * The row is one big link, so the per-item control cannot live inside it —
   * nested interactive elements are invalid and unreachable by keyboard. It is
   * positioned over the dot's corner instead, and doubles as the unread marker.
   */
  const unreadControl = isUnread ? (
    <button
      type="button"
      onClick={markRead}
      // top-2/right-2 puts the 24px hit area's centre exactly where the old
      // static dot sat, so nothing moves when a row is read.
      className="group/read absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none"
    >
      <span className="sr-only">Mark as read</span>
      <span
        aria-hidden
        className="h-2 w-2 rounded-full bg-accent group-hover/read:hidden"
      />
      <Check
        aria-hidden
        className="hidden h-3.5 w-3.5 text-accent group-hover/read:block"
      />
    </button>
  ) : null;

  function Row({ children }: { children: ReactNode }) {
    return (
      <li className="relative">
        {children}
        {unreadControl}
      </li>
    );
  }

  const unreadLabel = isUnread ? (
    <span className="sr-only">Unread notification. </span>
  ) : null;

  if (notification.type === 'rev_received') {
    const actors = notification.actors ?? [
      {
        userId: notification.actorUserId,
        username: notification.actorUsername,
        displayName: notification.actorDisplayName,
        avatarUrl: notification.actorAvatarUrl,
        isFollowed: false,
        reactionType: notification.reactionType ?? 'fire',
      },
    ];
    const primary = actors[0];
    const reactionEmojis = [
      ...new Set(
        actors.map(
          (actor) => REACTION_BY_TYPE[actor.reactionType ?? 'fire'].emoji,
        ),
      ),
    ]
      .slice(0, 3)
      .join('');

    return (
      <Row>
        <Link
          to={
            notification.feedEventId
              ? '/feed/$feedEventId'
              : notification.raceSlug
                ? '/races/$raceSlug'
                : '/'
          }
          params={
            notification.feedEventId
              ? { feedEventId: notification.feedEventId }
              : notification.raceSlug
                ? { raceSlug: notification.raceSlug }
                : undefined
          }
          onClick={handleClick}
          className={itemClass}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <LeftCol>
              <div className="relative">
                <Avatar
                  avatarUrl={primary.avatarUrl}
                  username={primary.username}
                  size="sm"
                />
                <span className="absolute -right-1.5 -bottom-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface px-0.5 text-[10px] ring-1 ring-border">
                  {REACTION_BY_TYPE[primary.reactionType ?? 'fire'].emoji}
                </span>
              </div>
            </LeftCol>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm text-text">
                {unreadLabel}
                <ReactionActorNames actors={actors} />{' '}
                <span className="inline-flex items-center gap-1">
                  <span className="text-text-muted">reacted to your pick</span>
                  <span aria-label="Reactions">{reactionEmojis}</span>
                </span>
              </p>
              {notification.raceName && (
                <div className="mt-1.5">
                  <NotificationRaceChip
                    raceSlug={notification.raceSlug}
                    raceName={notification.raceName}
                    sessionType={notification.sessionType}
                  />
                </div>
              )}
            </div>
            {rightMeta}
          </div>
        </Link>
      </Row>
    );
  }

  if (notification.type === 'results_published') {
    const hasPoints = notification.points !== undefined;
    const resultTitle = sessionLabel
      ? `${sessionLabel} results are in`
      : 'Results are in';

    return (
      <Row>
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: notification.raceSlug ?? '' }}
          search={
            notification.sessionType
              ? { session: notification.sessionType }
              : undefined
          }
          onClick={handleClick}
          className={itemClass}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <LeftCol>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                <Trophy className="h-4 w-4" />
              </div>
            </LeftCol>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm leading-snug text-text">
                  {unreadLabel}
                  {resultTitle}
                </p>
                {hasPoints && (
                  <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                    +{notification.points} pts
                  </span>
                )}
              </div>
              {notification.raceName && (
                <div className="mt-2">
                  <NotificationRaceChip
                    raceSlug={notification.raceSlug}
                    raceName={notification.raceName}
                    sessionType={notification.sessionType}
                  />
                </div>
              )}
            </div>
            {rightMeta}
          </div>
        </Link>
      </Row>
    );
  }

  if (notification.type === 'results_amended') {
    const hasPoints = notification.points !== undefined;
    const amendedTitle = sessionLabel
      ? `${sessionLabel} results were amended`
      : 'Results were amended';

    return (
      <Row>
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: notification.raceSlug ?? '' }}
          search={
            notification.sessionType
              ? { session: notification.sessionType }
              : undefined
          }
          onClick={handleClick}
          className={itemClass}
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <LeftCol>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Gavel className="h-4 w-4" />
              </div>
            </LeftCol>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-sm leading-snug text-text">
                  {unreadLabel}
                  {amendedTitle}
                </p>
                {hasPoints && (
                  <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                    now +{notification.points} pts
                  </span>
                )}
              </div>
              {notification.amendmentNote && (
                <p className="mt-1 text-xs leading-snug text-text-muted">
                  {notification.amendmentNote}
                </p>
              )}
              {notification.raceName && (
                <div className="mt-2">
                  <NotificationRaceChip
                    raceSlug={notification.raceSlug}
                    raceName={notification.raceName}
                    sessionType={notification.sessionType}
                  />
                </div>
              )}
            </div>
            {rightMeta}
          </div>
        </Link>
      </Row>
    );
  }

  if (notification.type === 'announcement') {
    const content = (
      <div className="flex items-start gap-3 px-4 py-3">
        <LeftCol>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Megaphone className="h-4 w-4" />
          </div>
        </LeftCol>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm leading-snug font-medium text-text">
            {unreadLabel}
            {notification.title}
          </p>
          {notification.body && (
            <p className="mt-1 text-xs leading-snug text-text-muted">
              {notification.body}
            </p>
          )}
          {notification.linkPath && (
            <p className="mt-1.5 text-xs font-medium text-accent">Read more</p>
          )}
        </div>
        {rightMeta}
      </div>
    );

    // linkPath is set by an admin broadcast, so it is always an internal path.
    // Without one there is nowhere to go, so the row drops its hover affordance
    // rather than pretending to be clickable; the corner control still marks it
    // read.
    return (
      <Row>
        {notification.linkPath ? (
          <Link
            to={notification.linkPath}
            onClick={handleClick}
            className={itemClass}
          >
            {content}
          </Link>
        ) : (
          <div className={isUnread ? 'bg-accent/[0.04]' : undefined}>
            {content}
          </div>
        )}
      </Row>
    );
  }

  // session_locked — the race page is where the locked picks actually are;
  // older notifications predate the slug being stored, so those fall back to
  // the dashboard, which carries the same activity stream the feed page did.
  return (
    <Row>
      <Link
        to={notification.raceSlug ? '/races/$raceSlug' : '/'}
        params={
          notification.raceSlug
            ? { raceSlug: notification.raceSlug }
            : undefined
        }
        search={
          notification.raceSlug && notification.sessionType
            ? { session: notification.sessionType }
            : undefined
        }
        onClick={handleClick}
        className={itemClass}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <LeftCol>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
              <Lock className="h-4 w-4" />
            </div>
          </LeftCol>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm leading-snug text-text">
              {unreadLabel}
              {notification.raceName && sessionLabel
                ? `${sessionLabel} picks are locked`
                : 'Session picks are locked'}
            </p>
            {notification.raceName && (
              <div className="mt-2">
                <NotificationRaceChip
                  raceSlug={notification.raceSlug}
                  raceName={notification.raceName}
                  sessionType={notification.sessionType}
                />
              </div>
            )}
            <p className="mt-1.5 text-xs text-text-muted">
              See how everyone lined up
            </p>
          </div>
          {rightMeta}
        </div>
      </Link>
    </Row>
  );
}
