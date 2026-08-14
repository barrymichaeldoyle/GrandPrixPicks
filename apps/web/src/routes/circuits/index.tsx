import { listCircuits } from '@grandprixpicks/shared/circuits';
import { createFileRoute, Link } from '@tanstack/react-router';

import { PageHeader } from '@/components/PageHeader';
import { getCircuitGuideBySlug } from '@/lib/circuitGuides';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

export const Route = createFileRoute('/circuits/')({
  component: CircuitsIndexPage,
  head: () => {
    const meta = pageMeta({
      title: 'F1 Circuits | Track Types, Overtaking and Upset Risk',
      description:
        'Every circuit on the Formula 1 calendar compared side by side: what kind of track it is, how hard it is to overtake, and how often the favourites get beaten.',
      path: '/circuits',
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
                '@id': `${siteConfig.url}/circuits#page`,
                url: `${siteConfig.url}/circuits`,
                name: 'Formula 1 circuits',
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              breadcrumbSchema('/circuits', [
                { name: 'Circuits', path: '/circuits' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function CircuitsIndexPage() {
  // Only circuits we have written a guide for. An entry with no guide would be
  // a name and a country, which is the thin-page shape these exist to avoid.
  const circuits = listCircuits().flatMap((circuit) => {
    const guide = getCircuitGuideBySlug(circuit.slug);
    return guide ? [{ circuit, guide }] : [];
  });

  return (
    <main className="min-h-full bg-page">
      <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
        <PageHeader
          eyebrow="Circuits"
          title="Every circuit, compared"
          subtitle="The same three judgements for every track on the calendar. Track type tells you what kind of place it is, overtaking tells you whether Sunday can undo Saturday, and upset risk tells you how much to trust the favourites."
        />

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-2xl border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 text-xs font-semibold tracking-label text-text-muted uppercase">
                  Circuit
                </th>
                <th className="py-2 pr-4 text-xs font-semibold tracking-label text-text-muted uppercase">
                  Location
                </th>
                {['Track type', 'Overtaking', 'Upset risk'].map((label) => (
                  <th
                    key={label}
                    className="py-2 pr-4 text-xs font-semibold tracking-label text-text-muted uppercase"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {circuits.map(({ circuit, guide }) => (
                <tr key={circuit.slug} className="border-b border-border/60">
                  <td className="py-3 pr-4">
                    <Link
                      to="/circuits/$circuitSlug"
                      params={{ circuitSlug: circuit.slug }}
                      className="font-semibold text-accent hover:text-accent-hover"
                    >
                      {circuit.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-text-muted">
                    {circuit.locality}, {circuit.country}
                  </td>
                  {guide.traits.map((trait) => (
                    <td key={trait.label} className="py-3 pr-4 text-text">
                      {trait.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <nav
          aria-label="Related pages"
          className="mt-10 border-t border-border pt-6"
        >
          <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
            Keep reading
          </p>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 [&_a]:text-accent [&_a:hover]:text-accent-hover">
            <li>
              <Link to="/races">The current F1 race calendar</Link>
            </li>
            <li>
              <Link to="/guides">Guides to the formats and the scoring</Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
