import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { listGuides } from '@/lib/guides';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

export const Route = createFileRoute('/guides/')({
  component: GuidesIndexPage,
  head: () => {
    const meta = pageMeta({
      title: 'F1 Guides | Formats, Scoring and Prediction Strategy',
      description:
        'Plain-English guides to Formula 1: how sprint weekends work, how championship points are awarded, what happens across a race weekend, and how to predict a top five.',
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
  const guides = listGuides();

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <PageHeader
          eyebrow="Guides"
          title="Formula 1, explained"
          subtitle="How the weekend is structured, how points are awarded, and how to turn all of that into a better prediction."
        />

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
      </div>
    </div>
  );
}
