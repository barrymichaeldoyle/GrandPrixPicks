import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import { Flag } from '@/components/Flag';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { getRaceWriteup } from '@/lib/raceWriteups';
import { TEAM_COLORS } from '@/lib/teamColors';

/** As `home.getHomePageData` projects it through `loadNewsHeadlines`. */
export type LandingNews = {
  total: number;
  items: readonly {
    key: string;
    headline: string;
    sourceName: string;
    team: string | null;
  }[];
};

/**
 * The next race's news, a line each, linking into the write-up.
 *
 * It replaces the write-up callout that used to sit here. That callout was the
 * only race content on the landing page, while the write-up behind it carried
 * fifteen or more sourced stories, so a visitor who came for F1 news found a
 * game and one link. Headlines are what the home page can carry without
 * publishing the stories twice: each one opens its card on the write-up
 * (`WeekendNewsSection` gives every card a `news-<key>` id and opens its fold
 * for a hash), which stays the one place the text lives.
 *
 * Server-rendered from the home loader, so the links reach a crawler and the
 * write-up keeps this inbound link in `check:orphans`.
 */
export function LandingWeekendNews({
  raceName,
  raceSlug,
  news,
}: {
  raceName: string;
  raceSlug: string;
  news: LandingNews | null;
}) {
  const writeup = getRaceWriteup(raceSlug);
  if (!writeup) {
    return null;
  }
  const items = news?.items ?? [];
  // The same flag the hero's clock and the weekend board put beside a race
  // name, so every race this page names reads the same way.
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

  function track(target: string) {
    captureAnalyticsEvent('landing_news_clicked', {
      race_slug: raceSlug,
      target,
    });
  }

  return (
    <section
      aria-labelledby="landing-news-heading"
      className="border-t border-border px-4 py-12 sm:py-16"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-12">
        <div>
          <h2
            id="landing-news-heading"
            className="flex items-center gap-3 text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
          >
            {countryCode ? <Flag code={countryCode} size="md" /> : null}
            <span>{raceName} news</span>
          </h2>
          <p className="gpp-reading-copy mt-3 text-text-muted">
            {writeup.summary}
          </p>
          <Link
            to={writeup.to}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-sm border border-border-strong px-5 font-semibold text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            onClick={() => track('writeup')}
          >
            {writeup.cta}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>

        {items.length > 0 ? (
          <ul className="border-t border-border">
            {items.map((item) => {
              const teamColour =
                (item.team && TEAM_COLORS[item.team]) || 'var(--accent)';
              return (
                <li key={item.key} className="border-b border-border">
                  <Link
                    to={writeup.to}
                    hash={`news-${item.key}`}
                    className="gpp-team-bar group block py-3.5 pr-2 pl-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    style={{ '--team-colour': teamColour } as CSSProperties}
                    onClick={() => track('headline')}
                  >
                    <span className="block font-medium text-text group-hover:text-accent">
                      {item.headline}
                    </span>
                    <span className="gpp-reading-meta mt-0.5 block text-text-muted">
                      {item.sourceName}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
