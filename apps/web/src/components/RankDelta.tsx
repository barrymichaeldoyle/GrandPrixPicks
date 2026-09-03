import { Minus, Triangle } from 'lucide-react';

/**
 * Position change since the last scored race.
 *
 * `null` means the player has no previous standing to compare against, which is
 * a different statement from "did not move" and reads as NEW rather than a zero.
 *
 * Lives here rather than beside the landing page's timing tower, which is where
 * it started: the dashboard's race recap shows the same signed delta for the
 * viewer's own season position, and pulling it out of `-home` keeps the landing
 * chunk out of the signed-in bundle.
 */
export function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="gpp-label text-text-muted" title="New to the table">
        New
      </span>
    );
  }

  // `role="img"` is what lets these carry an aria-label at all: a bare <span>
  // has no role, and ARIA prohibits naming a roleless generic element — screen
  // readers were free to drop the label and announce a triangle glyph instead.
  if (delta === 0) {
    return (
      <span
        role="img"
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
      role="img"
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
