import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { InAppBackLink } from '@/components/InAppBackLink';
import { getGuide } from '@/lib/guides';
import { getGuideMeta, listGuideMeta } from '@/lib/guideMeta';
import {
  breadcrumbSchema,
  guideOgImageUrl,
  organizationSchema,
  pageMeta,
  siteConfig,
} from '@/lib/site';
import { PicksCallToAction } from '@/components/PicksCallToAction/PicksCallToAction';

/**
 * Guides retired on 2026-09-08, and where a reader is sent instead.
 *
 * All three earned nothing and were read by nobody: zero search
 * impressions between them, and one pageview across the whole of `/guides`
 * in 90 days. Two of them also explained what `/how-to-play` explains, which
 * is the page they redirect to and the one the product links now point at.
 *
 * A 301 rather than a 404 because two were linked from the home page and the
 * Singapore write-up, so the URLs are in the wild.
 */
const RETIRED_GUIDES = new Set([
  'f1-half-points-races',
  'f1-sprint-weekends-explained',
  'how-to-predict-f1-top-five',
]);

export const Route = createFileRoute('/guides/$guideSlug')({
  beforeLoad: ({ params }) => {
    if (RETIRED_GUIDES.has(params.guideSlug)) {
      throw redirect({ to: '/how-to-play', statusCode: 301 });
    }
  },
  loader: async ({ params }) => {
    await setStaticContentCacheHeaders();
    // Front matter only. `head` needs the title, description and FAQ schema;
    // pulling the writing here would put every guide in the client entry,
    // because `loader` is not part of the split chunk `component` gets.
    const guide = getGuideMeta(params.guideSlug);
    if (!guide) {
      throw notFound();
    }
    return { guide };
  },
  component: GuidePage,
  head: ({ loaderData, params }) => {
    const guide = loaderData?.guide;
    if (!guide) {
      return pageMeta({
        title: 'Guide | Grand Prix Picks',
        description: 'Formula 1 guides from Grand Prix Picks.',
        path: `/guides/${params.guideSlug}`,
      });
    }
    return {
      ...pageMeta({
        title: guide.metaTitle,
        description: guide.metaDescription,
        path: `/guides/${guide.slug}`,
        image: guideOgImageUrl(guide.slug),
        imageAlt: guide.title,
      }),
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Article',
                '@id': `${siteConfig.url}/guides/${guide.slug}#article`,
                headline: guide.title,
                description: guide.metaDescription,
                inLanguage: 'en',
                datePublished: guide.publishedAt,
                // Falls back to the publication date rather than to today:
                // an unrevised guide was not modified, and saying otherwise
                // is a freshness claim we would be making up.
                dateModified: guide.updatedAt ?? guide.publishedAt,
                image: guideOgImageUrl(guide.slug),
                author: {
                  '@type': 'Person',
                  name: siteConfig.author.name,
                  url: siteConfig.author.url,
                },
                // By reference, so the logo and profiles live in one place.
                publisher: { '@id': `${siteConfig.url}/#organization` },
                mainEntityOfPage: `${siteConfig.url}/guides/${guide.slug}`,
              },
              organizationSchema(),
              breadcrumbSchema(`/guides/${guide.slug}`, [
                { name: 'Guides', path: '/guides' },
                { name: guide.title, path: `/guides/${guide.slug}` },
              ]),
              // Only when the guide actually renders these questions on the
              // page. FAQ markup that does not match visible content is a
              // structured-data violation, not a shortcut.
              ...(guide.faqs && guide.faqs.length > 0
                ? [
                    {
                      '@type': 'FAQPage',
                      '@id': `${siteConfig.url}/guides/${guide.slug}#faq`,
                      mainEntity: guide.faqs.map((faq) => ({
                        '@type': 'Question',
                        name: faq.question,
                        acceptedAnswer: {
                          '@type': 'Answer',
                          text: faq.answer,
                        },
                      })),
                    },
                  ]
                : []),
            ],
          }),
        },
      ],
    };
  },
});

function GuidePage() {
  const { guide: meta } = Route.useLoaderData();
  // The writing, imported here rather than in the loader so it rides the
  // component's own chunk. Unreachable when null: the loader already threw.
  const guide = getGuide(meta.slug);
  const others = listGuideMeta().filter((entry) => entry.slug !== meta.slug);

  if (!guide) {
    return null;
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <InAppBackLink
          fallbackHref="/guides"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          Back
        </InAppBackLink>

        <article className="mt-6">
          {/* The accent arrives as the site's stripe rather than as coloured
              words in the heading: the title is one string of front matter, so
              accenting "part" of it would mean inventing a split per guide, and
              in this system the accent is a 3px edge, not a text colour. */}
          <header className="gpp-stripe pl-5">
            <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
              {guide.title}
            </h1>
            <p className="gpp-reading-copy-lg mt-3 text-text-muted">
              {guide.summary}
            </p>
            {/* Both dates when there are two. Showing only the revision date
                hides how long the guide has stood; showing only the original
                makes a piece revised this week read as months stale. */}
            <p className="mt-4 text-sm text-text-muted">
              By {siteConfig.author.name} · Published{' '}
              <GuideDate value={guide.publishedAt} />
              {guide.updatedAt ? (
                <>
                  {' '}
                  · Updated <GuideDate value={guide.updatedAt} />
                </>
              ) : null}
            </p>
            {guide.status && (
              <p className="gpp-reading-copy mt-6 border border-border bg-surface p-4 text-text">
                {guide.status}
              </p>
            )}
          </header>

          {guide.hero && (
            <figure className="mt-8">
              <img
                src={guide.hero.src}
                alt={guide.hero.alt}
                width={guide.hero.width}
                height={guide.hero.height}
                fetchPriority="high"
                className="h-auto w-full rounded-sm"
              />
              <figcaption className="mt-3 text-sm text-text-muted">
                {guide.hero.caption} Photo:{' '}
                <a
                  href={guide.hero.sourceUrl}
                  className="underline underline-offset-4 hover:text-text"
                >
                  {guide.hero.credit}
                </a>
                ,{' '}
                <a
                  href={guide.hero.licenseUrl}
                  className="underline underline-offset-4 hover:text-text"
                >
                  {guide.hero.license}
                </a>
                . Resized.
              </figcaption>
            </figure>
          )}

          {guide.sections.map((section) => (
            <section
              key={section.heading}
              className={
                section.card
                  ? 'mt-6 rounded-sm border border-border bg-surface p-5 sm:p-6'
                  : // Spacing, no rule. A line between every section turned a
                    // six-section guide into six horizontal rules, which reads
                    // as a form rather than an article. The only rule left on
                    // the page is the one below the writing, where the
                    // appendices start.
                    'mt-12'
              }
            >
              {/* Portrait beside the name, not above it: these panels sit in
                  a run of five, and a full-width photo in each one turns a
                  shortlist into five hero images. Square crop because the
                  source photographs are every shape from 3:4 to 16:9, and a
                  row of ragged heights reads as broken rather than varied. */}
              {section.image ? (
                <figure className="float-right mb-2 ml-4 w-20 sm:w-24">
                  <img
                    src={section.image.src}
                    alt={section.image.alt}
                    width={section.image.width}
                    height={section.image.height}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-sm object-cover"
                    style={
                      section.image.focus
                        ? { objectPosition: section.image.focus }
                        : undefined
                    }
                  />
                  <figcaption className="mt-1 text-[11px] leading-tight text-text-muted">
                    <a
                      href={section.image.sourceUrl}
                      className="underline underline-offset-2 hover:text-text"
                    >
                      {section.image.credit}
                    </a>
                    ,{' '}
                    <a
                      href={section.image.licenseUrl}
                      className="underline underline-offset-2 hover:text-text"
                    >
                      {section.image.license}
                    </a>
                  </figcaption>
                </figure>
              ) : null}
              <h2 className="font-title text-2xl font-semibold text-text">
                {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="gpp-reading-copy mt-4 text-text-muted"
                >
                  {paragraph}
                </p>
              ))}
              {section.sources && (
                <ul className="mt-4 space-y-2 text-sm text-text-muted">
                  {section.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        className="underline underline-offset-4 hover:text-text"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {/* Scrolls in its own container rather than widening the page:
                  four columns do not fit a phone, and a body that scrolls
                  sideways breaks every other section too. */}
              {section.table && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-left">
                    <thead>
                      <tr className="border-y border-border">
                        {section.table.columns.map((column) => (
                          <th
                            key={column}
                            scope="col"
                            className="font-title py-3 pr-6 text-xs font-semibold tracking-wide text-text-muted uppercase"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr
                          key={row[0]}
                          className="border-b border-border align-top"
                        >
                          {row.map((cell, index) =>
                            index === 0 ? (
                              <th
                                key={section.table?.columns[index]}
                                scope="row"
                                className="py-4 pr-6 text-left font-semibold text-text"
                              >
                                {cell}
                              </th>
                            ) : (
                              <td
                                key={section.table?.columns[index]}
                                className="gpp-reading-copy py-4 pr-6 text-text-muted"
                              >
                                {cell}
                              </td>
                            ),
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {section.list && (
                <dl className="mt-6 border-t border-border">
                  {section.list.map((item) => (
                    <div
                      key={item.term}
                      className="grid gap-1 border-b border-border py-4 sm:grid-cols-[11rem_1fr] sm:gap-6"
                    >
                      <dt className="font-semibold text-text">{item.term}</dt>
                      <dd className="gpp-reading-copy text-text-muted">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
          {guide.faqs && guide.faqs.length > 0 ? (
            <section className="mt-12">
              <h2 className="font-title text-2xl font-semibold text-text">
                Common questions
              </h2>
              <dl className="mt-6 border-t border-border">
                {guide.faqs.map((faq) => (
                  <div
                    key={faq.question}
                    // No rule on the last row: the block below opens with its
                    // own, and the two stacked read as a mistake.
                    className="border-b border-border py-5 last:border-b-0"
                  >
                    <dt className="font-semibold text-text">{faq.question}</dt>
                    <dd className="gpp-reading-copy mt-2 text-text-muted">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </article>

        {/* Named landmarks. Two <aside>s on one page are two
            `complementary` regions, and unnamed they are indistinguishable
            in a screen reader's landmark list: "complementary" twice, with
            nothing to choose between them. */}
        {guide.liveLinks && guide.liveLinks.length > 0 ? (
          <aside
            aria-labelledby="guide-live-links"
            className="mt-12 border-t border-border pt-8"
          >
            <h2
              id="guide-live-links"
              className="font-title text-lg font-semibold text-text"
            >
              On the site
            </h2>
            <ul className="mt-4 space-y-4">
              {guide.liveLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="group inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover"
                  >
                    {link.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <p className="mt-1 text-sm text-text-muted">{link.detail}</p>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <aside
          aria-labelledby="guide-keep-reading"
          className="mt-12 border-t border-border pt-8"
        >
          <h2
            id="guide-keep-reading"
            className="font-title text-lg font-semibold text-text"
          >
            Keep reading
          </h2>
          <ul className="mt-4 space-y-3">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link
                  to="/guides/$guideSlug"
                  params={{ guideSlug: entry.slug }}
                  className="group inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover"
                >
                  {entry.title}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        <PicksCallToAction className="mt-12" placement="guide" />
      </div>
    </div>
  );
}

/** A guide's date, rendered the same way wherever it appears in the header. */
function GuideDate({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {new Date(`${value}T12:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })}
    </time>
  );
}
