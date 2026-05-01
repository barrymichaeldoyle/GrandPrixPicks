import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Bell, CheckCheck, Lock, Trophy } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Avatar } from './Avatar';
import { getCountryCodeForRace, RaceFlag } from './RaceCard';

type RevActor = {
  userId?: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isFollowed: boolean;
};

type Notification = {
  _id: Id<'inAppNotifications'>;
  type: 'rev_received' | 'results_published' | 'session_locked';
  readAt?: number;
  createdAt: number;
  raceId?: Id<'races'>;
  sessionType?: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  raceName?: string;
  raceSlug?: string;
  points?: number;
  actorUserId?: Id<'users'>;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  feedEventId?: Id<'feedEvents'>;
  // Grouped rev fields (set by backend when multiple actors rev the same post)
  actors?: RevActor[];
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

function RevIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 11.5 A6 6 0 1 1 13.5 11.5" />
      <path d="M8 8 L5.5 5.5" />
      <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
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

function firstName(actor: RevActor): string {
  const name = actor.displayName ?? actor.username ?? 'Someone';
  return name.split(' ')[0];
}

function RevActorNames({ actors }: { actors: RevActor[] }) {
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

function NotificationItem({
  notification,
  onClose,
  onMarkRead,
}: {
  notification: Notification;
  onClose: () => void;
  onMarkRead: (
    id: Id<'inAppNotifications'>,
    feedEventId?: Id<'feedEvents'>,
  ) => void;
}) {
  const isUnread = !notification.readAt;

  function handleClick() {
    if (isUnread) {
      onMarkRead(notification._id, notification.feedEventId);
    }
    onClose();
  }

  const sessionLabel = notification.sessionType
    ? SESSION_LABELS[notification.sessionType]
    : '';

  const itemClass = `block transition-colors hover:bg-surface-muted/50 ${isUnread ? 'bg-accent/[0.04]' : ''}`;

  function LeftCol({ children }: { children: React.ReactNode }) {
    return <div className="flex w-8 shrink-0 items-start">{children}</div>;
  }

  const rightMeta = (
    <div className="flex shrink-0 flex-col items-end justify-between self-stretch pl-1">
      <span
        className={`mt-1 h-2 w-2 rounded-full bg-accent ${isUnread ? 'opacity-100' : 'opacity-0'}`}
      />
      <span className="text-[10px] whitespace-nowrap text-text-muted">
        {timeAgo(notification.createdAt)}
      </span>
    </div>
  );

  if (notification.type === 'rev_received') {
    const actors = notification.actors ?? [
      {
        userId: notification.actorUserId,
        username: notification.actorUsername,
        displayName: notification.actorDisplayName,
        avatarUrl: notification.actorAvatarUrl,
        isFollowed: false,
      },
    ];
    const primary = actors[0];

    return (
      <Link
        to={
          notification.feedEventId
            ? '/feed/$feedEventId'
            : notification.raceSlug
              ? '/races/$raceSlug'
              : '/feed'
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
              <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">
                <RevIcon className="h-2.5 w-2.5" />
              </span>
            </div>
          </LeftCol>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm text-text">
              <RevActorNames actors={actors} />{' '}
              <span className="inline-flex items-center gap-0.75">
                <span className="text-text-muted">gave you a</span>{' '}
                <span className="inline-flex items-center gap-0.75 font-semibold text-accent">
                  <RevIcon className="relative top-0.25 h-3.5 w-3.5" />
                  Rev
                </span>
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
    );
  }

  if (notification.type === 'results_published') {
    const hasPoints = notification.points !== undefined;

    return (
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: notification.raceSlug ?? '' }}
        onClick={handleClick}
        className={itemClass}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <LeftCol>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/15 text-green-500">
              <Trophy className="h-4 w-4" />
            </div>
          </LeftCol>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm leading-snug text-text">
                Results are in
              </p>
              {hasPoints && (
                <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-500">
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
    );
  }

  // session_locked
  return (
    <Link to="/feed" onClick={handleClick} className={itemClass}>
      <div className="flex items-start gap-3 px-4 py-3">
        <LeftCol>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
            <Lock className="h-4 w-4" />
          </div>
        </LeftCol>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm leading-snug text-text">
            {notification.raceName && sessionLabel
              ? `${sessionLabel} is now locked`
              : 'A session has locked'}
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
            See your friends&apos; picks
          </p>
        </div>
        {rightMeta}
      </div>
    </Link>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const result = useQuery(api.inAppNotifications.getMyNotifications);
  const markAllReadMutation = useMutation(api.inAppNotifications.markAllRead);
  const markReadMutation = useMutation(api.inAppNotifications.markRead);

  const notifications = result?.notifications ?? [];
  const unreadCount = result?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const ac = new AbortController();
    const { signal } = ac;

    document.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setOpen(false);
          buttonRef.current?.focus();
        }
      },
      { signal },
    );

    return () => ac.abort();
  }, [open]);

  function handleMarkRead(
    id: Id<'inAppNotifications'>,
    feedEventId?: Id<'feedEvents'>,
  ) {
    markReadMutation({
      notificationId: id,
      feedEventId,
    });
  }

  function handleButtonClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setOpen((value) => !value);
  }

  function handleBackdropPointerDown(
    event: ReactMouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleBackdropClick(event: ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  }

  if (result === undefined) {
    return (
      <button
        type="button"
        aria-label="Notifications"
        className="relative rounded-full border border-transparent p-2 text-accent transition-colors hover:border-border hover:bg-surface-muted/45 hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Bell className="h-5 w-5" />
      </button>
    );
  }

  if (result === null) {
    return null;
  }

  const panel = open
    ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onPointerDown={handleBackdropPointerDown}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-[90] bg-black/40"
          />
          <div
            ref={panelRef}
            className="fixed inset-x-2 top-[65px] z-[100] overflow-hidden rounded-xl border border-white/10 bg-surface/95 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:inset-x-auto sm:top-[calc(61px+0.5rem)] sm:right-2 sm:w-96 md:right-4 md:w-[28rem]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="text-sm font-semibold text-text">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllReadMutation({})}
                  className="flex items-center gap-1.5 text-xs text-accent transition-colors hover:text-accent-hover"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[460px] divide-y divide-border/50 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-text-muted">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <NotificationItem
                    key={n._id}
                    notification={n as Notification}
                    onClose={() => setOpen(false)}
                    onMarkRead={handleMarkRead}
                  />
                ))
              )}
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        onClick={handleButtonClick}
        className="relative rounded-full border border-transparent p-2 text-accent transition-colors hover:border-border hover:bg-surface-muted/45 hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] leading-none font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
