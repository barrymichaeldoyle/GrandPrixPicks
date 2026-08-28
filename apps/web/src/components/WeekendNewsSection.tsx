import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';

import { SESSION_LABELS } from '@/lib/sessions';
import type { SessionType } from '@/lib/sessions';

type NewsItem = {
  key: string;
  headline: string;
  body: string;
  affectsSessions: string[];
  sourceName: string;
  sourceUrl: string;
};

/**
 * What changed this weekend, read from `raceNews` rather than written into the
 * page.
 *
 * These items used to be hand-written sections here *and* published to the
 * feed, which is the same fact in two places and the classic way one of them
 * goes stale: a penalty firming up from "ten places minimum" to "confirmed back
 * of grid" would have needed editing twice. Publishing once now updates both.
 *
 * What stays hand-written is everything that is not a discrete sourced event:
 * an ongoing situation like a fitness watch, colour like a tribute livery, and
 * the circuit analysis. Those are prose, they have no `affectsSessions` answer,
 * and the feed is deliberately not the place for them.
 */
export function WeekendNewsSection({
  items,
  weekendSessions,
}: {
  items: NewsItem[];
  /** Sessions this weekend actually runs, so "unaffected" can name them. */
  weekendSessions: SessionType[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16" aria-labelledby="weekend-news">
      <div className="max-w-3xl">
        <h2
          id="weekend-news"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What changed this weekend
        </h2>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          News that moves a pick, and which of your picks it moves.
        </p>
      </div>

      <div className="mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.key} className="bg-surface p-5 sm:p-6">
            <h3 className="font-title text-lg font-medium text-text">
              {item.headline}
            </h3>
            <p className="gpp-reading-copy mt-3 text-text-muted">{item.body}</p>
            <PickImpact
              affects={item.affectsSessions as SessionType[]}
              weekendSessions={weekendSessions}
            />
            <p className="mt-3">
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="gpp-touch-target inline-flex items-center gap-1 text-sm font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
              >
                {item.sourceName}
                <ExternalLink className="size-3 shrink-0" aria-hidden />
              </a>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/**
 * Which of your Top 5s to go back and look at.
 *
 * The wording is advisory on purpose, and this was got wrong once. "Changes
 * your Qualifying picks" sitting under a headline about a grid penalty reads as
 * *the penalty changed the qualifying result*, which is the single thing
 * players most often get wrong about this game. It does not: a driver
 * classified P4 scores as P4 however far back the penalty makes him start.
 *
 * News never changes how a session is scored, because the scoring rules do not
 * move. What it changes is the outcome you should expect, so the only honest
 * question this line can answer is which picks are worth another look. That is
 * true of every item, which is why it is the default rather than special
 * handling for penalties.
 */
function PickImpact({
  affects,
  weekendSessions,
}: {
  affects: SessionType[];
  weekendSessions: SessionType[];
}) {
  const unaffected = weekendSessions.filter(
    (session) => !affects.includes(session),
  );
  function label(sessions: SessionType[]) {
    return sessions.map((s) => SESSION_LABELS[s]).join(' and ');
  }

  return (
    <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm text-text">
      Worth revisiting:{' '}
      <strong className="font-semibold">{label(affects)}</strong> picks.
      {unaffected.length > 0 ? (
        <>
          {' '}
          <span className="text-text-muted">
            No need to revisit {label(unaffected)}.
          </span>
        </>
      ) : null}{' '}
      {/* "Revisit" says which picks to look at; this says what they are scored
          against, which is the half people get wrong.

          The hash names the section that draws the line, and today it does not
          scroll there: `ScrollToTop` fires on every pathname change and the
          incoming route has not laid out when it runs, so an in-app anchor
          lands at the top of the target page. Every internal anchor on the site
          has this, it is not specific to this link. The hash is kept because
          the URL is right and these links start working the day that is fixed;
          until then the reader still arrives on the correct page. */}
      <Link
        to="/results-policy"
        hash="sessions-heading"
        className="whitespace-nowrap text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
      >
        How these are scored
      </Link>
    </p>
  );
}
