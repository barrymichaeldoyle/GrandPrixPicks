import { displayTeamName } from '@/lib/display';

import { Flag } from './Flag';
import { Tooltip } from './Tooltip';

// F1 2026 team colors (matched to live time page)
export const TEAM_COLORS: Record<string, string> = {
  Mercedes: '#00D7B6',
  McLaren: '#F47600',
  Ferrari: '#ED1131',
  'Red Bull Racing': '#4781D7',
  Williams: '#1868DB',
  Alpine: '#00A1E8',
  Audi: '#F50537',
  'Racing Bulls': '#6C98FF',
  Haas: '#9C9FA2',
  'Aston Martin': '#229971',
  Cadillac: '#909090',
};

const BADGE_SIZES = {
  sm: 'h-6 min-w-9 px-1.5 text-[10px]',
  md: 'h-8 min-w-11 px-2.5 text-xs',
} as const;

interface DriverBadgeProps {
  /** Driver 3-letter code (e.g., "VER", "HAM") */
  code: string;
  /** Team name for color lookup */
  team?: string | null;
  /** Driver's full display name */
  displayName?: string | null;
  /** Driver's racing number */
  number?: number | null;
  /** Driver's nationality (ISO 3166-1 alpha-2 code, e.g., "NL", "GB") */
  nationality?: string | null;
  /** Badge size variant */
  size?: 'sm' | 'md';
  /** Show driver number before code */
  showNumber?: boolean;
}

/**
 * A team-colored badge showing a driver's 3-letter code.
 * Used in results tables to visually match picks with actual results.
 */

export function DriverBadge({
  code,
  team,
  displayName,
  number,
  nationality,
  size = 'md',
  showNumber = false,
}: DriverBadgeProps) {
  const color = team ? (TEAM_COLORS[team] ?? '#666') : '#666';
  const hasTooltip = displayName || number != null || team || nationality;

  const tooltipContent = hasTooltip ? (
    <div className="relative w-max max-w-[min(100vw-2rem,28rem)] rounded-xl border border-border bg-surface shadow-lg">
      {/* Driver Profile Card */}
      <div className="flex items-stretch">
        {/* Number block with team color */}
        <div
          className="flex w-14 shrink-0 flex-col items-center justify-center rounded-l-xl py-2"
          style={{ backgroundColor: color }}
        >
          {number != null && (
          <span className="font-title text-xl font-bold tracking-tight text-white">
              {number}
            </span>
          )}
          <span className="font-title text-[10px] font-bold tracking-[0.16em] text-white/80 uppercase">
            {code}
          </span>
        </div>

        {/* Driver info */}
        <div className="flex flex-col justify-center gap-1 px-3 py-2">
          <div className="flex items-center gap-2">
            {nationality && <Flag code={nationality} size="sm" />}
            {displayName && (
              <span className="font-semibold whitespace-nowrap text-text">
                {displayName}
              </span>
            )}
          </div>
          {team && (
            <span className="text-xs text-text-muted">
              {displayTeamName(team)}
            </span>
          )}
        </div>
      </div>
      <span
        className="absolute top-full left-1/2 -mt-0.25 -translate-x-1/2 border-4 border-transparent border-t-surface"
        aria-hidden
      />
    </div>
  ) : null;

  const classes = [
    'inline-grid place-items-center rounded-md font-mono font-bold tracking-wider text-white uppercase shadow-sm',
    BADGE_SIZES[size],
    showNumber && number != null ? 'gap-1' : '',
    team === 'Cadillac' ? 'dark:ring-1 dark:ring-white/20' : '',
    hasTooltip ? 'cursor-help' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badge = (
    <span className={classes} style={{ backgroundColor: color }}>
      <span className="inline-flex min-h-[18px] items-center justify-center gap-1 rounded-lg bg-black/30 px-1 py-0.5 leading-none">
        {showNumber && number != null && (
          <span className="font-normal tabular-nums leading-none opacity-70">
            {number}
          </span>
        )}
        <span className="leading-none">{code}</span>
      </span>
    </span>
  );

  if (hasTooltip && tooltipContent) {
    return (
      <Tooltip content={tooltipContent} prerender={!!nationality}>
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

/**
 * Skeleton matching DriverBadge dimensions for loading states.
 * Use in tables so layout doesn't shift when driver data loads.
 */
export function DriverBadgeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const classes = [
    'inline-flex animate-pulse items-center justify-center rounded-md bg-surface-muted',
    size === 'sm' ? 'h-6 min-w-9' : 'h-8 min-w-11',
  ].join(' ');

  return <span className={classes} aria-hidden />;
}

/** Wraps a DriverBadge with a scoring indicator ring and opacity. */
export function ScoredDriverBadge({
  pickPoints,
  ...driverProps
}: DriverBadgeProps & { pickPoints?: number }) {
  let ringClass = '';
  let opacityClass = '';

  if (pickPoints !== undefined) {
    if (pickPoints === 5) {
      ringClass = 'ring-2 ring-success';
    } else if (pickPoints === 3) {
      ringClass = 'ring-2 ring-warning';
    } else if (pickPoints === 1) {
      ringClass = 'ring-2 ring-text-muted/40';
    } else {
      ringClass = 'ring-2 ring-error/40';
      opacityClass = 'opacity-50';
    }
  }

  return (
    <span
      className={['relative inline-flex rounded-md', ringClass, opacityClass]
        .filter(Boolean)
        .join(' ')}
    >
      <DriverBadge {...driverProps} />
      {pickPoints !== undefined && pickPoints >= 3 && (
        <span
          className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-surface ${
            pickPoints === 5 ? 'bg-success' : 'bg-warning'
          }`}
        />
      )}
    </span>
  );
}
