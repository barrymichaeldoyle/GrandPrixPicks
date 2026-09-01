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
  'The 2027 Formula 1 calendar is not official yet. Autumn announcement, the reported 24-race plan, and what happens if the opener has to move.';

const REPORTED_ROWS = [
  {
    term: 'When it will be announced',
    detail:
      'Formula 1 has said it will publish the calendar in autumn 2026, and may still change it before the year is out.',
  },
  {
    term: 'Season size',
    detail:
      '24 Grands Prix. Stefano Domenicali has said that still holds even if the opening races have to move.',
  },
  {
    term: 'Where it starts',
    detail:
      'Bahrain in mid-March, then Saudi Arabia a week later. Reports currently have those as 12–14 March and 19–21 March.',
  },
  {
    term: 'Returning venues',
    detail: 'Portimão and Istanbul Park.',
  },
  {
    term: 'Testing',
    detail:
      'Bahrain, last week of February, on the current plan. Barcelona is the standby if that cannot happen.',
  },
  {
    term: 'If Bahrain and Saudi Arabia cannot open the season',
    detail:
      'Formula 1 says it has other options. Reports have named China as a possible March start.',
  },
] as const;

const FAQS = [
  {
    question: 'Has the 2027 F1 calendar been confirmed?',
    answer:
      'Not yet. A Formula 1 calendar becomes official when the FIA World Motor Sport Council ratifies it, which usually happens in the autumn before the season it covers. Until that happens, treat every date in circulation as unofficial.',
  },
  {
    question: 'When will the 2027 F1 calendar be announced?',
    answer:
      'Formula 1 has said it will be presented in the autumn. Stefano Domenicali has described that as a normal plan that can still be adjusted until the end of the year.',
  },
  {
    question: 'When does the 2027 F1 season start?',
    answer:
      'No start date is official. Current reporting puts Bahrain on the weekend of 12–14 March, with Saudi Arabia the following weekend, but nothing is confirmed until the calendar is ratified.',
  },
  {
    question: 'How many races will there be in 2027?',
    answer:
      "Reporting, and F1's own target, has pointed to 24 Grands Prix. For comparison, the 2026 season on Grand Prix Picks runs to 22 rounds.",
  },
  {
    question: 'What if Bahrain and Jeddah cannot run?',
    answer:
      'Nothing is locked. Domenicali has said F1 has other plans if the Middle East situation is not resolved, and that the 24-race target still stands. Reporting has pointed to China as a possible season opener in that case.',
  },
  {
    question: 'Will there be sprint races in 2027?',
    answer:
      'Almost certainly, though the number and the venues are not confirmed. Recent seasons have run six sprint weekends, each replacing two practice sessions with sprint qualifying and a short race.',
  },
  {
    question: 'Where will the confirmed 2027 dates appear?',
    answer:
      'On this page, and on the race calendar once the rounds are loaded. Predictions open per round, so each Grand Prix becomes playable as its sessions are scheduled.',
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
      imageAlt:
        'F1 2027 calendar: unofficial status and the reported 24-race plan',
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
              No date confirmed
            </span>
          </div>
          <p className="gpp-label mt-3 text-text-muted">
            Last reviewed {LAST_REVIEWED}
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            No 2027 date is confirmed. Formula 1 has said the calendar will be
            presented in autumn 2026. Until the FIA World Motor Sport Council
            ratifies it, treat the rest of this page as unofficial.
          </p>
        </header>

        <section aria-labelledby="reported-plan" className="mt-10 sm:mt-12">
          <p className="gpp-label mb-1 text-accent uppercase">Reported plan</p>
          <h2
            id="reported-plan"
            className="font-title text-2xl font-semibold text-text sm:text-3xl"
          >
            What is being reported
          </h2>
          <p className="gpp-reading-copy mt-3 max-w-3xl text-text-muted">
            Nothing here is official yet. Last reviewed {LAST_REVIEWED}.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[20rem] table-fixed border-collapse text-sm sm:min-w-[36rem] sm:table-auto">
              <caption className="sr-only">
                Unofficial 2027 Formula 1 calendar details.
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-left">
                  <th
                    scope="col"
                    className="w-[38%] px-4 py-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:w-52"
                  >
                    Topic
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold tracking-label text-text-muted uppercase"
                  >
                    Reported detail
                  </th>
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
            Treat all of it as provisional. Calendars change between the first
            reports and ratification.
          </p>
        </section>

        <section aria-labelledby="common-questions" className="mt-12 sm:mt-16">
          <p className="gpp-label mb-1 text-accent uppercase">Questions</p>
          <h2
            id="common-questions"
            className="font-title text-2xl font-semibold text-text"
          >
            Common questions
          </h2>
          <dl className="mt-7 border-t border-border">
            {FAQS.map((faq, index) => (
              <div
                key={faq.question}
                className="border-b border-border py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_1.35fr] sm:items-start sm:gap-8 sm:py-6"
              >
                <dt className="font-semibold text-text">
                  <span
                    className="mr-2 font-mono text-xs font-normal text-text-muted tabular-nums"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {faq.question}
                </dt>
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
            What a season usually looks like
          </h2>
          <p className="gpp-reading-meta mt-3 text-text-muted">
            The shape of a season is far more predictable than its dates. The
            2026 season on this site runs to 22 rounds, opening in early March
            and finishing in the back half of the year, with six of those
            weekends run to the sprint format.
          </p>
          <p className="gpp-reading-meta mt-3 border-l-2 border-border pl-4 text-text-muted">
            A conventional weekend gives three practice sessions, then
            qualifying, then the Grand Prix. A sprint weekend cuts practice to
            one session and adds sprint qualifying and a short race on Saturday,
            which means four scoreable sessions here instead of two.
          </p>
          <p className="gpp-reading-meta mt-3 text-text-muted">
            None of that depends on the 2027 calendar being published, so it is
            worth understanding before the dates land.
          </p>
        </section>

        <aside
          aria-labelledby="while-you-wait"
          className="mt-10 rounded-xl border border-border bg-surface p-5 sm:mt-12 sm:p-6"
        >
          <h2
            id="while-you-wait"
            className="font-title text-lg font-semibold text-text"
          >
            While you wait for 2027
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
                  Every round of the current season, with session times and the
                  lock time for each one.
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
                  Session by session, and what each one is actually for.
                </span>
              </Link>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
