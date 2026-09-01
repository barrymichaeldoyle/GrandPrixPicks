import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { CircuitSummary } from '@/components/CircuitSummary';
import { InAppBackLink } from '@/components/InAppBackLink';
import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { breadcrumbSchema, pageMeta } from '@/lib/site';
import { routeQuery } from '@/lib/routeQuery';

/** A practice classification, as the loader hands it over. */
type PracticeResult = {
  sessionType: 'fp1' | 'fp2' | 'fp3';
  entries: {
    displayName: string;
    position: number;
    gapToLeaderSeconds?: number;
  }[];
};

/**
 * OpenF1 shouts surnames: its `displayName` is "Kimi ANTONELLI", which the
 * results table renders with its own styling but which reads as shouting in a
 * search snippet. Only all-caps runs are touched, so a name that is already
 * cased passes through and "McLaren"-style internal capitals survive.
 */
function softenDriverName(displayName: string): string {
  return displayName.replaceAll(
    /\p{Lu}{2,}/gu,
    (word) => word[0] + word.slice(1).toLocaleLowerCase(),
  );
}

/**
 * What the snippet for a practice page should say.
 *
 * Every one of these pages used to describe itself as "FP1, FP2, and FP3
 * results for the <race>, including best lap times and gaps" — around 92
 * characters, and identical across all sixteen once you swapped the race name
 * out. Bing flagged four of them as too short, but length was the symptom: a
 * snippet interchangeable with fifteen others gives nobody a reason to click,
 * which is what the 0% CTR at position 3-5 was saying.
 *
 * So lead with the one fact the page has and its neighbours do not: who was
 * quickest, and by how much. The data is already in the loader, so this costs
 * no extra query.
 */
function practiceDescription(
  race: { name: string; season: number },
  results: PracticeResult[],
): string {
  // The latest session is the one worth leading on — FP3 supersedes FP1 as a
  // form guide, and it is what someone searching mid-weekend is looking for.
  const latest = ['fp3', 'fp2', 'fp1']
    .map((session) => results.find((r) => r.sessionType === session))
    .find((result) => result != null && result.entries.length > 0);

  if (!latest) {
    return `FP1, FP2 and FP3 results for the ${race.season} ${race.name}: full classifications, best lap times, gaps to the leader and lap counts, published as each session ends.`;
  }

  const ordered = [...latest.entries].sort((a, b) => a.position - b.position);
  const leader = ordered[0];
  const second = ordered[1];
  const session = latest.sessionType.toUpperCase();
  const gap = second?.gapToLeaderSeconds;
  // A gap only reads as a fact when we have both a name to attach it to and a
  // number; a session where nobody set a second time falls back to the order.
  const margin =
    second && typeof gap === 'number' && gap > 0
      ? `, ${gap.toFixed(3)}s clear of ${softenDriverName(second.displayName)}`
      : second
        ? `, ahead of ${softenDriverName(second.displayName)}`
        : '';

  return `${softenDriverName(leader.displayName)} topped ${session} for the ${race.season} ${race.name}${margin}. Full practice classifications, best lap times, gaps and lap counts.`;
}

export const Route = createFileRoute('/races/$raceSlug/practice')({
  loader: async ({ context, params }) => {
    // This route never opted into a cache tier, and it was the only public
    // race-data page that did not. Without an origin `cache-control` the edge
    // rule falls back to its own default TTL and holds the document for hours:
    // prod was serving this page with `age: 5642` and no revalidation, so a
    // classification published mid-weekend stayed invisible to anyone landing
    // here from search, and a deploy did not dislodge it either.
    //
    // Sixty seconds with a short stale window, matching every other race-data
    // route — the client's Convex subscription corrects the document a moment
    // after hydration regardless.
    await setRaceDataCacheHeaders();

    const race = await context.queryClient.ensureQueryData(
      routeQuery(api.races.getRaceBySlug, { slug: params.raceSlug }),
    );
    if (!race) {
      throw notFound();
    }
    const results = await context.queryClient.ensureQueryData(
      routeQuery(api.practiceResults.getPracticeResultsForRace, {
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
        ? practiceDescription(race, loaderData?.results ?? [])
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
  const { raceSlug } = Route.useParams();
  const { race: initialRace, results: initialResults } = Route.useLoaderData();
  // These are also the observers that keep the loader's cache entries
  // subscribed; without them the entries would sit unwatched behind an
  // infinite stale time.
  const { data: liveRace } = useQuery(
    routeQuery(api.races.getRaceBySlug, { slug: raceSlug }),
  );
  const race = liveRace ?? initialRace;
  const { data: liveResults } = useQuery(
    routeQuery(api.practiceResults.getPracticeResultsForRace, {
      raceId: race._id,
    }),
  );
  const results = liveResults ?? initialResults;
  useEffect(() => {
    captureAnalyticsEvent('practice_results_page_viewed', {
      race_id: race._id,
      race_slug: race.slug,
      session_count: results.length,
    });
  }, [race._id, race.slug, results.length]);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-8">
        <InAppBackLink
          fallbackHref={`/races/${race.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          Back
        </InAppBackLink>

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

        <p className="gpp-reading-copy mt-8 max-w-3xl text-text-muted">
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

        <CircuitSummary raceSlug={race.slug} />

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
    </div>
  );
}
