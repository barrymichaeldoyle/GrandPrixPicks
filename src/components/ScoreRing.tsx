const VIEWBOX = 36;
const CENTER = VIEWBOX / 2;
const RADIUS = 16;
const STROKE_WIDTH = 3;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({
  earned,
  max,
  size = 48,
  className = '',
  emptyLabel = '—',
}: {
  earned: number;
  max: number;
  size?: number;
  className?: string;
  /** Label when no scores yet (e.g. "TBD" for upcoming events). */
  emptyLabel?: string;
}) {
  const hasScores = max > 0 && earned >= 0;
  const fraction = hasScores ? Math.min(earned / max, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - fraction);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={className}
      aria-label={hasScores ? `${earned} of ${max} points` : 'Score to be determined'}
    >
      {/* Track circle */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        fill="none"
        stroke="currentColor"
        className="text-border"
        strokeWidth={STROKE_WIDTH}
        {...(!hasScores && {
          strokeDasharray: '2 4',
        })}
      />
      {/* Foreground arc */}
      {hasScores && (
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          className="text-accent transition-[stroke-dashoffset] duration-700 ease-out"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
      )}
      {/* Center text */}
      <text
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        className={`text-[10px] font-bold ${hasScores ? 'fill-accent' : 'fill-text-muted'}`}
      >
        {hasScores ? earned : emptyLabel}
      </text>
    </svg>
  );
}
