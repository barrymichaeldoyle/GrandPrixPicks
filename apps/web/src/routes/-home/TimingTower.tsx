import { Minus, Triangle } from 'lucide-react';

/**
 * The landing page's one visual motif: a broadcast timing tower.
 *
 * Two primitives make it work everywhere it appears (picker slots, the live
 * leaderboard strip, the league standings mock): a boxed position label, and a
 * signed delta. Everything else on the page is plain type on the page colour.
 */

/**
 * Boxed position label, "P1" through "P5".
 *
 * The box is a hairline, not a fill. A filled box per row would put five
 * competing blocks of colour down the strip; the tower on a broadcast is legible
 * because only the leader's box is inverted, so that is the only case that is.
 */
export function PositionBox({
  position,
  leader = false,
  className = '',
}: {
  position: number;
  leader?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`gpp-mono inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold ${
        leader
          ? 'border-accent bg-accent text-text-on-accent'
          : 'border-border text-text-muted'
      } ${className}`}
    >
      P{position}
    </span>
  );
}

/**
 * Position change since the last scored race.
 *
 * `null` means the player has no previous standing to compare against, which is
 * a different statement from "did not move" and reads as NEW rather than a zero.
 */
export function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="gpp-label text-text-muted" title="New to the table">
        New
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span
        className="inline-flex items-center text-delta-flat"
        aria-label="No change in position"
      >
        <Minus size={12} aria-hidden="true" />
      </span>
    );
  }

  const up = delta > 0;
  return (
    <span
      className={`gpp-mono inline-flex items-center gap-0.5 text-xs font-medium ${
        up ? 'text-delta-up' : 'text-delta-down'
      }`}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} ${
        Math.abs(delta) === 1 ? 'place' : 'places'
      }`}
    >
      <Triangle
        size={9}
        fill="currentColor"
        strokeWidth={0}
        className={up ? undefined : 'rotate-180'}
        aria-hidden="true"
      />
      <span aria-hidden="true">{Math.abs(delta)}</span>
    </span>
  );
}

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
