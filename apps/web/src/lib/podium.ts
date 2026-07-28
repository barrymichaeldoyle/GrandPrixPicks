/**
 * Which colour a podium rank wears, decided once.
 *
 * The leaderboard rows and the feed's rank medals are the same visual idea (a
 * tinted marker around the number) but each had picked its own hues: rank 1 was
 * `amber-400` in one and `warning` in the other, rank 2 `slate-300` vs
 * `text-muted`. They now share the `podium*` tokens.
 *
 * The class strings are written out in full rather than composed from a hue
 * name, because Tailwind scans source text: an interpolated `bg-${hue}/15`
 * would never be generated.
 */

type PodiumRank = 1 | 2 | 3;

const PODIUM_CLASSES: Record<PodiumRank, string> = {
  1: 'border-podium-gold/40 bg-podium-gold/15 text-podium-gold',
  2: 'border-podium-silver/40 bg-podium-silver/15 text-podium-silver',
  3: 'border-podium-bronze/40 bg-podium-bronze/15 text-podium-bronze',
};

function isPodiumRank(rank: number | null): rank is PodiumRank {
  return rank === 1 || rank === 2 || rank === 3;
}

/** Border + background + text classes for a rank, or null when off the podium. */
export function podiumClasses(rank: number | null): string | null {
  return isPodiumRank(rank) ? PODIUM_CLASSES[rank] : null;
}
