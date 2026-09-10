/**
 * Two states of one control, so the difference between them is one place.
 *
 * `-outline-offset-2` because the group clips to its own radius: the global
 * focus ring sits 2px outside the button, which is 2px inside `overflow:
 * hidden`, so keyboard focus on the only control in this card was invisible.
 * Drawn inside the button instead.
 */
function toggleClass(active: boolean) {
  return `gpp-touch-target inline-flex min-h-9 items-center px-3 text-xs transition-colors focus-visible:-outline-offset-2 pointer-coarse:min-h-11 ${
    active
      ? 'bg-accent-muted font-medium text-accent'
      : 'text-text-muted hover:bg-surface-elevated hover:text-text'
  }`;
}

export type WeatherTimeToggleProps = {
  showViewerTime: boolean;
  onTimeViewChange: (viewerTime: boolean) => void;
};

export function WeatherTimeToggle({
  showViewerTime,
  onTimeViewChange,
}: WeatherTimeToggleProps) {
  return (
    <div
      className="flex shrink-0 items-center overflow-hidden rounded-sm border border-border"
      role="group"
      aria-label="Show session times in"
    >
      <button
        type="button"
        onClick={() => onTimeViewChange(false)}
        aria-pressed={!showViewerTime}
        className={toggleClass(!showViewerTime)}
      >
        Track time
      </button>
      <button
        type="button"
        onClick={() => onTimeViewChange(true)}
        aria-pressed={showViewerTime}
        className={`border-l border-border ${toggleClass(showViewerTime)}`}
      >
        My time
      </button>
    </div>
  );
}
