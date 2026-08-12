import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { getGuide, listGuides } from '@/lib/guides';
import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

export const Route = createFileRoute('/guides/$guideSlug')({
  loader: ({ params }) => {
    const guide = getGuide(params.guideSlug);
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
                author: {
                  '@type': 'Person',
                  name: siteConfig.author.name,
                  url: siteConfig.author.url,
                },
                publisher: {
                  '@type': 'Organization',
                  name: siteConfig.title,
                  url: siteConfig.url,
                },
                mainEntityOfPage: `${siteConfig.url}/guides/${guide.slug}`,
              },
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
  const { guide } = Route.useLoaderData();
  const others = listGuides().filter((entry) => entry.slug !== guide.slug);

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          All guides
        </Link>

        <article className="mt-6">
          <header>
            <p className="text-xs font-semibold tracking-label text-accent uppercase">
              Guide
            </p>
            <h1 className="font-title mt-1 text-3xl font-semibold text-text sm:text-4xl">
              {guide.title}
            </h1>
            <p className="gpp-reading-copy mt-3 text-lg text-text-muted">
              {guide.summary}
            </p>
          </header>

          {guide.sections.map((section) => (
            <section
              key={section.heading}
              className="mt-10 border-t border-border pt-8"
            >
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
            <section className="mt-10 border-t border-border pt-8">
              <h2 className="font-title text-2xl font-semibold text-text">
                Common questions
              </h2>
              <dl className="mt-6 border-t border-border">
                {guide.faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="border-b border-border py-5"
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

        {guide.liveLinks && guide.liveLinks.length > 0 ? (
          <aside className="mt-12 border-t border-border pt-8">
            <h2 className="font-title text-lg font-semibold text-text">
              See it live
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
                  <p className="gpp-reading-copy mt-1 text-sm text-text-muted">
                    {link.detail}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <aside className="mt-12 border-t border-border pt-8">
          <h2 className="font-title text-lg font-semibold text-text">
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
      </div>
    </div>
  );
}
