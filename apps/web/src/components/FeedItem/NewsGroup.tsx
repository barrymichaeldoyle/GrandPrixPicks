import { Link } from '@tanstack/react-router';

import { Flag } from '@/components/Flag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

import { FeedItem } from './FeedItem';
import type { FeedEvent } from './types';

/**
 * A run of consecutive weekend-news cards, presented as one block.
 *
 * Two news items in a row each carried a "Weekend news" eyebrow, a REVISIT row
 * and the same link to the scoring policy. Repeated, those stop being labels
 * and become texture: the eye reads a wall rather than two distinct stories.
 *
 * So the things that belong to the run are hoisted here and said once, and the
 * cards keep only what actually differs between them. The scoring line sits at
 * the bottom rather than the top because it explains the chips above it, and
 * because a policy link is not what should greet a reader arriving at news.
 *
 * Grouping is by adjacency, not by race. Session groups can key on race and
 * session because every score for a session belongs together wherever it lands,
 * but news is chronological and the feed's order carries meaning: pulling a
 * Friday item up beside a Sunday one to sit under a shared heading would
 * reorder the weekend.
 */
export function NewsGroup({ events }: { events: FeedEvent[] }) {
  if (events.length === 0) {
    return null;
  }

  const raceName = events.find((event) => event.raceName)?.raceName;
  // Same flag the session cards fly, from the same slug. The race name alone is
  // a line of small mono text at the far end of a header row; the flag is what
  // makes the block identifiably Monza's before it is read.
  const raceSlug = events.find((event) => event.raceSlug)?.raceSlug;
  const countryCode = raceSlug
    ? getCountryCodeForRace({ slug: raceSlug })
    : null;

  return (
    <section
      className="overflow-hidden rounded-sm border border-border/80 bg-surface"
      aria-label={raceName ? `Weekend news, ${raceName}` : 'Weekend news'}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/80 px-2.5 py-2">
        <p className="text-xs font-semibold tracking-label text-accent uppercase">
          Weekend news
        </p>
        {raceName ? (
          <p className="flex items-center gap-1.5">
            {countryCode ? <Flag code={countryCode} size="xs" /> : null}
            <span className="gpp-mono text-[11px] text-text-muted">
              {raceName}
            </span>
          </p>
        ) : null}
      </div>

      {/* `gpp-lean-run` flips each card's team bar against the one above it, so
          the wedges meet thick to thick across the divider and read as one
          shape carried down the block. No padding on these rows: the bar is
          drawn on the card inside, and it only lines up with its neighbours if
          it runs the full height of the row. The card supplies the padding. */}
      <div className="gpp-lean-run">
        {events.map((event, index) => (
          <div
            key={event._id}
            className={index === 0 ? undefined : 'border-t border-border/60'}
          >
            <FeedItem event={event} grouped />
          </div>
        ))}
      </div>

      {/* Once for the block. It explains what the chips above are scored
          against, which is the half readers get wrong about a grid penalty,
          and it does not change from one item to the next. */}
      <p className="border-t border-border/80 px-2.5 py-2 text-xs text-text-muted">
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
