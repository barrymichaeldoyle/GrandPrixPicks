import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

import { CircuitGuide } from '@/components/CircuitGuide';
import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { convexHttp as convex } from '@/integrations/convex/client';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { breadcrumbSchema, pageMeta } from '@/lib/site';
import { withRetry } from '@/lib/retry';

export const Route = createFileRoute('/races/$raceSlug/practice')({
  loader: async ({ params }) => {
    const race = await withRetry(() =>
      convex.query(api.races.getRaceBySlug, { slug: params.raceSlug }),
    );
    if (!race) {
      throw notFound();
    }
    const results = await withRetry(() =>
      convex.query(api.practiceResults.getPracticeResultsForRace, {
        raceId: race._id,
      }),
    );
    return { race, results };
  },
  head: ({ loaderData, params }) => {
    const race = loaderData?.race;
    const path = `/races/${params.raceSlug}/practice`;
    const meta = pageMeta({
      title: race
        ? `${race.name} Practice Results | Grand Prix Picks`
        : 'Formula 1 Practice Results | Grand Prix Picks',
      description: race
        ? `FP1, FP2, and FP3 results for the ${race.season} ${race.name}, including best lap times and gaps.`
        : 'Formula 1 free practice results, best lap times, and gaps.',
      path,
      // Before the sessions run this page is a single placeholder line. Keep it
      // out of the index until it has a classification worth landing on; the
      // flag clears itself as soon as FP1 is published.
      noIndex: (loaderData?.results.length ?? 0) === 0,
    });
    if (!race) {
      return meta;
    }
    // Breadcrumbs give the page a crawlable position under /races and the race
    // itself, which a leaf results page otherwise lacks.
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              breadcrumbSchema(path, [
                { name: 'Races', path: '/races' },
                { name: race.name, path: `/races/${race.slug}` },
                { name: 'Practice results', path },
              ]),
            ],
          }),
        },
      ],
    };
  },
  component: PracticeResultsPage,
});

function PracticeResultsPage() {
  const { race, results } = Route.useLoaderData();
  useEffect(() => {
    captureAnalyticsEvent('practice_results_page_viewed', {
      race_id: race._id,
      race_slug: race.slug,
      session_count: results.length,
    });
  }, [race._id, race.slug, results.length]);

  return (
    <main className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-8">
        <Link
          to="/races/$raceSlug"
          params={{ raceSlug: race.slug }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {race.name}
        </Link>

        <header className="mt-5">
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            Round {race.round} · {race.season}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-text">
            {race.name} Practice Results
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Free practice classification, fastest laps, and gaps to the session
            leader.
          </p>
        </header>

        <section className="mt-6 overflow-hidden rounded-sm border border-border bg-surface-elevated">
          <PracticeResultsPanel results={results} />
        </section>

        <p className="gpp-reading-copy mt-8 max-w-3xl text-sm text-text-muted">
          Practice sets the reference for the weekend, but it is the weakest of
          the three signals. Teams run different fuel loads and tyre compounds
          in every session, so a headline lap time says as much about when a
          driver ran as how quick the car is. Read the lap counts above
          alongside the order, then check the{' '}
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: race.slug }}
            className="font-semibold text-accent hover:text-accent-hover"
          >
            qualifying and race results
          </Link>{' '}
          to see how much of it carried over.
        </p>

        <CircuitGuide raceSlug={race.slug} raceName={race.name} />

        <nav
          aria-label="Related pages"
          className="mt-10 border-t border-border pt-6"
        >
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            Keep reading
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 [&_a]:text-accent [&_a:hover]:text-accent-hover">
            <li>
              <Link to="/races/$raceSlug" params={{ raceSlug: race.slug }}>
                {race.name} weekend results and predictions
              </Link>
            </li>
            <li>
              <Link to="/races">2026 F1 race calendar</Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'how-to-predict-f1-top-five' }}
              >
                How to predict an F1 top five
              </Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'f1-race-weekend-format' }}
              >
                F1 race weekend format explained
              </Link>
            </li>
            <li>
              <Link to="/f1-standings">F1 championship standings</Link>
            </li>
            <li>
              <Link to="/results-policy">
                How we score results and penalties
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
