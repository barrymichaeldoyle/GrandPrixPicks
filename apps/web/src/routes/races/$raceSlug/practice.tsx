import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { convexHttp as convex } from '@/integrations/convex/client';
import { pageMeta } from '@/lib/site';
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
  head: ({ loaderData, params }) =>
    pageMeta({
      title: loaderData
        ? `${loaderData.race.name} Practice Results | Grand Prix Picks`
        : 'Formula 1 Practice Results | Grand Prix Picks',
      description: loaderData
        ? `FP1, FP2, and FP3 results for the ${loaderData.race.season} ${loaderData.race.name}, including best lap times and gaps.`
        : 'Formula 1 free practice results, best lap times, and gaps.',
      path: `/races/${params.raceSlug}/practice`,
    }),
  component: PracticeResultsPage,
});

function PracticeResultsPage() {
  const { race, results } = Route.useLoaderData();

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
          <p className="text-xs font-semibold tracking-[0.14em] text-text-muted uppercase">
            Round {race.round} · {race.season}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-text">
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
      </div>
    </main>
  );
}
