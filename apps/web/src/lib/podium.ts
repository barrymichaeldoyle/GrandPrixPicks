/**
 * Which colour a podium rank wears, decided once.
 *
 * The landing board and the leaderboard rows are the same visual idea (a
 * marker around the rank number) and had drifted apart: the landing board
 * filled the box with the podium colour while the leaderboard tinted it at
 * 15%, so first place looked different depending on which board you read.
 * Both now take the fill from here. A shared rank shares the colour.
 *
 * The class strings are written out in full rather than composed from a hue
 * name, because Tailwind scans source text: an interpolated `bg-${hue}` would
 * never be generated.
 */

type PodiumRank = 1 | 2 | 3;

const PODIUM_CLASSES: Record<PodiumRank, string> = {
  1: 'border-podium-gold bg-podium-gold text-text-on-accent',
  2: 'border-podium-silver bg-podium-silver text-text-on-accent',
  3: 'border-podium-bronze bg-podium-bronze text-text-on-accent',
};

function isPodiumRank(rank: number | null): rank is PodiumRank {
  return rank === 1 || rank === 2 || rank === 3;
}

/** Border + background + text classes for a rank, or null when off the podium. */
export function podiumClasses(rank: number | null): string | null {
  return isPodiumRank(rank) ? PODIUM_CLASSES[rank] : null;
}
