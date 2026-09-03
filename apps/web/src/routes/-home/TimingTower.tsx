/**
 * The landing page's one visual motif: a broadcast timing tower.
 *
 * What survives of it is the primitive the competition section still uses: a
 * points cell. Everything else on the page is plain type on the page colour.
 * The signed rank delta moved to `@/components/RankDelta`, which the dashboard
 * recap shares.
 */

/**
 * A points figure with its unit. Mono and tabular so the column lines up, with
 * the unit dropped back so the number is what the eye lands on.
 */
export function PointsCell({
  points,
  className = '',
}: {
  points: number;
  className?: string;
}) {
  return (
    <span className={`gpp-mono text-sm font-semibold text-text ${className}`}>
      {points.toLocaleString()}
      <span className="gpp-label ml-1 font-medium">pts</span>
    </span>
  );
}
