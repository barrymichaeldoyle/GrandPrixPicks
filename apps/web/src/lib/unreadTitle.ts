/**
 * The unread count as a `document.title` prefix: `(3) Grand Prix Picks`.
 *
 * The title is the part of the tab that survives being narrow. A 16px icon dot
 * says "something happened" and nothing more, and disappears entirely in a tab
 * search list or a bookmark; the title carries the number and stays readable
 * wherever the browser writes the tab's name.
 */

/** Matches a prefix this module wrote, and deliberately nothing else. */
const PREFIX_PATTERN = /^\(\d{1,3}\+?\)\s+/;

/** The prefix for a given unread count, or `''` when there is nothing to say. */
export function unreadTitlePrefix(count: number, hasMore: boolean): string {
  if (hasMore) {
    return '(99+) ';
  }
  return count > 0 ? `(${count}) ` : '';
}

/**
 * The title without our prefix.
 *
 * Every write goes through this first, so a count that changes twice between
 * renders cannot leave `(1) (2) Grand Prix Picks` behind.
 */
export function stripUnreadTitlePrefix(title: string): string {
  return title.replace(PREFIX_PATTERN, '');
}
