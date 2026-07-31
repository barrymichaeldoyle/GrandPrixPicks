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
      <div
        data-landing-sticky-visible={visible ? 'true' : 'false'}
        className={`fixed top-[var(--nav-height)] right-0 left-0 z-40 border-b border-border bg-page transition-[opacity,transform] duration-200 ease-out ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
        // Hidden from assistive tech while off-screen: the same CTA is in the
        // hero, and an always-present duplicate in the tab order is noise.
        inert={!visible}
      >
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center gap-3 px-4">
          <p className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
            {countryCode ? <Flag code={countryCode} size="xs" /> : null}
            <span className="truncate">
              <span className="text-text">{raceName}</span>{' '}
              {locked ? 'is locked' : 'locks in'}
            </span>
            {locked ? null : (
              <span
                className="gpp-mono shrink-0 text-text"
                suppressHydrationWarning
              >
                {formatLockCountdown(msRemaining)}
              </span>
            )}
          </p>
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
    </>
  );
}
