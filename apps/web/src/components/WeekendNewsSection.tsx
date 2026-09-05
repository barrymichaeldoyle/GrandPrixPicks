import { ExternalLink } from 'lucide-react';
import type { CSSProperties } from 'react';

import { ScoringPolicyNote } from '@/components/ScoringPolicyNote';
import {
  StartingGridTable,
  type StartingGridEntry,
} from '@/components/StartingGridTable';
import {
  WriteUpNewsPhoto,
  type WriteUpNewsPhotoProps,
} from '@/components/WriteUpNewsPhoto';
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
  startingGrid?: StartingGridEntry[];
  // The component's own props, not a copy of them: these are forwarded whole
  // with a spread, so a field added to the photo and to the Convex validator
  // must not be silently dropped here with no type error.
  writeUpImage?: WriteUpNewsPhotoProps;
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

  // A photo makes its card roughly 200px taller than a text-only one, and the
  // source row is pinned to the bottom, so the card beside it ends up with that
  // much dead space between its last line and its attribution. An odd number of
  // items also leaves the last cell of the grid empty. Both holes are the same
  // hole: let the tall card span two rows and the text cards stack beside it.
  //
  // Only for an odd count, because that is when the spare cell exists. At an
  // even count the grid is already full and spanning would open a new hole one
  // row down.
  //
  // A grid card takes both columns, so it is two of those cells rather than
  // one: counting cards instead of cells here would read the parity backwards
  // on any weekend that publishes a grid, and open the hole it exists to close.
  const cells = items.reduce(
    (total, item) => total + (item.startingGrid?.length ? 2 : 1),
    0,
  );
  const spanningKey =
    items.length >= 3 && cells % 2 === 1
      ? items.find((item) => item.writeUpImage && !item.startingGrid?.length)
          ?.key
      : undefined;

  return (
    <section className="py-8 sm:py-16" aria-labelledby="weekend-news">
      <div className="max-w-3xl">
        <h2
          id="weekend-news"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          What changed this weekend
        </h2>
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
                item.startingGrid?.length
                  ? // Both columns. Eleven rows beside eleven only fits if the
                    // card is the full width of the section.
                    'sm:col-span-2'
                  : item.key === spanningKey
                    ? 'sm:row-span-2'
                    : ''
              } ${
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
              {item.writeUpImage ? (
                <WriteUpNewsPhoto {...item.writeUpImage} />
              ) : null}
              <p className="gpp-reading-copy mt-2 text-text-muted sm:mt-3">
                {item.body}
              </p>
              {/* Every place, never a disclosure: this is a public page, the
                  grid is what somebody searched for, and a crawler does not
                  press buttons. Two columns because eleven rows beside eleven
                  is a grid a reader can take in at once, where twenty-two in a
                  line is a scroll. */}
              {item.startingGrid && item.startingGrid.length > 0 ? (
                <StartingGridTable entries={item.startingGrid} columns={2} />
              ) : null}
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

      <ScoringPolicyNote className="mt-5 text-sm text-text-muted" />
    </section>
  );
}
