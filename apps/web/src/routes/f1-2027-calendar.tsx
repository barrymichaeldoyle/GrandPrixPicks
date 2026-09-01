import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { CalendarClock, ChevronRight, Flag } from 'lucide-react';

import { breadcrumbSchema, pageMeta, siteConfig } from '@/lib/site';

/**
 * The 2027 calendar, before there is a 2027 calendar.
 *
 * Deliberately not a table of dates. Nothing about 2027 is official until the
 * FIA ratifies it, and a grid of TBC rows is exactly the placeholder shape that
 * got this site turned down by AdSense once already. What this page can do
 * honestly is answer the questions people are typing now: whether it is
 * confirmed, when it usually becomes confirmed, and what is being reported in
 * the meantime, clearly marked as reporting rather than fact.
 *
 * When the calendar is ratified this becomes the round list and the reporting
 * section goes. Until then every claim here has to survive being wrong about
 * the rumours.
 */

/** Bumped by hand whenever the reported section below is re-checked. */
const LAST_REVIEWED = '1 September 2026';

const PAGE_TITLE = 'F1 2027 Calendar | Grand Prix Picks';
const PAGE_DESCRIPTION =
  'The 2027 F1 calendar is not official yet. F1 says it will publish in autumn 2026. Here is the 24-race plan being discussed and what happens if the opener moves.';

const REPORTED_ROWS = [
  {
    term: 'When it comes out',
    detail:
      'Formula 1 has said autumn 2026. It may still change the list before the year ends.',
  },
  {
    term: 'How many races',
    detail:
      '24. F1 has said that number still holds if the first races have to move.',
  },
  {
    term: 'Season opener',
    detail:
      'Bahrain in mid-March, then Saudi Arabia a week later. Reports currently have 12–14 March and 19–21 March.',
  },
  {
    term: 'Tracks coming back',
    detail: 'Portimão and Istanbul Park.',
  },
  {
    term: 'Testing',
    detail:
      'Bahrain, last week of February, on the current plan. Barcelona is the standby if that cannot happen.',
  },
  {
    term: 'If the Middle East races cannot run',
    detail:
      'F1 says it has other options. Reports have named China as a possible March start.',
  },
] as const;

const FAQS = [
  {
    question: 'Has the 2027 F1 calendar been confirmed?',
    answer:
      'No. F1 has not published it, and the FIA has not ratified it. Treat every date you see as unofficial.',
  },
  {
    question: 'When will it be announced?',
    answer:
      'F1 has said autumn 2026, with room to change it before the year is out.',
  },
  {
    question: 'When does the 2027 season start?',
    answer:
      'Nothing is official. Reports have Bahrain on 12–14 March and Saudi Arabia the next weekend.',
  },
  {
    question: 'How many races in 2027?',
    answer: 'F1 is targeting 24. The 2026 season on this site has 22.',
  },
  {
    question: 'What if Bahrain and Saudi Arabia cannot open the season?',
    answer:
      'F1 says it has other plans. Reports have pointed to China as a possible March opener.',
  },
  {
    question: 'Will there be sprints in 2027?',
    answer:
      'Almost certainly, but the number and venues are not set. Recent seasons have used six sprint weekends.',
  },
  {
    question: 'Where will the official dates appear?',
    answer:
      'On this page, and on the 2027 race list once the rounds are loaded.',
  },
] as const;

export const Route = createFileRoute('/f1-2027-calendar')({
  loader: setStaticContentCacheHeaders,
  component: F1Calendar2027Page,
  head: () => {
    const meta = pageMeta({
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      path: '/f1-2027-calendar',
      imageAlt: 'F1 2027 calendar, still unofficial',
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
                '@type': 'WebPage',
                '@id': `${siteConfig.url}/f1-2027-calendar#page`,
                url: `${siteConfig.url}/f1-2027-calendar`,
                name: 'F1 2027 Calendar',
                description: PAGE_DESCRIPTION,
                inLanguage: 'en',
                isPartOf: { '@id': `${siteConfig.url}/#app` },
              },
              {
                '@type': 'FAQPage',
                '@id': `${siteConfig.url}/f1-2027-calendar#faq`,
                mainEntity: FAQS.map((faq) => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: { '@type': 'Answer', text: faq.answer },
                })),
              },
              breadcrumbSchema('/f1-2027-calendar', [
                { name: '2027 calendar', path: '/f1-2027-calendar' },
              ]),
            ],
          }),
        },
      ],
    };
  },
});

function F1Calendar2027Page() {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-(--page-max) px-4 py-6 sm:py-8">
        <header className="max-w-4xl">
          <p className="mb-2 text-xs font-semibold tracking-label text-accent uppercase">
            Formula 1
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <h1 className="font-title text-3xl font-semibold text-text sm:text-4xl">
              The 2027 F1 calendar
            </h1>
            <span className="inline-flex w-fit items-center rounded-full border border-warning/35 bg-warning-muted/40 px-3 py-1 text-xs font-semibold text-warning">
              Unofficial
            </span>
          </div>
          <p className="gpp-label mt-3 text-text-muted">
            Last reviewed {LAST_REVIEWED}
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            Formula 1 has not signed off a 2027 calendar. It has said it will
            publish one in autumn 2026. Dates can still move after that, until
            the FIA ratifies the list.
          </p>
        </header>

        <section aria-labelledby="plan-so-far" className="mt-10 sm:mt-12">
          <h2
            id="plan-so-far"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            The 2027 plan so far
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Last reviewed {LAST_REVIEWED}.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[20rem] table-fixed border-collapse text-sm sm:min-w-[36rem] sm:table-auto">
              <caption className="sr-only">
                Unofficial 2027 Formula 1 calendar details.
              </caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {REPORTED_ROWS.map((row) => (
                  <tr key={row.term} className="border-b border-border/60">
                    <th
                      scope="row"
                      className="px-4 py-3.5 align-top text-sm font-semibold text-text sm:py-4 sm:pr-2"
                    >
                      {row.term}
                    </th>
                    <td className="gpp-reading-copy px-4 py-3.5 align-top text-text-muted sm:py-4">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gpp-reading-meta mt-4 rounded-lg border border-border/70 bg-surface-muted/30 px-4 py-3 text-text-muted">
            Dates can still move before the FIA list is final.
          </p>
        </section>

        <section aria-labelledby="questions" className="mt-12 sm:mt-16">
          <h2
            id="questions"
            className="font-title text-2xl font-semibold text-text"
          >
            Questions
          </h2>
          <dl className="mt-7 border-t border-border">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="border-b border-border py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_1.35fr] sm:items-start sm:gap-8 sm:py-6"
              >
                <dt className="font-semibold text-text">{faq.question}</dt>
                <dd className="gpp-reading-copy mt-2 text-text-muted sm:mt-0">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="season-shape"
          className="mt-10 rounded-lg border border-border/60 bg-surface-muted/20 p-5 sm:mt-12 sm:p-6"
        >
          <h2
            id="season-shape"
            className="text-base font-semibold text-text-muted"
          >
            A normal F1 season
          </h2>
          <p className="gpp-reading-meta mt-3 text-text-muted">
            A season runs from March to December. A normal weekend is practice,
            qualifying, then the race. A sprint weekend drops two practices and
            adds a short Saturday race.
          </p>
        </section>

        <aside
          aria-labelledby="this-season"
          className="mt-10 rounded-xl border border-border bg-surface p-5 sm:mt-12 sm:p-6"
        >
          <h2
            id="this-season"
            className="font-title text-lg font-semibold text-text"
          >
            This season
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li>
              <Link
                to="/races"
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <Flag className="h-4 w-4 text-accent" aria-hidden />
                  The 2026 race calendar
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  Session times and lock times for every round this year.
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'f1-race-weekend-format' }}
                className="group flex h-full flex-col rounded-lg border border-border p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted/30"
              >
                <span className="inline-flex items-center gap-2 font-semibold text-text group-hover:text-accent">
                  <CalendarClock className="h-4 w-4 text-accent" aria-hidden />
                  What happens across a race weekend
                  <ChevronRight
                    className="h-4 w-4 text-text-muted group-hover:text-accent"
                    aria-hidden
                  />
                </span>
                <span className="gpp-reading-meta mt-2 text-text-muted">
                  Each session, and what it is for.
                </span>
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
