import { Link } from '@tanstack/react-router';

import { ExternalLink } from 'lucide-react';
import type { CSSProperties } from 'react';

import { TEAM_COLORS } from '@/lib/teamColors';

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
 *
 * A card is a headline, the story, and where it came from. It also carried
 * driver badges and a "worth revisiting" impact line, and stacked one column
 * wide on a phone that was two labelled rows and a rule wrapped around two
 * sentences: the badges repeated codes the headline had already named, and the
 * impact line said "Qualifying and Race" for nearly every item. The driver
 * survives as the team colour on the card's edge, which is the one thing the
 * headline cannot say at a glance, and `affectsSessions` is still required when
 * publishing (see `docs/race-news.md`) and still shown in the feed.
 */
export function WeekendNewsSection({ items }: { items: NewsItem[] }) {
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
        {/* Written the way the rest of the page talks: concrete and advisory,
            not a slogan. "News that moves a pick" was a tagline standing in for
            a sentence, and it told a reader nothing they could act on. */}
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Each of these is a reason to go back and look at a pick again. The
          source is on every card, so you can weigh it yourself rather than take
          our word for it.
        </p>
      </div>

      {/* `gpp-lean-run` flips each card's bar against the one above it, and
          does it in CSS because the answer changes when the grid folds from two
          columns to one. */}
      <div className="gpp-lean-run gpp-lean-run-sm-2col mt-7 grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2">
        {items.map((item) => {
          // The card's own colour, from the driver it is about, exactly as the
          // same item carries it in the feed (`RaceNewsItem`) and as the
          // tribute section below carries Ferrari's. A run of news then reads
          // as a Ferrari story then a Williams one, rather than as three grey
          // blocks a reader has to parse to tell apart.
          //
          // First driver, not all of them: an item about two team mates is one
          // team's story, and the badges already name both.
          const team = item.drivers?.[0]?.team ?? null;
          const teamColour = (team && TEAM_COLORS[team]) || null;

          return (
            // A column so the source row can be pushed to the bottom: the
            // bodies differ in length, and without it each card's rule and
            // attribution sit at a different height across the grid.
            <article
              key={item.key}
              className={`flex flex-col bg-surface p-4 sm:p-6 ${
                teamColour
                  ? // Cut to the house lean, direction from `gpp-lean-run`
                    // above. Deliberately not done to the same items in the
                    // dashboard feed: stacked in one bordered block the bars
                    // are short and butted end to end, and the alternation
                    // reads as noise there rather than rhythm.
                    'gpp-team-bar gpp-team-bar-lean'
                  : ''
              }`}
              style={
                teamColour
                  ? ({ '--team-colour': teamColour } as CSSProperties)
                  : undefined
              }
            >
              <h3 className="font-title text-lg font-medium text-text">
                {item.headline}
              </h3>
              <p className="gpp-reading-copy mt-2 text-text-muted sm:mt-3">
                {item.body}
              </p>
              {/* No rule above it. The grid already draws a line between every
                  card, and stacked one column wide that put a second hairline a
                  few lines above the first: the page read as a stack of rules
                  with copy trapped between them. Space does the same separating
                  work here without adding a mark. */}
              <p className="mt-4 text-right max-sm:mt-4 sm:mt-auto sm:pt-2">
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
          );
        })}
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
          // `whitespace-nowrap`: it is one phrase and a single link, and
          // letting it break left "How each session is" on one line and
          // "scored" alone on the next, which reads as two links.
          className="gpp-touch-target font-semibold whitespace-nowrap text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
        >
          How each session is scored
        </Link>
      </p>
    </section>
  );
}
