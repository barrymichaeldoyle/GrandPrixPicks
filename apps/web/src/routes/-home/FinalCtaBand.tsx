import { ArrowRight } from 'lucide-react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';

import { SessionClock } from './SessionClock';

/**
 * Last band before the footer. The clock repeats from the hero at the small
 * size, because the reason to act is the deadline and by this point the visitor
 * has scrolled four screens away from it.
 */
export function FinalCtaBand({
  raceName,
  raceSlug,
  sessionLabel,
  msRemaining,
  targetId,
}: {
  raceName: string;
  raceSlug: string;
  sessionLabel: string;
  msRemaining: number;
  targetId: string;
}) {
  return (
    <section className="border-t border-border px-4 py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-7 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <SessionClock
          raceName={raceName}
          raceSlug={raceSlug}
          sessionLabel={sessionLabel}
          msRemaining={msRemaining}
          size="sm"
        />

        <div className="sm:text-right">
          <p className="gpp-reading-copy-lg text-text">
            Picks lock when the session starts.
          </p>
          <a
            href={`#${targetId}`}
            className={`${primaryButtonStyles('md')} mt-4`}
            onClick={() =>
              captureAnalyticsEvent('landing_hero_cta_clicked', {
                placement: 'final_band',
              })
            }
          >
            Make your picks
            <ArrowRight size={20} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
