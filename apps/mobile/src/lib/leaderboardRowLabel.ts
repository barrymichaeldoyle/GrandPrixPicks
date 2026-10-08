/** 1 → "1st", 12 → "12th", 22 → "22nd". */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * What VoiceOver reads for a leaderboard row.
 *
 * Built from the children it read "1st, OK, Overcut King, 26, pts": the
 * avatar's initials, and "pts" spelled out. The place, the name, whether it
 * is you, and the points as a word are what the row says to a sighted reader.
 */
export function leaderboardRowLabel(entry: {
  rank: number;
  name: string;
  points: number;
  isViewer?: boolean;
  subline?: string | null;
}): string {
  return [
    ordinal(entry.rank),
    entry.isViewer ? `${entry.name}, you` : entry.name,
    // "12/20 correct" is read as "12 slash 20".
    entry.subline ? entry.subline.replace(/(\d+)\/(\d+)/, '$1 of $2') : null,
    `${entry.points} ${entry.points === 1 ? 'point' : 'points'}`,
  ]
    .filter(Boolean)
    .join(', ');
}
