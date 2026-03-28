import { api } from '@convex-generated/api';
import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import { Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Bell, CheckCheck, Gauge, Lock, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from './Avatar';

type Notification = {
  _id: string;
  type: 'rev_received' | 'results_published' | 'session_locked';
  readAt?: number;
  createdAt: number;
  raceId?: string;
  sessionType?: 'quali' | 'sprint_quali' | 'sprint' | 'race';
  raceName?: string;
  raceSlug?: string;
  points?: number;
  actorUserId?: string;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  feedEventId?: string;
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

function NotificationItem({
  notification,
  onClose,
  onMarkRead,
}: {
  notification: Notification;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}) {
  const isUnread = !notification.readAt;

  function handleClick() {
    if (isUnread) {
      onMarkRead(notification._id);
    }
    onClose();
  }

  const sessionLabel = notification.sessionType
    ? SESSION_LABELS[notification.sessionType]
    : '';

  if (notification.type === 'rev_received') {
    const actor =
      notification.actorDisplayName ?? notification.actorUsername ?? 'Someone';
    const content = notification.raceName
      ? `${actor} reved your ${sessionLabel} prediction — ${notification.raceName}`
      : `${actor} reved your prediction`;

    const inner = (
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="relative shrink-0">
          <Avatar
            avatarUrl={notification.actorAvatarUrl}
            username={notification.actorUsername}
            size="sm"
          />
          <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-white">
            <Gauge className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-text">{content}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {timeAgo(notification.createdAt)}
          </p>
        </div>
        {isUnread && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
        )}
      </div>
    );

    if (notification.raceSlug) {
      return (
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: notification.raceSlug }}
          onClick={handleClick}
          className="block transition-colors hover:bg-surface-muted/50"
        >
          {inner}
        </Link>
      );
    }

    return (
      <Link
        to="/feed"
        onClick={handleClick}
        className="block transition-colors hover:bg-surface-muted/50"
      >
        {inner}
      </Link>
    );
  }

  if (notification.type === 'results_published') {
    const content =
      notification.raceName && sessionLabel
        ? `${sessionLabel} results are in — ${notification.raceName}`
        : 'Your session results are ready';
    const pts =
      notification.points !== undefined ? ` · ${notification.points} pts` : '';

    return (
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: notification.raceSlug ?? '' }}
        onClick={handleClick}
        className="block transition-colors hover:bg-surface-muted/50"
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-500">
            <Trophy className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-text">
              {content}
              <span className="font-semibold text-accent">{pts}</span>
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {timeAgo(notification.createdAt)}
            </p>
          </div>
          {isUnread && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
          )}
        </div>
      </Link>
    );
  }

  // session_locked
  const content =
    notification.raceName && sessionLabel
      ? `${sessionLabel} is locked — ${notification.raceName}`
      : 'A session has locked';

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: notification.raceSlug ?? '' }}
      onClick={handleClick}
      className="block transition-colors hover:bg-surface-muted/50"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-500">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-text">{content}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            See your friends&apos; picks · {timeAgo(notification.createdAt)}
          </p>
        </div>
        {isUnread && (
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
        )}
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

  // Close on outside click
  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!target) {
        return;
      }
      if (panelRef.current?.contains(target)) {
        return;
      }
      if (buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  function handleMarkRead(id: string) {
    markReadMutation({ notificationId: id as any });
  }

  if (result === undefined) {
    // Loading — show placeholder bell
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
    // Not signed in — don't render
    return null;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full border border-transparent p-2 text-accent transition-colors hover:border-border hover:bg-surface-muted/45 hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] leading-none font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          {/* Header */}
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

          {/* List */}
          <div className="max-h-[420px] divide-y divide-border/50 overflow-y-auto">
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
      )}
    </div>
  );
}
