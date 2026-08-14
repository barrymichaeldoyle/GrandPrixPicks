import type { CSSProperties } from 'react';

import { displayTeamName } from '@/lib/display';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

import { Flag } from './Flag';
import { Tooltip } from './Tooltip';

export { FALLBACK_TEAM_COLOR, TEAM_COLORS };

// Left padding leaves room for the 3px team bar.
const BADGE_SIZES = {
  sm: 'h-6 min-w-9 pr-1.5 pl-2 text-xs',
  md: 'h-8 min-w-11 pr-2.5 pl-3 text-xs',
  lg: 'h-10 min-w-14 pr-3 pl-3.5 text-sm',
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
  size?: 'sm' | 'md' | 'lg';
  /** Show driver number before code */
  showNumber?: boolean;
  /**
   * Mount the tooltip immediately so its flag image is preloaded. Defaults to
   * on whenever a nationality is given, which is right for the handful of
   * badges on a picks or results card. Long lists (a full championship table)
   * should turn it off — otherwise every row preloads a flag nobody hovers.
   */
  prerenderTooltip?: boolean;
  /**
   * Whether the tooltip trigger takes keyboard focus. Off only inside an
   * `aria-hidden` region that an `sr-only` summary already covers — see the
   * note on Tooltip's own `focusable`.
   */
  tooltipFocusable?: boolean;
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
  prerenderTooltip,
  tooltipFocusable,
}: DriverBadgeProps) {
  const color = (team && TEAM_COLORS[team]) || FALLBACK_TEAM_COLOR;
  const hasTooltip = displayName || number != null || team || nationality;

  const tooltipContent = hasTooltip ? (
    <div
      className="gpp-team-bar relative w-max max-w-[min(100vw-2rem,28rem)] rounded-lg border border-border bg-surface"
      style={{ '--team-colour': color } as CSSProperties}
    >
      {/* Driver profile card. The team colour is the 3px bar on the left edge
          of this container — the number block it used to fill is now plain
          surface, with the number in mono like every other figure. */}
      <div className="flex items-stretch">
        <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border py-3 pl-1">
          {number != null && (
            <span className="gpp-mono text-lg leading-none font-medium text-text">
              {number}
            </span>
          )}
          <span className="gpp-mono text-xs leading-none tracking-label text-text-muted uppercase">
            {code}
          </span>
        </div>

        {/* Driver info */}
        <div className="flex flex-col justify-center gap-1 px-3 py-2">
          <div className="flex items-center gap-2">
            {nationality && <Flag code={nationality} size="sm" />}
            {displayName && (
              <span className="font-medium whitespace-nowrap text-text">
                {displayName}
              </span>
            )}
          </div>
          {team && (
            // 5px dot, the team colour's only other permitted form.
            <span className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="gpp-team-dot" aria-hidden />
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

  /*
   * Team colour is confined to a 3px left bar. It used to be the badge's
   * background with a black scrim over it, which is what made a grid of 22
   * drivers read as loud: eleven saturated fills competing at full area.
   * Confined to 3px, the same eleven colours stay legible and the page stays
   * calm — and the code itself can sit in `--text` at a proper contrast
   * ratio instead of white-on-whatever-the-team-is.
   */
  const classes = [
    'gpp-team-bar inline-grid place-items-center rounded-sm border border-border bg-surface-elevated font-medium tracking-data text-text uppercase',
    BADGE_SIZES[size],
    hasTooltip ? 'cursor-help' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badge = (
    <span
      className={classes}
      style={{ '--team-colour': color } as CSSProperties}
    >
      <span className="gpp-mono inline-flex items-center justify-center gap-1 leading-none">
        {showNumber && number != null && (
          <span className="leading-none font-normal text-text-muted">
            {number}
          </span>
        )}
        <span className="leading-none">{code}</span>
      </span>
    </span>
  );

  if (hasTooltip && tooltipContent) {
    return (
      <Tooltip
        content={tooltipContent}
        prerender={prerenderTooltip ?? !!nationality}
        focusable={tooltipFocusable}
      >
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
  hideDot = false,
  ...driverProps
}: DriverBadgeProps & { pickPoints?: number; hideDot?: boolean }) {
  /*
   * The four result semantics, straight from the scoring bands in
   * lib/scoring.ts. Fixed meanings across the whole app: violet is an exact
   * position, green is off by exactly one, amber is in the actual top five but
   * off by two or more, grey is no points.
   *
   * A miss is grey, never red — the only red in this system is a downward
   * position delta. The previous red ring made every wrong pick read as an
   * error state rather than as a result.
   */
  let ringClass = '';
  let opacityClass = '';

  if (pickPoints !== undefined) {
    if (pickPoints === 5) {
      ringClass = 'ring-1 ring-result-exact';
    } else if (pickPoints === 3) {
      ringClass = 'ring-1 ring-result-near';
    } else if (pickPoints === 1) {
      ringClass = 'ring-1 ring-result-top5';
    } else {
      ringClass = 'ring-1 ring-result-miss';
      opacityClass = 'opacity-60';
    }
  }

  return (
    <span
      className={['relative inline-flex rounded-sm', ringClass, opacityClass]
        .filter(Boolean)
        .join(' ')}
    >
      <DriverBadge {...driverProps} />
      {!hideDot && pickPoints !== undefined && pickPoints >= 3 && (
        <span
          className={`absolute -top-1 -right-1 h-2 w-2 rounded-full border border-page ${
            pickPoints === 5 ? 'bg-result-exact' : 'bg-result-near'
          }`}
        />
      )}
    </span>
  );
}
