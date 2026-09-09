import { api } from '@convex-generated/api';
import { Link } from '@tanstack/react-router';
import { ArrowRight, CalendarDays, Flag, Home } from 'lucide-react';
import { useEffect } from 'react';

import { useQuery } from '@/integrations/convex/query';
import { getRaceWriteup } from '@/lib/raceWriteups';

/**
 * The 404.
 *
 * Its own module rather than a function inside `__root`: five routes render it
 * for their own "no such record" cases, and it now reads Convex, which is
 * worth a test of its own. `__root` re-exports it so those imports are
 * unchanged.
 */
export function NotFoundPage() {
  /*
   * `getQuickPickRace`, not `getNextRace`: it holds on the weekend that is
   * actually running once Friday locks, which is the write-up a lost visitor
   * wants. A weekend only has a write-up if somebody wrote one, so the link is
   * absent as often as not, and the calendar below it always answers.
   *
   * A client-only read hides this link from crawlers, which is fine here and
   * nowhere else: the page is noindex and sends a real 404.
   */
  const currentRace = useQuery(api.races.getQuickPickRace, {});
  const writeup = getRaceWriteup(currentRace?.slug);

  useEffect(() => {
    document.title = 'Page Not Found | Grand Prix Picks';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning-muted">
          <Flag className="h-8 w-8 text-warning" aria-hidden="true" />
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-text">
          Page not found
        </h1>

        {/* No apology and no "wrong turn": the voice guide rules out friendly
            filler in errors, and the only useful facts are that the URL is
            dead and where to go instead. Shorter also breaks cleanly at this
            width. */}
        <p className="mb-8 text-text-muted">
          This page doesn't exist, or it has moved.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 font-semibold text-text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Link>
        </div>

        {/*
         * Most 404s here are a stale shared race URL, so the two links that
         * actually rescue that visit are this weekend's reading and the
         * calendar. Deliberately NOT a redirect: bouncing a dead URL to the
         * homepage is a soft 404 to Google and hides the typo from the reader.
         *
         * Secondary, under the primary action, and only ever two — an error
         * state is not a place to put a site map.
         */}
        <div className="mt-6 flex flex-col items-center gap-2 text-sm sm:flex-row sm:justify-center sm:gap-6">
          {writeup ? (
            <Link
              to={writeup.to}
              className="inline-flex items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
            >
              {writeup.cta}
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}
          <Link
            to="/races"
            className="inline-flex items-center gap-1.5 font-medium text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            Race calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
