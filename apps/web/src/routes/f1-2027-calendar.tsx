import { createFileRoute, Link } from '@tanstack/react-router';

import { setStaticContentCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { CalendarClock, CircleHelp, Flag } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { NoticeCard } from '@/components/NoticeCard';
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
    term: 'Announcement',
    detail:
      'Autumn 2026. F1 has called that the normal plan, with room to adjust until the end of the year.',
  },
  {
    term: 'Season size',
    detail:
      '24 Grands Prix. Stefano Domenicali has said that target still holds if the opener has to move.',
  },
  {
    term: 'Opening rounds',
    detail:
      'Bahrain in the middle of March, Saudi Arabia the following weekend. Current reporting puts those on the weekends of 12–14 March and 19–21 March.',
  },
  {
    term: 'Returning venues',
    detail: 'Portimão and Istanbul Park.',
  },
  {
    term: 'Pre-season testing',
    detail:
      'Bahrain, last week of February, on the current plan. Barcelona has been mentioned as a standby if the Middle East cannot host it.',
  },
  {
    term: 'If Bahrain and Jeddah cannot run',
    detail:
      'F1 has said it has other plans. Reporting has pointed to China as a possible March opener.',
  },
] as const;

const FAQS = [
  {
    question: 'Has the 2027 F1 calendar been confirmed?',
    answer:
      'Not yet. A Formula 1 calendar becomes official when the FIA World Motor Sport Council ratifies it, which usually happens in the autumn before the season it covers. Until that happens, every date in circulation is a target or a report rather than a fixture.',
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
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader
          eyebrow="Formula 1"
          title="The 2027 F1 calendar"
          subtitle="It is not official yet. Here is what is being reported, and what still has to be confirmed."
          className="mb-6"
        />

        {/* `section`, not `subsection`: this card sits directly under the h1
            with no h2 above it, so an h3 here skipped a level and broke the
            outline a screen reader navigates by. The two levels render at the
            same size, so this is a change of heading rank only. */}
        <NoticeCard
          level="section"
          icon={CircleHelp}
          title="No 2027 date is confirmed"
          description={
            <>
              Formula 1 has said the calendar will be presented in autumn 2026.
              Until the FIA World Motor Sport Council ratifies it, everything
              below is a target or a report. Last reviewed {LAST_REVIEWED}.
            </>
          }
          className="text-left"
        />

        <section aria-labelledby="reported-plan" className="mt-10">
          <h2
            id="reported-plan"
            className="font-title text-2xl font-semibold text-text"
          >
            What is being reported
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The table below is reporting, not fixtures. It lists what people are
            asking about now, kept separate from the rest of the page for that
            reason. Last reviewed {LAST_REVIEWED}.
          </p>
          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[22rem] border-collapse text-sm">
              <caption className="sr-only">
                Reported details for the 2027 Formula 1 calendar, not confirmed
                fixtures
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted/50 text-left">
                  <th
                    scope="col"
                    className="w-[38%] px-4 py-3 text-xs font-semibold tracking-label text-text-muted uppercase sm:w-48"
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
                      className="px-4 py-4 align-top font-semibold text-text"
                    >
                      {row.term}
                    </th>
                    <td className="gpp-reading-copy px-4 py-4 align-top text-text-muted">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="gpp-reading-meta mt-4 text-text-muted">
            Treat all of it as provisional. Calendars change between the first
            reports and ratification.
          </p>
        </section>

        <section
          aria-labelledby="common-questions"
          className="mt-10 border-t border-border pt-8"
        >
          <h2
            id="common-questions"
            className="font-title text-2xl font-semibold text-text"
          >
            Common questions
          </h2>
          <dl className="mt-8 divide-y divide-border border-t border-border">
            {FAQS.map((faq) => (
              <div key={faq.question} className="py-6">
                <dt className="text-base font-semibold text-text">
                  {faq.question}
                </dt>
                <dd className="gpp-reading-copy mt-3 text-text-muted">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="season-shape"
          className="mt-10 border-t border-border pt-8"
        >
          <h2 id="season-shape" className="text-lg font-semibold text-text">
            What a season usually looks like
          </h2>
          <p className="gpp-reading-meta mt-3 text-text-muted">
            The shape of a season is far more predictable than its dates. The
            2026 season on this site runs to 22 rounds, opening in early March
            and finishing in the back half of the year, with six of those
            weekends run to the sprint format.
          </p>
          <p className="gpp-reading-meta mt-3 text-text-muted">
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

        <aside className="mt-12 border-t border-border pt-8">
          <h2 className="font-title text-lg font-semibold text-text">
            While you wait for 2027
          </h2>
          <ul className="mt-4 space-y-4">
            <li>
              <Link
                to="/races"
                className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover"
              >
                <Flag className="h-4 w-4" aria-hidden />
                The 2026 race calendar
              </Link>
              <p className="mt-1 text-sm text-text-muted">
                Every round of the current season, with session times and the
                lock time for each one.
              </p>
            </li>
            <li>
              <Link
                to="/guides/$guideSlug"
                params={{ guideSlug: 'f1-race-weekend-format' }}
                className="inline-flex items-center gap-1.5 font-semibold text-accent hover:text-accent-hover"
              >
                <CalendarClock className="h-4 w-4" aria-hidden />
                What happens across a race weekend
              </Link>
              <p className="mt-1 text-sm text-text-muted">
                Session by session, and what each one is actually for.
              </p>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
