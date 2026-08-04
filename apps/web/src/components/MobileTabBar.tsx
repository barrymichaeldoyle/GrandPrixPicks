import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { APP_NAV_TABS, NavTab } from './NavTab';
import { NotificationBell } from './NotificationBell';

/**
 * The signed-in destinations on phones and small tablets.
 *
 * Five labelled header tabs need ~732px of bar, so below the 844px breakpoint
 * the header keeps only the brand and the account tab and the destinations move
 * down here, where they are also easier to reach one-handed. Me deliberately
 * does not repeat in the bar: it stays top-right in the header, where the
 * avatar has always been.
 *
 * Auth state comes from the SSR-resolved session, so the bar is present or
 * absent on the first paint rather than appearing once Clerk boots.
 */
export function MobileTabBar() {
  const { isSignedIn } = useViewerSession();

  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      {/* Fixed bars sit outside the flow, so the last of the page would scroll
          underneath this one. The spacer gives the document a floor. */}
      <div
        aria-hidden="true"
        className="h-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] shrink-0 min-[844px]:hidden"
      />
      <nav
        // Same label as the header's nav on purpose: this replaces it below
        // 844px rather than supplementing it, and `display: none` keeps the
        // other one out of the accessibility tree, so there is never a pair.
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-page pb-[env(safe-area-inset-bottom)] min-[844px]:hidden"
      >
        <div className="mx-auto flex h-(--mobile-nav-height) w-full max-w-(--page-max) items-stretch">
          {APP_NAV_TABS.map((tab) => (
            <NavTab key={tab.to} tab={tab} variant="bar" />
          ))}
          <NotificationBell variant="bar" />
        </div>
      </nav>
    </>
  );
}
