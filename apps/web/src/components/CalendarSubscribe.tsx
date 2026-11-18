import { CalendarPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import { locksCalendarLinks } from '@/lib/locksCalendar';
import { siteConfig } from '@/lib/site';

const DONE_KEY = 'gpp:calendar-subscribe-done';

function readDone(): boolean {
  try {
    return window.localStorage.getItem(DONE_KEY) !== null;
  } catch {
    return false;
  }
}

function markDone(reason: 'subscribed' | 'dismissed') {
  try {
    window.localStorage.setItem(DONE_KEY, reason);
  } catch {
    // Without storage the offer comes back next visit, which is harmless.
  }
}

/**
 * The offer to subscribe to the pick-lock calendar (`lib/locksCalendar.ts`),
 * on a saved card.
 *
 * New players saved one card and never came back for a second weekend, and
 * neither email nor push was reaching them. A calendar alert needs no
 * permission and lands where they already look. Shown once a card is saved,
 * until they subscribe or close it; client-only, so the server render never
 * guesses at a choice it cannot see.
 */
export function CalendarSubscribe({ surface }: { surface: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- reads storage, which the server render cannot see
    setVisible(!readDone());
  }, []);

  if (!visible) {
    return null;
  }

  const links = locksCalendarLinks(siteConfig.url);
  function subscribed(provider: 'apple' | 'google') {
    captureAnalyticsEvent('calendar_subscribe_clicked', { provider, surface });
    markDone('subscribed');
    // Left on screen until the next visit: the calendar app takes over the
    // tab, and a row vanishing under the tap would read as a failure.
  }

  const linkClass =
    'inline-flex min-h-9 items-center rounded-sm border border-border-strong px-3 text-sm font-medium text-text hover:bg-surface-hover pointer-coarse:min-h-11';

  return (
    <div
      className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4"
      data-testid="calendar-subscribe"
    >
      <p className="flex min-w-0 flex-1 basis-56 items-center gap-2 text-sm text-text-muted">
        <CalendarPlus className="h-4 w-4 shrink-0" aria-hidden />
        Get every weekend’s lock time in your calendar.
      </p>
      <div className="flex items-center gap-2">
        <a
          href={links.webcal}
          className={linkClass}
          onClick={() => subscribed('apple')}
        >
          Apple or Outlook
        </a>
        <a
          href={links.google}
          target="_blank"
          rel="noreferrer"
          className={linkClass}
          onClick={() => subscribed('google')}
        >
          Google
        </a>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-text-muted hover:bg-surface-hover hover:text-text pointer-coarse:h-11 pointer-coarse:w-11"
          aria-label="No thanks"
          onClick={() => {
            captureAnalyticsEvent('calendar_subscribe_dismissed', { surface });
            markDone('dismissed');
            setVisible(false);
          }}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
