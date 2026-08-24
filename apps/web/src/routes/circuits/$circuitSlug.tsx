import { api } from '@convex-generated/api';
import { getCircuit, getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { InAppBackLink } from '@/components/InAppBackLink';
import { getCircuitGuideBySlug } from '@/lib/circuitGuides';
import { routeQuery } from '@/lib/routeQuery';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

/** Prose sections that belong to the venue rather than to a given weekend. */
const SECTIONS = [
  { key: 'layout', heading: 'What the lap demands' },
  { key: 'racing', heading: 'How the racing unfolds' },
] as const;

export const Route = createFileRoute('/circuits/$circuitSlug')({
  loader: async ({ context, params }) => {
    const circuit = getCircuit(params.circuitSlug);
    const guide = circuit ? getCircuitGuideBySlug(circuit.slug) : null;
    if (!circuit || !guide) {
      throw notFound();
    }
    // Loader data, not a client hook: a `<Link>` behind `useQuery` is absent
    // from the SSR HTML, which would orphan every race page linked from here.
    const { season, races } = await context.queryClient.ensureQueryData(
      routeQuery(api.races.listCurrentSeason, {}),
    );
    const racesHere = races
      .filter((race) => getCircuitForRace(race.slug)?.slug === circuit.slug)
      .sort((a, b) => a.round - b.round);
    return { circuit, guide, season, racesHere };
  },
  component: CircuitPage,
  head: ({ loaderData, params }) => {
    const path = `/circuits/${params.circuitSlug}`;
    const circuit = loaderData?.circuit;
    const guide = loaderData?.guide;
    if (!circuit || !guide) {
      return pageMeta({
        title: 'Circuit | Grand Prix Picks',
        description: 'Formula 1 circuit guides from Grand Prix Picks.',
        path,
      });
    }
    return {
      ...pageMeta({
        title: `${circuit.name} | Circuit Guide, Layout and Racing`,
        description: `A guide to ${circuit.name} in ${circuit.locality}, ${circuit.country}: what the lap asks of a car, how much the order really moves on Sunday, and how to read it before you pick.`,
        path,
      }),
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Place',
                '@id': `${siteConfig.url}${path}#place`,
                name: circuit.name,
                url: `${siteConfig.url}${path}`,
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: circuit.locality,
                  addressCountry: circuit.country,
                },
              },
              breadcrumbSchema(path, [
                { name: 'Circuits', path: '/circuits' },
                { name: circuit.name, path },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function CircuitPage() {
  const { circuit, guide, season, racesHere } = Route.useLoaderData();

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl px-3 py-5 sm:px-4 sm:py-8">
        <InAppBackLink
          fallbackHref="/circuits"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          Back
        </InAppBackLink>

        <header className="mt-5">
          <p className="text-xs font-semibold tracking-label text-accent uppercase">
            Circuit
          </p>
          <h1 className="font-title mt-1 text-3xl font-semibold text-text sm:text-4xl">
            {circuit.name}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {circuit.locality}, {circuit.country}
          </p>
        </header>

        <p className="gpp-reading-copy mt-6 max-w-3xl text-text-muted">
          {guide.character}
        </p>

        <dl className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
          {guide.traits.map((trait) => (
            <div key={trait.label} className="bg-surface px-4 py-3">
              <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
                {trait.label}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-text">
                {trait.value}
              </dd>
            </div>
          ))}
        </dl>

        {SECTIONS.map((section) => (
          <section key={section.key} className="mt-8 max-w-3xl">
            <h2 className="font-title text-xl font-semibold text-text">
              {section.heading}
            </h2>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              {guide[section.key]}
            </p>
          </section>
        ))}

        {racesHere.length > 0 && (
          <section className="mt-10 border-t border-border pt-8">
            <h2 className="font-title text-xl font-semibold text-text">
              Racing here in {season}
            </h2>
            <ul className="mt-4 divide-y divide-border/60">
              {racesHere.map((race) => (
                <li
                  key={race._id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
                >
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: race.slug }}
                    className="font-semibold text-accent hover:text-accent-hover"
                  >
                    {race.name}
                  </Link>
                  <span className="text-sm text-text-muted">
                    Round {race.round}
                  </span>
                </li>
              ))}
            </ul>
            <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
              The race page carries the weekend schedule, the running order once
              each session is classified, and how the Top 5 picks scored.
            </p>
          </section>
        )}

        <nav
          aria-label="Related pages"
          className="mt-10 border-t border-border pt-6"
        >
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            Keep reading
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 [&_a]:text-accent [&_a:hover]:text-accent-hover">
            <li>
              <Link to="/circuits">Every circuit, compared</Link>
            </li>
            <li>
              <Link to="/races">The {season} F1 race calendar</Link>
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
              <Link to="/how-to-play">How Grand Prix Picks scoring works</Link>
            </li>
          </ul>
        </nav>

        <p className="mt-8">
          {circuit.slug === 'monza' && season === 2026 && (
            <Link
              to="/f1-2026-italian-grand-prix-predictions"
              className="mr-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
            >
              2026 Italian Grand Prix prediction guide
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
          <Link
            to="/races"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Make your picks for the next race
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </p>
      </div>
    </div>
  );
}
