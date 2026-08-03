import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { useEffect, useState } from 'react';

import { Flag } from '@/components/Flag';
import { primaryButtonStyles } from '@/components/Button/Button';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { captureAnalyticsEvent } from '@/lib/analytics';

const STICKY_BAR_HEIGHT = 48;

/**
 * Compact deadline plus CTA, revealed once the hero's race context scrolls
 * behind the app header and dismissed when the picker itself takes over.
 *
 * It carries no logo: the app header is sticky directly above this strip and
 * already has one, and two marks 8px apart is just a wider header.
 *
 * Visibility is driven by an IntersectionObserver on the race-name row rather
 * than a scroll listener, so the strip takes over as that context disappears
 * without running anything on the main thread between scroll stops.
 */
export function LandingStickyBar({
  raceName,
  raceSlug,
  msRemaining,
  targetId,
}: {
  raceName: string;
  raceSlug: string;
  msRemaining: number;
  /** Element the CTA scrolls to, e.g. the picker. */
  targetId: string;
}) {
  const [raceContextPassed, setRaceContextPassed] = useState(false);
  const [pickerReached, setPickerReached] = useState(false);
  const [headerTopOffset, setHeaderTopOffset] = useState(0);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-app-header]');
    if (!header) {
      return;
    }
    const appHeader = header;

    // Mirror the header's actual inset rather than assuming it is pinned to
    // zero, so any future top-of-page chrome pushes this strip down with it.
    // Nothing shifts the header today — the StartupBar widget that used to is
    // gone — but the coupling is to the header, not to whatever moved it.
    function syncHeaderTopOffset() {
      const next = Number.parseFloat(getComputedStyle(appHeader).top);
      setHeaderTopOffset(Number.isFinite(next) ? next : 0);
    }

    syncHeaderTopOffset();
    const observer = new MutationObserver(syncHeaderTopOffset);
    observer.observe(appHeader, {
      attributes: true,
      attributeFilter: ['style'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const anchors = document.querySelectorAll<HTMLElement>(
      '[data-landing-sticky-anchor]',
    );
    if (anchors.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const header = document.querySelector<HTMLElement>('[data-app-header]');
    const headerHeight = header
      ? Number.parseFloat(getComputedStyle(header).height)
      : Number.NaN;
    const stickyTop =
      (Number.isFinite(headerHeight) ? headerHeight : 64) + headerTopOffset;
    const observer = new IntersectionObserver(
      (entries) => {
        // Both desktop and mobile clocks exist in the DOM, with CSS choosing
        // one at the breakpoint. A hidden anchor has a zero-sized client rect;
        // ignoring it prevents that off-screen variant from showing the strip.
        const entry = entries.find(
          ({ boundingClientRect }) =>
            boundingClientRect.width > 0 && boundingClientRect.height > 0,
        );
        if (!entry) {
          return;
        }
        setRaceContextPassed(
          !entry.isIntersecting && entry.boundingClientRect.top < stickyTop,
        );
      },
      // Fire against the bottom of the app header, not the viewport top: the
      // banner takes over as soon as the race-name row is fully behind it.
      { rootMargin: `-${stickyTop}px 0px 0px 0px`, threshold: 0 },
    );
    anchors.forEach((anchor) => observer.observe(anchor));
    return () => observer.disconnect();
  }, [headerTopOffset]);

  useEffect(() => {
    const pickerStart = document
      .getElementById(targetId)
      ?.querySelector<HTMLElement>('[data-landing-picks-start]');
    if (!pickerStart || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const header = document.querySelector<HTMLElement>('[data-app-header]');
    const headerHeight = header
      ? Number.parseFloat(getComputedStyle(header).height)
      : Number.NaN;
    const stickyBottom =
      (Number.isFinite(headerHeight) ? headerHeight : 64) +
      headerTopOffset +
      STICKY_BAR_HEIGHT;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setPickerReached(
          !entry.isIntersecting && entry.boundingClientRect.top < stickyBottom,
        ),
      // Once the picker heading reaches the bottom of the strip, its controls
      // are the action; keeping a second CTA over them only costs working room.
      { rootMargin: `-${stickyBottom}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(pickerStart);
    return () => observer.disconnect();
  }, [headerTopOffset, targetId]);

  const visible = raceContextPassed && !pickerReached;

  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const locked = msRemaining <= 0;

  return (
    <>
      {/* Use the same sticky coordinate system as the app header. A fixed strip
          stays pinned to the visual viewport during iOS rubber-band scrolling
          while the sticky header moves with the document, which pulls the two
          layers apart. The zero-height wrapper avoids reserving space: the bar
          still overlays the page, but now bounces in lockstep with the header. */}
      <div
        data-landing-sticky-visible={visible ? 'true' : 'false'}
        className={`sticky top-(--nav-height) z-40 h-0 ${
          visible ? '' : 'pointer-events-none'
        }`}
        style={{
          top: `calc(var(--nav-height) + ${headerTopOffset}px)`,
        }}
        // Hidden from assistive tech while off-screen: the same CTA is in the
        // hero, and an always-present duplicate in the tab order is noise.
        inert={!visible}
      >
        {/* Parked one full height up, the strip rests behind the higher-z-index
            header. It slides in when the race row leaves, but disappears
            immediately on the way back so it never covers the returning row. */}
        <div
          // `translate` and not `transform`: Tailwind 4's translate utilities
          // set the standalone `translate` property, so a transform transition
          // silently never runs and the strip lands in one frame.
          className={`absolute inset-x-0 top-0 border-b border-border bg-page motion-reduce:transition-none ${
            visible
              ? 'visible translate-y-0 transition-[translate] duration-200 ease-[cubic-bezier(0.2,0,0,1)]'
              : 'invisible -translate-y-full transition-none'
          }`}
        >
          {/* Same rail as the header above it: the strip reads as an extension
              of the app chrome, so its content has to line up with the
              wordmark. */}
          <div className="mx-auto flex h-12 w-full max-w-(--page-max) items-center gap-3 px-4 min-[844px]:px-8">
            {/* One line can't always hold the name, the deadline and a 135px
              button: at 360px it leaves ~67px for the name, so anything past
              "Dutch GP" truncated mid-word. The deadline is its own flex item
              now, so it drops to a second line exactly when the pair stops
              fitting — no width guess, and it holds for a long race name, a
              three-digit day count or a narrower button alike. Flex wraps on
              content size before it shrinks anything, so the name keeps its
              full width rather than truncating first. */}
            <div className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
              {countryCode ? <Flag code={countryCode} size="xs" /> : null}
              <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.75 leading-tight">
                <span className="truncate text-text">{raceName}</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  {locked ? 'is locked' : 'locks in'}
                  {locked ? null : (
                    <span
                      className="gpp-mono text-text"
                      suppressHydrationWarning
                    >
                      {formatLockCountdown(msRemaining)}
                    </span>
                  )}
                </span>
              </p>
            </div>
            <a
              href={`#${targetId}`}
              className={`${primaryButtonStyles('sm')} ml-auto shrink-0`}
              onClick={() =>
                captureAnalyticsEvent('landing_hero_cta_clicked', {
                  placement: 'sticky',
                })
              }
            >
              Make your picks
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
