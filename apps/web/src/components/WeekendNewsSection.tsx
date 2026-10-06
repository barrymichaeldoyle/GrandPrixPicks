import { ChevronDown, ExternalLink } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import { RaceWriteupStoreCard } from '@/components/race-writeups/RaceWriteupStoreLink';

import { ScoringPolicyNote } from '@/components/ScoringPolicyNote';
import { newsListMentionsGridPenalty } from '@/lib/newsGridPenalty';
import {
  StartingGridTable,
  type StartingGridEntry,
} from '@/components/StartingGridTable';
import {
  WriteUpNewsPhoto,
  type WriteUpNewsPhotoProps,
} from '@/components/WriteUpNewsPhoto';
import { formatUtcDate, utcDateAttribute } from '@/lib/date';
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
  /**
   * When the source published the story, which is not when we published the
   * card. Optional: items published before the field existed do not have one,
   * and a source with no date is left blank rather than guessed at.
   */
  sourcePublishedAt?: number;
  drivers?: NewsDriver[];
  startingGrid?: StartingGridEntry[];
  // The component's own props, not a copy of them: these are forwarded whole
  // with a spread, so a field added to the photo and to the Convex validator
  // must not be silently dropped here with no type error.
  writeUpImage?: WriteUpNewsPhotoProps;
};

/**
 * The weekend's news, read from `raceNews` rather than written into the
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
/** Namespaced, so a news key can never collide with another id on the page. */
function cardId(key: string) {
  return `news-${key}`;
}

/**
 * How many cards show before the rest fold away.
 *
 * A live weekend collects fifteen or more items, and stacked one column wide
 * on a phone that was several screens of cards between the hero and the
 * article. Readers stopped there: the median write-up visit scrolled about 60%
 * of the page. Six is three rows of the two-column grid, and the newest six
 * are the ones a returning reader has not seen.
 */
const LEAD_ITEMS = 6;

export function WeekendNewsSection({
  items,
  storePage,
  heading = 'Weekend news',
  showStoreCard = true,
}: {
  items: NewsItem[];
  heading?: string;
  showStoreCard?: boolean;
  /** The race's slug, for race merch in the store card. */
  storePage?: string;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const foldRef = useRef<HTMLDetailsElement>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  // Cards a phone reader has opened. One column wide, a card is its headline,
  // source and date until tapped; the body and photo are in the HTML for a
  // crawler and from `sm` up are simply shown. Four full stories with a photo
  // were three screens between the hero and the article, and most phone
  // readers stopped in them.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  function toggleExpanded(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) {
        next.add(key);
      }
      return next;
    });
  }

  // A `#news-...` link has to land on its card, and the browser cannot be left
  // to do it alone:
  //
  // - A folded card has to have its fold opened, or the link lands on a closed
  //   disclosure. Some browsers do this on their own; this makes it all of them.
  // - The landing page's headlines arrive by client navigation, which is
  //   `pushState`, and `pushState` never updates `:target`. The card was
  //   reached but not marked, in a two-column grid of near-identical cards, so
  //   the mark is state here rather than left to the selector.
  // - Content above the news (the hero's schedule and weather, photos) settles
  //   after the jump and pushes the card back down the page. Following the
  //   layout until it stops, or until the reader scrolls, keeps the card where
  //   the link put it.
  useEffect(() => {
    let stopFollowing: (() => void) | undefined;
    function goToHash() {
      stopFollowing?.();
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id.startsWith('news-')
        ? document.getElementById(id)
        : null;
      if (!target || !sectionRef.current?.contains(target)) {
        setTargetId(null);
        return;
      }
      const fold = foldRef.current;
      if (fold?.contains(target)) {
        fold.open = true;
      }
      setTargetId(id);
      target.scrollIntoView();
      stopFollowing = followLayoutUntilSettled(target);
    }
    goToHash();
    window.addEventListener('hashchange', goToHash);
    return () => {
      stopFollowing?.();
      window.removeEventListener('hashchange', goToHash);
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  // The grid's rows link to the cards beside them, which this section already
  // holds: nothing is fetched and nothing is copied, so correcting a penalty
  // story corrects the caption on the grid with it. A key with no card left
  // (retracted after the grid went out) resolves to nothing and the note falls
  // back to plain text, rather than to a link that goes nowhere.
  const byKey = new Map(items.map((item) => [item.key, item]));
  function newsLink(newsKey: string) {
    const target = byKey.get(newsKey);
    return target
      ? { href: `#${cardId(target.key)}`, headline: target.headline }
      : undefined;
  }

  // A grid, and every card a grid row links to, always stays out of the fold:
  // the grid is what somebody searched for, and a link into a closed
  // disclosure lands the reader on nothing.
  const linkedFromGrid = new Set(
    items.flatMap(
      (item) => item.startingGrid?.flatMap((row) => row.newsKey ?? []) ?? [],
    ),
  );
  const lead = items.filter(
    (item, index) =>
      index < LEAD_ITEMS ||
      Boolean(item.startingGrid?.length) ||
      linkedFromGrid.has(item.key),
  );
  const earlier = items.filter((item) => !lead.includes(item));

  return (
    <section
      ref={sectionRef}
      className="py-8 sm:py-16"
      aria-labelledby="weekend-news"
    >
      <div className="max-w-3xl">
        <h2
          id="weekend-news"
          className="font-title text-2xl font-medium text-text sm:text-3xl"
        >
          {heading}
        </h2>
      </div>

      {/* The store card closes the lead grid rather than the fold, so it is
          seen without opening anything, after the stories a reader came for.
          Only here: the earlier stories are a second grid of the same news. */}
      <NewsCards
        items={lead}
        newsLink={newsLink}
        targetId={targetId}
        expanded={expanded}
        onToggle={toggleExpanded}
        className="mt-7"
        trailing={
          showStoreCard
            ? (wide, leanClassName) => (
                <RaceWriteupStoreCard
                  wide={wide}
                  storePage={storePage}
                  leanClassName={leanClassName}
                />
              )
            : undefined
        }
      />

      {/* Native `<details>`, like the FAQ: the folded cards are still in the
          server HTML for a crawler, and in-page search opens it. */}
      {earlier.length > 0 ? (
        <details ref={foldRef} className="group mt-4">
          <summary className="gpp-touch-target inline-flex cursor-pointer list-none items-center gap-2 rounded-sm text-sm font-semibold text-text underline decoration-border-strong underline-offset-4 marker:content-none hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            {earlier.length} earlier{' '}
            {earlier.length === 1 ? 'story' : 'stories'}
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <NewsCards
            items={earlier}
            newsLink={newsLink}
            targetId={targetId}
            expanded={expanded}
            onToggle={toggleExpanded}
            className="mt-4"
          />
        </details>
      ) : null}

      {newsListMentionsGridPenalty(items) ? (
        <ScoringPolicyNote className="mt-5 text-sm text-text-muted" />
      ) : null}
    </section>
  );
}

/** Long enough for the hero and photos above to settle on a slow phone. */
const FOLLOW_LAYOUT_MS = 2500;

/**
 * Keeps `target` at the top of the viewport while the page above it is still
 * changing height, and lets go the moment the reader takes over.
 *
 * Instant rather than smooth: the first jump has already animated, and these
 * are corrections of a few hundred pixels that should read as the card staying
 * put, not as the page moving again.
 */
function followLayoutUntilSettled(target: HTMLElement): () => void {
  if (typeof ResizeObserver === 'undefined') {
    return () => {};
  }
  // `observe` reports the current size once straight away. That is not a
  // change, and answering it would cut the first, smooth scroll short.
  let initial = true;
  const observer = new ResizeObserver(() => {
    if (initial) {
      initial = false;
      return;
    }
    target.scrollIntoView({ behavior: 'instant' });
  });
  observer.observe(document.body);

  const intents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  const timer = window.setTimeout(stop, FOLLOW_LAYOUT_MS);
  function stop() {
    observer.disconnect();
    window.clearTimeout(timer);
    for (const type of intents) {
      window.removeEventListener(type, stop);
    }
  }
  for (const type of intents) {
    window.addEventListener(type, stop, { passive: true });
  }
  return stop;
}

const LEAN_THIN_TOP =
  'sm:[--lean-top:var(--stripe-lean)] sm:[--lean-bottom:0px]';
const LEAN_THICK_TOP =
  'sm:[--lean-top:0px] sm:[--lean-bottom:var(--stripe-lean)]';

/**
 * The bar direction for each card in the two-column grid, as classes.
 *
 * Browsers place cards row by row, skipping cells a spanning card already
 * holds, and a bar sits on its card's left edge. So the card "above" is the
 * previous card whose left edge is in the same column, and a card that takes
 * both columns belongs to the left one. Each card is the inverse of that
 * card, so bars meet thick to thick and thin to thin.
 */
function twoColumnLeans(cells: { cols: number; rows: number }[]): string[] {
  const taken = new Set<string>();
  const stackSize = [0, 0];
  let row = 0;
  let col = 0;

  return cells.map(({ cols, rows }) => {
    function fits(r: number, c: number) {
      return (
        c + cols <= 2 &&
        Array.from({ length: rows * cols }, (_, i) => [
          r + Math.floor(i / cols),
          c + (i % cols),
        ]).every(([rr, cc]) => !taken.has(`${rr}:${cc}`))
      );
    }

    while (!fits(row, col)) {
      col += 1;
      if (col > 1) {
        col = 0;
        row += 1;
      }
    }
    for (let r = row; r < row + rows; r++) {
      for (let c = col; c < col + cols; c++) {
        taken.add(`${r}:${c}`);
      }
    }

    const lean = stackSize[col]++ % 2 === 0 ? LEAN_THIN_TOP : LEAN_THICK_TOP;
    col += cols;
    if (col > 1) {
      col = 0;
      row += 1;
    }
    return lean;
  });
}

function NewsCards({
  items,
  newsLink,
  targetId,
  expanded,
  onToggle,
  className,
  trailing,
}: {
  items: NewsItem[];
  newsLink: (newsKey: string) => { href: string; headline: string } | undefined;
  /** The card the URL's hash points at, marked as `:target` would mark it. */
  targetId: string | null;
  /** Cards whose body a phone reader has opened. */
  expanded: ReadonlySet<string>;
  onToggle: (key: string) => void;
  className: string;
  /**
   * One more card after the news. `wide` asks it to take both columns, when
   * one cell would leave the last row half empty and no photo card can span
   * to fill it.
   */
  trailing?: (wide: boolean, leanClassName: string) => ReactNode;
}) {
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
    trailing ? 1 : 0,
  );
  const spanningKey =
    items.length >= 3 && cells % 2 === 1
      ? items.find((item) => item.writeUpImage && !item.startingGrid?.length)
          ?.key
      : undefined;
  const trailingWide = cells % 2 === 1 && spanningKey === undefined;

  const leans = twoColumnLeans([
    ...items.map((item) => ({
      cols: item.startingGrid?.length ? 2 : 1,
      rows: item.key === spanningKey ? 2 : 1,
    })),
    ...(trailing ? [{ cols: trailingWide ? 2 : 1, rows: 1 }] : []),
  ]);

  return (
    // `gpp-lean-run` flips each card's bar against the one above it for the
    // one-column fold. From `sm` up each card carries its own lean
    // (`twoColumnLeans`), because a card that spans cells moves the card
    // above it and no nth-child pattern can follow that.
    <div
      className={`gpp-lean-run grid gap-px overflow-hidden rounded-sm bg-border sm:grid-cols-2 ${className}`}
    >
      {items.map((item, index) => {
        // The card's own colour, from the driver it is about, exactly as the
        // same item carries it in the feed (`RaceNewsItem`) and as the
        // tribute section below carries Ferrari's. A run of news then reads
        // as a Ferrari story then a Williams one, rather than as three grey
        // blocks a reader has to parse to tell apart.
        //
        // First driver, not all of them: an item about two team mates is one
        // team's story, and the badges already name both.
        const team = item.drivers?.[0]?.team ?? null;
        const teamColour = (team && TEAM_COLORS[team]) || 'var(--accent)';
        // A grid card never folds (see the note on the table below), and the
        // card a shared link points at opens, or the link lands on a headline.
        const collapsible =
          !item.startingGrid?.length && targetId !== cardId(item.key);
        const isOpen = expanded.has(item.key);

        return (
          // A column so the source row can be pushed to the bottom: the
          // bodies differ in length, and without it each card's rule and
          // attribution sit at a different height across the grid.
          <article
            key={item.key}
            // The anchor a grid row jumps to. `styles.css` gives an
            // `article[id]` its scroll offset under the sticky header, and the
            // outline marks which card answered the question: landing
            // mid-page in a two-column grid of near-identical cards, the
            // reader otherwise has to work out which one moved. `target:`
            // covers the server HTML; `data-hash-target` covers a client
            // navigation, which `:target` never sees.
            id={cardId(item.key)}
            data-hash-target={targetId === cardId(item.key) ? '' : undefined}
            className={`flex flex-col bg-surface p-4 target:outline-2 target:outline-offset-[-2px] target:outline-accent data-hash-target:outline-2 data-hash-target:outline-offset-[-2px] data-hash-target:outline-accent sm:p-6 ${
              item.startingGrid?.length
                ? // Both columns. Eleven rows beside eleven only fits if the
                  // card is the full width of the section.
                  'sm:col-span-2'
                : item.key === spanningKey
                  ? 'sm:row-span-2'
                  : ''
            } ${leans[index]} ${
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
            {/* One column wide the headline is the toggle. It is rendered
                twice, a button under `sm` and plain text from it, because
                `aria-expanded` on a button that no longer toggles anything
                would tell a desktop screen reader the open story is closed.
                Only one is displayed, so only one is read. */}
            <h3 className="font-title text-lg font-medium text-text">
              {collapsible ? (
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => onToggle(item.key)}
                  className="flex w-full items-start justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
                >
                  {item.headline}
                  <ChevronDown
                    className={`mt-1.5 size-4 shrink-0 text-text-muted transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
              ) : null}
              <span className={collapsible ? 'max-sm:hidden' : undefined}>
                {item.headline}
              </span>
            </h3>
            <div className={collapsible && !isOpen ? 'max-sm:hidden' : ''}>
              {item.writeUpImage ? (
                <WriteUpNewsPhoto {...item.writeUpImage} />
              ) : null}
              <p className="gpp-reading-copy mt-2 text-text-muted sm:mt-3">
                {item.body}
              </p>
              {/* Every place, never a disclosure: this is a public page, the
                  grid is what somebody searched for, and a crawler does not
                  press buttons. Two columns because eleven rows beside eleven
                  is a grid a reader can take in at once, where twenty-two in
                  a line is a scroll. */}
              {item.startingGrid && item.startingGrid.length > 0 ? (
                <StartingGridTable
                  entries={item.startingGrid}
                  columns={2}
                  newsLink={newsLink}
                />
              ) : null}
            </div>
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
              {/* When the story broke, not when we published the card. This
                  page is read weeks after the weekend, and "Antonelli takes a
                  penalty" means something different on Wednesday than it does
                  an hour before the race. `<time>` rather than a bare string
                  so the date a reader sees is the one a crawler parses. */}
              {item.sourcePublishedAt ? (
                <time
                  dateTime={utcDateAttribute(item.sourcePublishedAt)}
                  className="ml-1.5 text-sm whitespace-nowrap text-text-muted"
                >
                  · {formatUtcDate(item.sourcePublishedAt)}
                </time>
              ) : null}
            </p>
          </article>
        );
      })}
      {trailing?.(trailingWide, leans[items.length] ?? '')}
    </div>
  );
}
