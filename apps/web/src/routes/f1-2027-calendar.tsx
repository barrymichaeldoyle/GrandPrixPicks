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
const LAST_REVIEWED = '12 August 2026';

const FAQS = [
  {
    question: 'Has the 2027 F1 calendar been confirmed?',
    answer:
      'Not yet. A Formula 1 calendar becomes official when the FIA World Motor Sport Council ratifies it, which usually happens in the autumn before the season it covers. Until that happens, every date in circulation is a target or a report rather than a fixture.',
  },
  {
    question: 'When does the 2027 F1 season start?',
    answer:
      'No start date is official. Reporting has pointed to a Bahrain opener in the middle of March, which would follow the recent pattern of starting the season in the first half of March, but nothing is confirmed until the calendar is ratified.',
  },
  {
    question: 'How many races will there be in 2027?',
    answer:
      'Reporting has pointed to around 24 rounds. For comparison, the 2026 season on Grand Prix Picks runs to 22 rounds.',
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
      title: 'F1 2027 Calendar: What Is Confirmed | Grand Prix Picks',
      description:
        'The 2027 Formula 1 calendar is not official yet. What has to happen first, when that usually occurs, what is being reported, and where the dates will appear.',
      path: '/f1-2027-calendar',
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
                name: 'The 2027 F1 calendar',
                description:
                  'What is confirmed about the 2027 Formula 1 calendar, what is only reported, and when it becomes official.',
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
          subtitle="It is not official yet. Here is what that actually means, and what is known so far."
        />

        {/* `section`, not `subsection`: this card sits directly under the h1
            with no h2 above it, so an h3 here skipped a level and broke the
            outline a screen reader navigates by. The two levels render at the
            same size, so this is a change of heading rank only. */}
        <NoticeCard
          level="section"
          icon={CircleHelp}
          title="No 2027 date is confirmed"
          description="A Formula 1 calendar becomes official when the FIA World Motor Sport Council ratifies it, usually in the autumn before the season. Everything circulating before that is a target or a report."
        />

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            What is being reported
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The items below are reporting, not fixtures. They are listed because
            they are what people are asking about, and they are kept separate
            from everything else on this page for exactly that reason. Last
            reviewed {LAST_REVIEWED}.
          </p>
          <dl className="mt-6 border-t border-border">
            {[
              {
                term: 'Season size',
                detail:
                  'Around 24 rounds, in line with the size recent seasons have settled at.',
              },
              {
                term: 'Opening rounds',
                detail:
                  'A Bahrain opener in the middle of March, with Saudi Arabia the following weekend.',
              },
              {
                term: 'Returning venues',
                detail:
                  'Portimão and Istanbul Park have both been reported as returning. Neither has appeared on a calendar in recent seasons.',
              },
              {
                term: 'Pre-season testing',
                detail: 'Bahrain, in the last week of February.',
              },
            ].map((item) => (
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
          <p className="gpp-reading-copy mt-6 text-text-muted">
            Treat all of it as provisional. Calendars change between the first
            reports and ratification, and venues that look locked in have
            dropped off before.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            What a season usually looks like
          </h2>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            The shape of a season is far more predictable than its dates. The
            2026 season on this site runs to 22 rounds, opening in early March
            and finishing in the back half of the year, with six of those
            weekends run to the sprint format.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            A conventional weekend gives three practice sessions, then
            qualifying, then the Grand Prix. A sprint weekend cuts practice to
            one session and adds sprint qualifying and a short race on Saturday,
            which means four scoreable sessions here instead of two.
          </p>
          <p className="gpp-reading-copy mt-4 text-text-muted">
            None of that depends on the 2027 calendar being published, so it is
            worth understanding before the dates land.
          </p>
        </section>

        <section className="mt-10 border-t border-border pt-8">
          <h2 className="font-title text-2xl font-semibold text-text">
            Common questions
          </h2>
          <dl className="mt-6 border-t border-border">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border-b border-border py-5">
                <dt className="font-semibold text-text">{faq.question}</dt>
                <dd className="gpp-reading-copy mt-2 text-text-muted">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
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
