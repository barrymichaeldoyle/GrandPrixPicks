import { sanitizeInternalPath } from '@grandprixpicks/shared/internalPath';
import type { Id } from '@convex-generated/dataModel';
import { SESSION_LABELS } from '@/lib/sessions';
import { Link } from '@tanstack/react-router';
import { Check, Gavel, Lock, Megaphone, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { abbreviateGrandPrix } from '@/lib/display';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { RaceFlag } from './RaceFlag';

export type Notification = {
  _id: Id<'inAppNotifications'>;
  type:
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
};

/**
 * Relative for as long as relative means something. "142d ago" is a worse
 * answer than a date: past a month nobody is counting days, and the season is
 * long enough that these rows really do get that old.
 */
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
  if (days < 30) {
    return `${days}d ago`;
  }
  const created = new Date(ts);
  return created.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(created.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: 'numeric' }),
  });
}

/**
 * The row's identity slot: the country flag, wearing a small badge for the
 * kind of notification it is.
 *
 * These rows used to carry a type roundel on the left *and* a flag inside a
 * bordered chip below the title, which is two icons to say one thing. The flag
 * is the part that distinguishes one row from the next — four "results are in"
 * rows differ only by which weekend they belong to — so it takes the slot, and
 * the type rides along as a badge rather than a whole extra element.
 */
function NotificationIcon({
  countryCode,
  tone,
  icon: Icon,
}: {
  countryCode: string | null;
  tone: 'success' | 'warning' | 'accent';
  icon: typeof Trophy;
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/15 text-success'
      : tone === 'warning'
        ? 'bg-warning/15 text-warning'
        : 'bg-accent/15 text-accent';

  if (!countryCode) {
    return (
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${toneClass}`}
      >
        <Icon className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="h-6 w-8 overflow-hidden rounded-[3px] ring-1 ring-border">
        <RaceFlag
          countryCode={countryCode}
          size="full"
          className="rounded-none shadow-none ring-0"
        />
      </div>
      <span
        className={`absolute -right-1.5 -bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-surface ${toneClass}`}
      >
        <Icon className="h-2.5 w-2.5" />
      </span>
    </div>
  );
}

/**
 * One line under the title carrying every scrap of context: which weekend,
 * and when.
 *
 * Both used to cost a line of their own — the race in a bordered chip, the
 * timestamp in a full-height column pinned bottom-right whose width squeezed
 * the title into wrapping. Folding them together took roughly a third off the
 * row height, which on a phone is the difference between four notifications
 * and six.
 */
function NotificationMeta({
  createdAt,
  raceName,
  sessionLabel,
}: {
  createdAt: number;
  raceName?: string;
  /** Only where the title does not already name the session. */
  sessionLabel?: string;
}) {
  const created = new Date(createdAt);
  const parts = [
    raceName ? abbreviateGrandPrix(raceName) : null,
    sessionLabel ?? null,
  ].filter((part): part is string => Boolean(part));

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-text-muted">
      {parts.map((part, index) => (
        <span key={part} className="flex items-center gap-x-1.5">
          <span className={index === 0 ? 'font-medium text-text' : undefined}>
            {part}
          </span>
          <span aria-hidden>·</span>
        </span>
      ))}
      <time dateTime={created.toISOString()} title={created.toLocaleString()}>
        {timeAgo(createdAt)}
      </time>
    </p>
  );
}

function NotificationRowBody({
  leading,
  title,
  trailing,
  meta,
  unreadLabel,
}: {
  leading: ReactNode;
  title: ReactNode;
  trailing?: ReactNode;
  meta: ReactNode;
  unreadLabel: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex w-8 shrink-0 items-start pt-0.5">{leading}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2 pr-5">
          <p className="min-w-0 flex-1 text-sm leading-snug text-text">
            {unreadLabel}
            {title}
          </p>
          {trailing}
        </div>
        {meta}
      </div>
    </div>
  );
}

function NotificationRow({
  children,
  unreadControl,
}: {
  children: ReactNode;
  unreadControl: ReactNode;
}) {
  return (
    <li className="relative">
      {children}
      {unreadControl}
    </li>
  );
}

export function NotificationItem({
  notification,
  onClose,
  onMarkRead,
}: {
  notification: Notification;
  onClose?: () => void;
  onMarkRead: (id: Id<'inAppNotifications'>) => void;
}) {
  const isUnread = !notification.readAt;

  function markRead() {
    onMarkRead(notification._id);
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

  const countryCode = notification.raceSlug
    ? getCountryCodeForRace({ slug: notification.raceSlug })
    : null;

  /**
   * Every row is the same three parts: identity on the left, a one-line title
   * with an optional trailing pill, and a meta line under it.
   *
   * `pr-5` on the title line, always, is what reserves the corner the
   * mark-as-read control is positioned over — read and unread rows have to
   * share one layout, or marking a row read would reflow it under the thumb
   * that just did it.
   */
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

  const unreadLabel = isUnread ? (
    <span className="sr-only">Unread notification. </span>
  ) : null;

  if (notification.type === 'results_published') {
    const hasPoints = notification.points !== undefined;
    const resultTitle = sessionLabel
      ? `${sessionLabel} results are in`
      : 'Results are in';

    return (
      <NotificationRow unreadControl={unreadControl}>
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
          <NotificationRowBody
            unreadLabel={unreadLabel}
            leading={
              <NotificationIcon
                countryCode={countryCode}
                tone="success"
                icon={Trophy}
              />
            }
            title={resultTitle}
            trailing={
              hasPoints ? (
                <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                  +{notification.points} pts
                </span>
              ) : null
            }
            meta={
              <NotificationMeta
                createdAt={notification.createdAt}
                raceName={notification.raceName}
              />
            }
          />
        </Link>
      </NotificationRow>
    );
  }

  if (notification.type === 'results_amended') {
    const hasPoints = notification.points !== undefined;
    const amendedTitle = sessionLabel
      ? `${sessionLabel} results were amended`
      : 'Results were amended';

    return (
      <NotificationRow unreadControl={unreadControl}>
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
          <NotificationRowBody
            unreadLabel={unreadLabel}
            leading={
              <NotificationIcon
                countryCode={countryCode}
                tone="warning"
                icon={Gavel}
              />
            }
            title={amendedTitle}
            trailing={
              hasPoints ? (
                <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                  now +{notification.points} pts
                </span>
              ) : null
            }
            meta={
              <>
                <NotificationMeta
                  createdAt={notification.createdAt}
                  raceName={notification.raceName}
                />
                {/* The steward's reason is the point of an amendment, so it
                    keeps its own line rather than being folded into the meta
                    run and truncated. */}
                {notification.amendmentNote && (
                  <p className="mt-1 text-xs leading-snug text-text-muted">
                    {notification.amendmentNote}
                  </p>
                )}
              </>
            }
          />
        </Link>
      </NotificationRow>
    );
  }

  if (notification.type === 'announcement') {
    // Sanitized rather than trusted: the broadcast mutation rejects off-origin
    // targets, and a row that predates that check must not render one either.
    const linkPath = sanitizeInternalPath(notification.linkPath);
    const content = (
      <NotificationRowBody
        unreadLabel={unreadLabel}
        leading={
          // Never race-scoped, so there is no flag to lead with.
          <NotificationIcon countryCode={null} tone="accent" icon={Megaphone} />
        }
        title={<span className="font-medium">{notification.title}</span>}
        meta={
          <>
            {notification.body && (
              <p className="mt-1 text-xs leading-snug text-text-muted">
                {notification.body}
              </p>
            )}
            <NotificationMeta createdAt={notification.createdAt} />
            {linkPath && (
              <p className="mt-1.5 text-xs font-medium text-accent">
                View announcement
              </p>
            )}
          </>
        }
      />
    );

    // Without a link there is nowhere to go, so the row drops its hover
    // affordance rather than pretending to be clickable; the corner control
    // still marks it read.
    return (
      <NotificationRow unreadControl={unreadControl}>
        {linkPath ? (
          <Link to={linkPath} onClick={handleClick} className={itemClass}>
            {content}
          </Link>
        ) : (
          <div className={isUnread ? 'bg-accent/[0.04]' : undefined}>
            {content}
          </div>
        )}
      </NotificationRow>
    );
  }

  // session_locked — the race page is where the locked picks actually are;
  // older notifications predate the slug being stored, so those fall back to
  // the dashboard, which carries the same activity stream the feed page did.
  return (
    <NotificationRow unreadControl={unreadControl}>
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
        <NotificationRowBody
          unreadLabel={unreadLabel}
          leading={
            <NotificationIcon
              countryCode={countryCode}
              tone="warning"
              icon={Lock}
            />
          }
          title={
            notification.raceName && sessionLabel
              ? `${sessionLabel} picks are locked`
              : 'Session picks are locked'
          }
          meta={
            // "See how everyone lined up" used to hang off the end here. It
            // was a caption for a link the whole row already is, and on a
            // longer race name it wrapped the meta line, spending a second
            // line to say nothing the row did not.
            <NotificationMeta
              createdAt={notification.createdAt}
              raceName={notification.raceName}
            />
          }
        />
      </Link>
    </NotificationRow>
  );
}
