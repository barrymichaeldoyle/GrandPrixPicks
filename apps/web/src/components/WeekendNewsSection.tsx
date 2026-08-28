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
 * The line that makes an item useful rather than interesting.
 *
 * Derived from `affectsSessions` instead of written per item, because the
 * reasoning is the same every time and it is the site's own scoring rule: a
 * grid penalty moves a race start and leaves the qualifying classification
 * alone, so a player wants to know which of their two Top 5s to revisit. Saying
 * what is *not* affected matters as much as what is, and only data can say it
 * without someone remembering to.
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
      Changes your <strong className="font-semibold">{label(affects)}</strong>{' '}
      picks.
      {unaffected.length > 0 ? (
        <>
          {' '}
          <span className="text-text-muted">
            Your {label(unaffected)} picks are unaffected.
          </span>
        </>
      ) : null}
    </p>
  );
}
