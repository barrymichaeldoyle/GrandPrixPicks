/**
 * Share-text builders used by both web (X intent) and mobile (native share
 * sheet). Copy conventions: same hashtags and @GrandPrixPicks handle across
 * every share type, with a distinct emoji per type.
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

/** `#F1` plus the race-specific hashtag (e.g. `#MonacoGP`), space-joined. */
export function formatRaceHashtags(raceHashtag?: string) {
  return ['#F1', raceHashtag].filter(Boolean).join(' ');
}

export function buildScoreShareText({
  raceName,
  points,
  isFinal,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  points: number;
  /** True once every weekend session is scored (final tally vs. running total). */
  isFinal: boolean;
  accountHandle: string;
  raceHashtag?: string;
}) {
  const hashtags = formatRaceHashtags(raceHashtag);
  return isFinal
    ? `I scored ${points} points at the ${raceName} 🏆\n\nThink you can beat me next round on ${accountHandle}?\n\n${hashtags}`
    : `${points} points so far at the ${raceName} 📈\n\nFollow the results on ${accountHandle}.\n\n${hashtags}`;
}
