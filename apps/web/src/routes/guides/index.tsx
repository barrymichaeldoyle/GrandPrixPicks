import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { ArrowRight } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { listGuideMeta } from '@/lib/guideMeta';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';
import { PicksCallToAction } from '@/components/PicksCallToAction/PicksCallToAction';

export const Route = createFileRoute('/guides/')({
  loader: setStaticContentCacheHeaders,
  component: GuidesIndexPage,
  head: () => {
    const meta = pageMeta({
      title: 'F1 Guides | Race Weekends, Points and the 2027 Grid',
      description:
        'Plain-English guides to Formula 1: how a race weekend runs, how championship points are awarded, and who could take the 2027 Haas seat.',
      path: '/guides',
    });
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'CollectionPage',
                '@id': `${siteConfig.url}/guides#page`,
                url: `${siteConfig.url}/guides`,
                name: 'Formula 1 guides',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/guides', [
                { name: 'Guides', path: '/guides' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function GuidesIndexPage() {
  // Front matter only: this page shows titles and summaries, and reading
  // the full guides here would pull every word into the client entry.
  const guides = listGuideMeta();

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          title="Formula 1, explained"
          subtitle="How a race weekend runs, how points are awarded, and who could take the 2027 Haas seat."
        />

        <section className="mt-2 border-t border-border pt-8">
          <p className="gpp-reading-copy text-text-muted">
            Formula 1 is unusually hard to follow from the outside. The result
            you see on Sunday is the end of a three-day process, and most of
            what decides it happens before the race starts: a knockout
            qualifying session that sets the grid, a tyre choice locked in hours
            earlier, a car that suits one circuit and not the next. None of that
            is explained on screen, which is why a new viewer can watch a full
            weekend and still not know why the fast car finished fourth.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            These guides are written to close that gap. They cover each session
            of a race weekend and how the sport awards its own championship
            points, in plain English: no lap-time tables, no engineering jargon
            left undefined.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            If you play Grand Prix Picks, the points guide also covers how the
            game scores a pick, which rewards getting the order right rather
            than picking winners.
          </p>
        </section>

        <h2 className="font-title mt-10 text-sm font-semibold tracking-wide text-text-muted uppercase">
          The guides
        </h2>

        <ul className="mt-2 border-t border-border">
          {guides.map((guide) => (
            <li key={guide.slug} className="border-b border-border">
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: guide.slug }}
                className="group block py-6 focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
              >
                <h2 className="font-title text-xl font-semibold text-text transition-colors group-hover:text-accent">
                  {guide.title}
                </h2>
                <p className="gpp-reading-copy mt-2 text-text-muted">
                  {guide.summary}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  Read the guide
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-10 border-l-2 border-accent pl-4">
          <p className="gpp-reading-copy text-text-muted">
            Looking for the rules of the game rather than the sport?{' '}
            <Link
              to="/how-to-play"
              className="font-medium text-accent hover:underline"
            >
              How to play
            </Link>{' '}
            covers Top 5 scoring, Head-to-Head picks and session deadlines.
          </p>
        </section>

        <PicksCallToAction className="mt-10" placement="guides_index" />
      </div>
    </div>
  );
}
