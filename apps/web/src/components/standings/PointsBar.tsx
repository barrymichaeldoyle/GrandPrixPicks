/**
 * The points column's inline bar.
 *
 * The whole point of the redesign: a column of numbers makes a reader do the
 * subtraction, while a bar shows the size of a championship lead at a glance.
 * It is drawn from the leader's total, so the top row is always full and every
 * other row is read against it.
 *
 * Decorative by design. The number it sits under is the fact, and the Gap
 * column states the same distance in points, so there is nothing here for a
 * screen reader to announce.
 */
export function PointsBar({
  points,
  leaderPoints,
  color,
}: {
  points: number;
  leaderPoints: number;
  color: string;
}) {
  const share = leaderPoints > 0 ? Math.max(points / leaderPoints, 0) : 0;
  return (
    <span
      aria-hidden
      className="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${(share * 100).toFixed(1)}%`,
          backgroundColor: color,
        }}
      />
    </span>
  );
}
