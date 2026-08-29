import { Link } from '@tanstack/react-router';

import { DriverBadge } from '@/components/DriverBadge';
import { ExternalLink } from 'lucide-react';

import { SESSION_LABELS } from '@/lib/sessions';
import type { SessionType } from '@/lib/sessions';

type NewsDriver = {
  code: string;
  displayName: string;
  team: string | null;
  number: number | null;
  nationality: string | null;
};

type NewsItem = {
  key: string;
  headline: string;
  body: string;
  affectsSessions: string[];
  sourceName: string;
  sourceUrl: string;
  drivers?: NewsDriver[];
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
    <section className="py-8 sm:py-16" aria-labelledby="weekend-news">
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
          // A column so the source row can be pushed to the bottom: the
          // bodies differ in length, and without it each card's rule and
          // attribution sit at a different height across the grid.
          <article
            key={item.key}
            className="flex flex-col bg-surface p-4 sm:p-6"
          >
            {/* Above the headline rather than beside it: the badge carries the
                team colour, so a reader sees this is a Williams story or a
                Mercedes one before reading a word of it. Codes come from the
                published record, never from scanning the prose, which on this
                very card would badge Russell for an item about Antonelli. */}
            {item.drivers && item.drivers.length > 0 ? (
              <p className="mb-2 flex flex-wrap items-center gap-1.5 sm:mb-3">
                {item.drivers.map((driver) => (
                  <DriverBadge
                    key={driver.code}
                    code={driver.code}
                    team={driver.team}
                    displayName={driver.displayName}
                    number={driver.number}
                    nationality={driver.nationality}
                    size="sm"
                    prerenderTooltip={false}
                  />
                ))}
              </p>
            ) : null}
            <h3 className="font-title text-lg font-medium text-text">
              {item.headline}
            </h3>
            <p className="gpp-reading-copy mt-2 text-text-muted sm:mt-3">
              {item.body}
            </p>
            <PickImpact
              affects={item.affectsSessions as SessionType[]}
              weekendSessions={weekendSessions}
            />
            <p className="mt-4 border-t border-border pt-3 max-sm:mt-4 sm:mt-auto sm:pt-4">
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

      {/* One link for the section, not one per card. It used to sit inside
          every impact line, where it wrapped mid-sentence and repeated itself
          as many times as there was news. What it explains is a rule about
          scoring, which does not change per item. */}
      <p className="mt-5 text-sm text-text-muted">
        A penalty moves where a driver starts, not where they were classified.{' '}
        <Link
          to="/results-policy"
          hash="sessions-heading"
          className="gpp-touch-target font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          How each session is scored
        </Link>
      </p>
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
/**
 * The sessions worth naming for a news item, or `null` when naming them adds
 * nothing.
 *
 * An item touching every session of the weekend says "revisit everything",
 * which is the same as saying nothing at all. Both Monza items affected both
 * of that weekend's sessions, so each card carried an identical highlighted
 * line that told a reader precisely nothing about how the two differed. The
 * line earns its place only when it narrows the weekend down.
 */
export function pickImpactSessions(
  affects: SessionType[],
  weekendSessions: SessionType[],
): { affected: SessionType[]; unaffected: SessionType[] } | null {
  const unaffected = weekendSessions.filter(
    (session) => !affects.includes(session),
  );
  return unaffected.length === 0 ? null : { affected: affects, unaffected };
}

function PickImpact({
  affects,
  weekendSessions,
}: {
  affects: SessionType[];
  weekendSessions: SessionType[];
}) {
  const impact = pickImpactSessions(affects, weekendSessions);
  if (!impact) {
    return null;
  }
  const { unaffected } = impact;

  function label(sessions: SessionType[]) {
    return sessions.map((s) => SESSION_LABELS[s]).join(' and ');
  }

  return (
    <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm text-text">
      Worth revisiting:{' '}
      <strong className="font-semibold">{label(affects)}</strong> picks.{' '}
      <span className="text-text-muted">
        No need to revisit {label(unaffected)}.
      </span>
    </p>
  );
}
