/**
 * Share-text builders used by both web (X intent) and mobile (native share
 * sheet).
 *
 * Copy conventions: the `@GrandPrixPicks` handle on every share type, with a
 * distinct emoji per type so a timeline of them does not look automated.
 *
 * **No hashtags.** These used to end with `#F1` plus the race's own tag. X
 * de-emphasised hashtags years ago: they do not help reach, and three of them
 * under every post reads as noise. The handle stays because it is a real
 * mention that sends a reader to the account, which is the thing the tags were
 * failing to do. Instagram is the opposite case and keeps a full tag set, but
 * nothing here builds Instagram copy — these are X and the native sheet.
 *
 * `races.hashtag` is still stored and seeded. It costs nothing to keep and is
 * the kind of field that is annoying to reconstruct if this is ever revisited.
 */

/** Converts an ISO alpha-2 country code to its Unicode flag emoji. */
export function countryCodeToFlagEmoji(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return '';
  }

  return String.fromCodePoint(
    ...[...normalized].map((character) => character.charCodeAt(0) + 127397),
  );
}

export function buildScoreShareText({
  raceName,
  points,
  isFinal,
  accountHandle,
}: {
  raceName: string;
  points: number;
  /** True once every weekend session is scored (final tally vs. running total). */
  isFinal: boolean;
  accountHandle: string;
}) {
  return isFinal
    ? `I scored ${points} points at the ${raceName} 🏆\n\nThink you can beat me next round on ${accountHandle}?`
    : `${points} points so far at the ${raceName} 📈\n\nFollow the results on ${accountHandle}.`;
}

/** `P1 🇬🇧 NOR\nP2 ...`: one driver per line with its flag, in pick order. */
export function formatPositionList(
  drivers: readonly { code: string; nationality?: string | null }[],
) {
  return drivers
    .map((driver, index) => {
      const flag = countryCodeToFlagEmoji(driver.nationality);
      return `P${index + 1} ${flag ? `${flag} ` : ''}${driver.code}`;
    })
    .join('\n');
}

/**
 * A Top 5 as a message for a group chat or the native share sheet, where the
 * link that follows it does the work an X handle does on X. No handle: in a
 * WhatsApp group it is noise, and the people the site's players actually talk
 * to are there, not on X. The challenge line is the ask.
 */
export function buildPicksMessageText({
  raceName,
  sessionLabel,
  picks,
}: {
  raceName: string;
  sessionLabel: string;
  picks: readonly { code: string; nationality?: string | null }[];
}) {
  return `My ${sessionLabel} top 5 for the ${raceName} 🎯\n\n${formatPositionList(
    picks,
  )}\n\nThink you can beat me? Make yours here:`;
}
