import { v } from 'convex/values';

/**
 * The confirmed starting grid, attached to the news item that announces it.
 *
 * It rides on `raceNews` rather than getting a table of its own because it is
 * news in the strict sense this project uses: it changes a race pick, it has a
 * source, it is published once and corrected in place, and a wrong one has to
 * come off the feed before lights out. All of that already exists on a news
 * record, and a second table would have been a second copy of every one of
 * those behaviours.
 *
 * Stored as codes and positions only. Who drives for whom is round-scoped, so
 * a stored name or team would be a second copy of a moving fact; the resolved
 * shape below is built at read time for the write-up and frozen into the feed
 * event, exactly as `driverCodes` and `newsDrivers` already are.
 */
export const raceNewsStartingGridEntryValidator = v.object({
  /** Grid slot, 1-based. Contiguous from 1 across the array. */
  position: v.number(),
  /** Three-letter roster code, validated at publish. */
  code: v.string(),
  /**
   * Why this driver is not where qualifying left them, e.g. `3-place penalty`.
   * Short: it renders as a caption beside the name, not as a sentence.
   */
  note: v.optional(v.string()),
  /**
   * The news item that explains the note, by `key`, e.g. a penalty item or the
   * car problem that ruined a qualifying lap.
   *
   * Stated, never inferred from the driver. Matching on the code would be
   * ambiguous the moment a driver has more than one story in a weekend:
   * Antonelli had three at Monza, and the first one found would have captioned
   * his grid slot with the tow he was giving Russell.
   *
   * Only the key is stored. The reader's copy is resolved from the item itself
   * at render, so correcting a penalty story fixes the grid caption with it.
   * Freezing the text here would be the same fact in two places, and this
   * weekend proved it: the grid went out on Saturday evening and Lawson's
   * story changed on Sunday morning.
   */
  newsKey: v.optional(v.string()),
});

export const raceNewsStartingGridValidator = v.array(
  raceNewsStartingGridEntryValidator,
);

/** A grid entry with the roster read applied, for rendering. */
export const resolvedStartingGridEntryValidator = v.object({
  position: v.number(),
  code: v.string(),
  displayName: v.string(),
  team: v.union(v.string(), v.null()),
  /**
   * The car number, for the driver badge's tooltip.
   *
   * Optional because the grids frozen into feed events before it was resolved
   * do not carry one, and those events are never rewritten. A row without it
   * still renders; it just shows the code alone in the tooltip's number block.
   */
  number: v.optional(v.union(v.number(), v.null())),
  note: v.optional(v.string()),
  newsKey: v.optional(v.string()),
});

export const resolvedStartingGridValidator = v.array(
  resolvedStartingGridEntryValidator,
);

export type StartingGridEntry = {
  position: number;
  code: string;
  note?: string;
  newsKey?: string;
};

export type ResolvedStartingGridEntry = {
  position: number;
  code: string;
  displayName: string;
  team: string | null;
  note?: string;
  newsKey?: string;
};

/** Well above a full field, and still a bound on what a single read can carry. */
const MAX_GRID_ENTRIES = 30;

/** The longest a note can be before it stops being a caption. */
const MAX_NOTE_LENGTH = 60;

/**
 * Everything `publish` refuses about a grid, as one pure function.
 *
 * Returns the message to throw, or null when the grid is publishable. A partial
 * grid is the failure worth catching hardest: a page that renders 21 of 22 rows
 * looks completely fine, and the missing row is somebody's pick.
 */
export function validateStartingGrid(
  entries: StartingGridEntry[],
): string | null {
  if (entries.length === 0) {
    return (
      'startingGrid must have at least one entry. Omit the field entirely ' +
      'for a news item that is not about the grid.'
    );
  }

  if (entries.length > MAX_GRID_ENTRIES) {
    return `startingGrid has ${entries.length} entries, more than the ${MAX_GRID_ENTRIES} a field can hold.`;
  }

  const positions = entries.map((entry) => entry.position);
  const expected = entries.map((_, index) => index + 1);
  const sorted = [...positions].sort((a, b) => a - b);
  if (sorted.some((position, index) => position !== expected[index])) {
    return (
      `startingGrid positions must run 1 to ${entries.length} with no gaps ` +
      `and no repeats. Got: ${sorted.join(', ')}.`
    );
  }

  const codes = entries.map((entry) => entry.code.toUpperCase());
  const duplicates = codes.filter(
    (code, index) => codes.indexOf(code) !== index,
  );
  if (duplicates.length > 0) {
    return `startingGrid lists ${[...new Set(duplicates)].join(', ')} more than once.`;
  }

  const longNote = entries.find(
    (entry) => (entry.note?.length ?? 0) > MAX_NOTE_LENGTH,
  );
  if (longNote) {
    return (
      `The note on P${longNote.position} is longer than ${MAX_NOTE_LENGTH} characters. ` +
      'A note is a caption beside a name, so keep it to the reason, e.g. "3-place penalty".'
    );
  }

  const linkWithoutNote = entries.find(
    (entry) => entry.newsKey !== undefined && !entry.note,
  );
  if (linkWithoutNote) {
    return (
      `P${linkWithoutNote.position} has a newsKey but no note. The note is what ` +
      'the reader clicks, so give the row its reason too, e.g. ' +
      '"Rear axle problem".'
    );
  }

  return null;
}

/** The grid in starting order, whatever order it was published in. */
export function sortStartingGrid<T extends { position: number }>(
  entries: T[],
): T[] {
  return [...entries].sort((a, b) => a.position - b.position);
}
