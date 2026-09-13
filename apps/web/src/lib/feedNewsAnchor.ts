/**
 * Anchor id for a weekend-news card in the feed, so a grid row's note can jump
 * to the story that explains it. Namespaced against every other `[id]` on the
 * dashboard, the way the write-up page's own `cardId` is against its page.
 */
export function feedNewsAnchorId(newsKey: string): string {
  return `feed-news-${newsKey}`;
}

/**
 * Brings a grid row's linked news card into view and moves focus to its
 * source link, so a reader lands somewhere they can act on (open the
 * article) rather than just somewhere that scrolled. `preventScroll` on the
 * focus call, because `scrollIntoView` has already placed the card and a
 * second, focus-driven scroll would fight the smooth one still animating.
 *
 * A no-op if the card is not currently on the page: the grid link only
 * renders when `FeedContent` finds the key among loaded events, but the feed
 * can still re-render in between, and this is cheaper than threading a ref.
 */
export function scrollToFeedNews(newsKey: string): void {
  const card = document.getElementById(feedNewsAnchorId(newsKey));
  if (!card) {
    return;
  }
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card
    .querySelector<HTMLAnchorElement>('[data-feed-news-source]')
    ?.focus({ preventScroll: true });
}
