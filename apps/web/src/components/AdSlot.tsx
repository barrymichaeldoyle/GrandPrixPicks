import { useEffect, useRef, useState } from 'react';

import { api } from '@convex-generated/api';
import { useQuery } from '@/integrations/convex/query';
import { adsEnabled, ADSENSE_CLIENT, ensureAdSenseLoaded } from '@/lib/adsense';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * How far ahead of the viewport a slot starts loading. One screen-ish: far
 * enough that the ad is usually there by the time it is scrolled to, near
 * enough that a reader who never reaches it never pays for it.
 */
const PRELOAD_MARGIN = '400px';

/**
 * One AdSense placement, loaded on approach rather than on page load.
 *
 * The script used to load on every route regardless of whether anything could
 * show an ad — ~680 KB across four Google hosts for pages with no slot at all.
 * Here the slot is the trigger: nothing is fetched until an `IntersectionObserver`
 * says this element is within {@link PRELOAD_MARGIN} of the viewport. A reader
 * who never scrolls that far costs nothing.
 *
 * Place these **below the fold**, which is where they belong commercially and
 * also what keeps them out of Cumulative Layout Shift: a shift only scores if it
 * moves content that is actually on screen, so a slot that sizes itself before
 * it is ever scrolled to is free. `minHeight` reserves the space regardless, so
 * even a slot that does end up on screen grows into reserved room rather than
 * pushing the page down.
 *
 * Renders nothing at all — no wrapper, no reserved space — when ads are off,
 * when the viewer is on a paid plan, or when the script cannot load. A PRO
 * subscriber gets the layout as though this component were not in the tree.
 */
export function AdSlot({
  slot,
  minHeight = 280,
  format = 'auto',
  className = '',
}: {
  /**
   * The AdSense ad unit id (`data-ad-slot`), created in the AdSense UI and
   * supplied through config rather than written here — the ids do not exist
   * until the account is approved. Undefined renders nothing.
   */
  slot: string | undefined;
  /** Reserved height in px, matched to the unit so the ad grows into it. */
  minHeight?: number;
  format?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const insRef = useRef<HTMLModElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [failed, setFailed] = useState(false);

  // `undefined` while the query is in flight. Treated as "not yet known" rather
  // than "free", so a PRO subscriber never sees an ad flash before their plan
  // resolves.
  const plan = useQuery(api.billing.getMyPlan, {});
  const eligible =
    adsEnabled() && Boolean(slot) && plan !== undefined && !plan.isPro;

  useEffect(() => {
    if (!eligible || shouldRender) {
      return;
    }
    const node = containerRef.current;
    if (!node) {
      return;
    }

    // No IntersectionObserver (old browser, jsdom): fall back to rendering the
    // slot rather than never showing an ad.
    if (typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eligible, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }
    let cancelled = false;

    ensureAdSenseLoaded()
      .then(() => {
        // The push tells AdSense to fill the `<ins>` that is already in the
        // DOM, so it has to happen after this render has committed — which is
        // exactly where an effect runs. Pushing before the element exists is
        // the classic way to get a permanently blank unit.
        if (cancelled || !insRef.current) {
          return;
        }
        // Once per element. A second push for the same `<ins>` is what produces
        // "All ins elements in the DOM with class=adsbygoogle already have ads
        // in them" in the console, and it can wedge later slots on the page.
        if (insRef.current.dataset.adsbygoogleStatus) {
          return;
        }
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      })
      .catch(() => {
        // Blocked or offline. Collapse rather than leaving a reserved gap the
        // reader would read as a broken part of the page.
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shouldRender]);

  if (!eligible || failed) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight }}
      // Labelled because an ad is not our content and a reader moving by
      // landmark or screen reader deserves to know which is which before they
      // are in it.
      role="complementary"
      aria-label="Advertisement"
    >
      {shouldRender ? (
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      ) : null}
    </div>
  );
}
