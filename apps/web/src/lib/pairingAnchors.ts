/**
 * Stable, citable anchors for team-mate head-to-head pairings.
 *
 * The headings on `/f1-team-mate-battles` used to be keyed by `matchupId`, so
 * the only way to link to one duel was `#team-jd7f2k9…` — an opaque Convex id
 * nobody would paste into a forum post. A duel record is the most quotable
 * thing on the site ("Verstappen leads Hadjar 24-6"), so it is worth being
 * addressable: `#verstappen-hadjar` is a link someone will actually use.
 *
 * Lives here rather than in the route so the durability rules below can be
 * tested without mounting the page.
 */

/**
 * The last word of a driver's name, reduced to something safe in a URL
 * fragment. "Nico Hülkenberg" becomes "hulkenberg".
 */
export function surnameSlug(displayName: string): string {
  const surname = displayName.trim().split(/\s+/).at(-1) ?? displayName;
  return (
    surname
      .normalize('NFD')
      .replaceAll(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/^-|-$/g, '') || 'pairing'
  );
}

type AnchorPairing = {
  matchupId: string;
  fromRound?: number | null;
  drivers: readonly { displayName: string }[];
};

/**
 * Maps each pairing's `matchupId` to the anchor its heading should carry.
 *
 * Two details make these durable enough to be worth citing:
 *
 * - **Alphabetical, not standings order.** The page sorts `drivers` by who is
 *   ahead, so an anchor built in that order would rename itself the moment the
 *   duel flipped, breaking every link already made to it.
 * - **Deduplicated.** A team that changes line-up mid-season has two pairings,
 *   and the same two drivers could in principle be paired over two separate
 *   round spans. The second gets its `fromRound` appended rather than silently
 *   duplicating an id.
 */
export function pairingAnchorIds(
  teams: readonly AnchorPairing[],
): Map<string, string> {
  const seen = new Set<string>();
  const ids = new Map<string, string>();
  for (const team of teams) {
    const base = team.drivers
      .map((driver) => surnameSlug(driver.displayName))
      .sort()
      .join('-');
    const id =
      seen.has(base) && team.fromRound != null
        ? `${base}-r${team.fromRound}`
        : base;
    seen.add(base);
    ids.set(team.matchupId, id);
  }
  return ids;
}

/**
 * Every spelling of a pairing anchor that should land on the same heading,
 * mapped to the canonical id.
 *
 * The canonical anchor is alphabetical so it survives the duel flipping, but
 * nobody quoting a record thinks alphabetically: "Verstappen leads Hadjar"
 * becomes `#verstappen-hadjar`, which is the one order the page does not use.
 * Rather than let half of the hand-written links be dead, both orders resolve.
 *
 * Built as a lookup rather than by splitting the fragment on "-", because a
 * hyphenated surname would make that parse ambiguous — "perez-lawson-lindblad"
 * has no single correct split, and guessing wrong sends a reader to the wrong
 * duel rather than to none.
 *
 * Canonical ids are registered first and never overwritten, so an alias can
 * only ever fill a gap. That matters when a team runs the same two drivers over
 * two round spans: the bare spelling keeps pointing at the first pairing, and
 * the second stays reachable through its `-r<round>` form.
 */
export function pairingAnchorAliases(
  teams: readonly AnchorPairing[],
): Map<string, string> {
  const canonical = pairingAnchorIds(teams);
  const aliases = new Map<string, string>();

  for (const id of canonical.values()) {
    aliases.set(id, id);
  }

  for (const team of teams) {
    const id = canonical.get(team.matchupId);
    if (id === undefined) {
      continue;
    }
    const slugs = team.drivers.map((driver) => surnameSlug(driver.displayName));
    const orders = [slugs.join('-'), [...slugs].reverse().join('-')];
    for (const order of orders) {
      const spellings =
        team.fromRound == null
          ? [order]
          : [order, `${order}-r${team.fromRound}`];
      for (const spelling of spellings) {
        if (!aliases.has(spelling)) {
          aliases.set(spelling, id);
        }
      }
    }
  }

  return aliases;
}
