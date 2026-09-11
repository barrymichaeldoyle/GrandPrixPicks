/** Short display names for teams (e.g. "Red Bull Racing" → "Red Bull"). */
const TEAM_DISPLAY_NAMES: Record<string, string> = {
  'Red Bull Racing': 'Red Bull',
};

/**
 * Returns the team name to show in the UI. Use for all user-facing team labels.
 * Color lookups and data should still use the full team name.
 */
export function displayTeamName(team: string | null | undefined): string {
  if (team == null || team === '') {
    return '';
  }
  return TEAM_DISPLAY_NAMES[team] ?? team;
}

/** "Spanish Grand Prix" → "Spanish GP"; for compact race labels. */
export function abbreviateGrandPrix(name: string): string {
  return name.replace(/\bGrand Prix\b/g, 'GP');
}

/**
 * OpenF1 prints family names in capitals ("Kimi ANTONELLI"). Sentence-case
 * chrome has to undo that, or the one name in a heading shouts.
 */
export function formatTimingSheetName(name: string): string {
  return name.replace(/\S+/g, (word) => {
    const letters = word.replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 2 || letters !== letters.toUpperCase()) {
      return word;
    }
    return word
      .split(/(['’-])/)
      .map((part) =>
        part.length === 0
          ? part
          : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
      )
      .join('');
  });
}

/**
 * Round span for a pairing that is not the team's only one this season.
 * Open-ended rows are "from this round onwards"; a single-round stint is rare
 * but still a span of one.
 */
export function pairingRoundSpanLabel(
  fromRound: number,
  toRound?: number,
): string {
  if (toRound == null) {
    return fromRound <= 1 ? 'All season' : `Round ${fromRound} onwards`;
  }
  if (fromRound === toRound) {
    return `Round ${fromRound}`;
  }
  return `Rounds ${fromRound}–${toRound}`;
}
