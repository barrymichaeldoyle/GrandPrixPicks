import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { useEffect, useRef, useState } from 'react';

import { Flag } from '@/components/Flag';
import { primaryButtonStyles } from '@/components/Button/Button';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { captureAnalyticsEvent } from '@/lib/analytics';

/**
 * Compact deadline plus CTA, revealed once the hero scrolls away so the primary
 * action is never off-screen.
 *
 * It carries no logo: the app header is sticky directly above this strip and
 * already has one, and two marks 8px apart is just a wider header.
 *
 * Visibility is driven by an IntersectionObserver on a sentinel rather than a
 * scroll listener, so nothing runs on the main thread between scroll stops.
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
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) =>
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 64),
      // Fire against the bottom of the app header, not the viewport top, so the
      // strip appears exactly as the hero clears it.
      { rootMargin: '-64px 0px 0px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const locked = msRemaining <= 0;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" />
      {/* The strip is fixed to the viewport while the header above it is
          sticky in flow, so an elastic overscroll at either end of the page
          moves the two by different amounts and page content flashes through
          the seam. This wrapper starts at the very top of the viewport and pads
          down past the header, which puts the strip's own background behind the
          header: however far the bounce pulls them apart, the seam stays filled
          and the two read as one block. It sits under the header (z-40 against
          z-50), which paints over it. */}
      <div
        data-landing-sticky-visible={visible ? 'true' : 'false'}
        className={`fixed inset-x-0 top-0 z-40 overflow-hidden pt-(--nav-height) ${
          visible ? 'bg-page' : 'pointer-events-none'
        }`}
        // Hidden from assistive tech while off-screen: the same CTA is in the
        // hero, and an always-present duplicate in the tab order is noise.
        inert={!visible}
      >
        {/* Parked one full height up, the strip rests in that band behind the
            header, so revealing it is a plain slide out from under the chrome:
            opaque the whole way, never a translucent bar sliding over the
            article text. Visibility is transitioned discretely (flipping only
            once the slide finishes) so the parked strip can't peek out from
            behind the header mid-bounce. */}
        <div
          // `translate` and not `transform`: Tailwind 4's translate utilities
          // set the standalone `translate` property, so a transform transition
          // silently never runs and the strip lands in one frame.
          className={`border-b border-border bg-page transition-[translate,visibility] transition-discrete duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${
            visible ? 'visible translate-y-0' : 'invisible -translate-y-full'
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
