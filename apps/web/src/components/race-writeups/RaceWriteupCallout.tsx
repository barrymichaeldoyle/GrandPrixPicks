import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { getRaceWriteup } from '@/lib/raceWriteups';

/**
 * The weekend write-up, as a feature block on its race page.
 *
 * The write-up is where the editorial depth for a weekend goes, and it gets
 * more of it as the weekend approaches. The race page is the surface that
 * already ranks (`/races/madrid-2026` at position 5.9 against the write-up's
 * 12.5), so it is the one that has to hand readers on.
 *
 * It used to do that with a small muted text link under the race date, which
 * is not a link anybody follows. This replaces it rather than joining it: two
 * links to one destination, a hundred pixels apart, is the same idea said
 * twice.
 *
 * Rendered from the static registry with no `useQuery` between it and the
 * markup, so it survives into the SSR HTML. That matters beyond the reader:
 * this is the inbound link that keeps the write-up out of `check:orphans`.
 */
export function RaceWriteupCallout({ raceSlug }: { raceSlug: string }) {
  const writeup = getRaceWriteup(raceSlug);
  if (!writeup) {
    return null;
  }

  return (
    <section
      aria-labelledby="weekend-writeup-heading"
      className="mt-6 rounded-sm border border-accent/25 bg-accent-muted/20 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2
            id="weekend-writeup-heading"
            className="font-title text-xl font-semibold text-text"
          >
            Weekend write-up
          </h2>
          <p className="gpp-reading-copy mt-1 max-w-2xl text-text-muted">
            {writeup.summary}
          </p>
        </div>
        <Link
          to={writeup.to}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-accent px-5 font-semibold text-text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {writeup.cta}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
