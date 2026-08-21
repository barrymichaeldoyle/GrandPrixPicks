import { api } from '@convex-generated/api';
import { useEffect } from 'react';

import { useQuery } from '@/integrations/convex/query';
import { PLAIN_FAVICON_HREF, UNREAD_FAVICON_HREF } from '@/lib/faviconBadge';
import { stripUnreadTitlePrefix, unreadTitlePrefix } from '@/lib/unreadTitle';

/**
 * Carries the unread count out of the page and into the browser chrome: the tab
 * title, the tab icon, and the OS badge on an installed app.
 *
 * Renders nothing visible. It reads the same count query as
 * {@link NotificationBell}, so the two can never disagree, and it inherits that
 * badge's meaning exactly: unread means *unread*, not unvisited. Opening
 * /notifications does not clear it, because opening the page does not mark
 * anything read.
 *
 * Mounted once, from the root shell, and only after load — see
 * `AuthenticatedDeferredFeature` in `routes/__root.tsx`. Reached through
 * `integrations/clerk/runtime-bundle` rather than imported directly, so it
 * rides the authenticated runtime chunk its siblings already pull in instead
 * of weighing down the client entry a signed-out visitor pays for.
 */
export function UnreadTabIndicator() {
  // The count query, not the list: the same subscription the header bell
  // already holds, so this costs one more reader of a live value and no extra
  // round trip.
  const unread = useQuery(api.inAppNotifications.getMyUnreadCount);
  const count = unread?.count ?? 0;
  const hasMore = unread?.hasMore ?? false;

  useUnreadDocumentTitle(unreadTitlePrefix(count, hasMore));
  useUnreadAppBadge(count, hasMore);

  // Always rendered, both states, rather than mounted only while unread. React
  // hoists this into <head> after the root route's icon links, and last one
  // wins; swapping the href back to the plain mark is what makes the browser
  // re-read it. Removing the element instead leaves some browsers showing the
  // badged icon they already fetched.
  return (
    <link
      rel="icon"
      type="image/svg+xml"
      href={count > 0 ? UNREAD_FAVICON_HREF : PLAIN_FAVICON_HREF}
    />
  );
}

/**
 * Keeps `(3) ` on the front of whatever title the current route set.
 *
 * The router owns `document.title` and rewrites it on every navigation, so a
 * one-shot write here would survive exactly until the next route change. The
 * observer is the cheap way to stay in front of it without reaching into the
 * router's head handling: when something else writes a title, we put the prefix
 * back. Head mutations are rare (a navigation, a per-route meta update) and the
 * callback returns immediately when the title is already ours.
 */
function useUnreadDocumentTitle(prefix: string) {
  useEffect(() => {
    if (prefix.length === 0) {
      // Nothing to hold in place: strip anything left over from a higher count
      // and let the router have the title back.
      document.title = stripUnreadTitlePrefix(document.title);
      return;
    }

    /** The last title this effect wrote, which is how it ignores its own edits. */
    let written = '';

    function apply() {
      const next = prefix + stripUnreadTitlePrefix(document.title);
      if (document.title === next) {
        return;
      }
      written = next;
      document.title = next;
    }

    apply();

    // The whole head, not the <title> node: a route change can replace the
    // element rather than edit its text, and an observer bound to the old node
    // would quietly stop firing.
    const observer = new MutationObserver(() => {
      if (document.title !== written) {
        apply();
      }
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      document.title = stripUnreadTitlePrefix(document.title);
    };
  }, [prefix]);
}

/**
 * The OS-level badge, for viewers who installed the PWA.
 *
 * A no-op in an ordinary tab, which is the point: it costs three lines and
 * gives installed users a real dock/taskbar count that a favicon dot cannot.
 */
function useUnreadAppBadge(count: number, hasMore: boolean) {
  useEffect(() => {
    const badging = appBadging();
    if (!badging) {
      return;
    }
    // `hasMore` means the backend stopped counting at 99, so 99 is the honest
    // number to show; the OS renders "99+" past its own limit anyway.
    const total = hasMore ? 99 : count;
    // These reject rather than throw when the document is not installed or the
    // permission is absent, and neither is worth reporting.
    if (total > 0) {
      badging.setAppBadge(total).catch(() => {});
    } else {
      badging.clearAppBadge().catch(() => {});
    }
  }, [count, hasMore]);

  // Unmount only: clearing between counts would flash the badge off and on
  // every time one arrives.
  useEffect(() => {
    return () => {
      appBadging()
        ?.clearAppBadge()
        .catch(() => {});
    };
  }, []);
}

interface AppBadging {
  setAppBadge: (contents?: number) => Promise<void>;
  clearAppBadge: () => Promise<void>;
}

function appBadging(): AppBadging | null {
  const candidate = navigator as Navigator & Partial<AppBadging>;
  if (!candidate.setAppBadge || !candidate.clearAppBadge) {
    return null;
  }
  return {
    setAppBadge: candidate.setAppBadge.bind(navigator),
    clearAppBadge: candidate.clearAppBadge.bind(navigator),
  };
}
