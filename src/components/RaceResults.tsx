import { Tooltip } from './Tooltip';

const SCORING_LEGEND = [
  {
    dot: 'bg-success',
    label: 'Exact',
    labelFull: 'Exact position',
    pts: 5,
    title: 'Your pick finished exactly where you predicted',
  },
  {
    dot: 'bg-warning',
    label: '±1',
    labelFull: '±1 position',
    pts: 3,
    title: 'Your pick was off by one position',
  },
  {
    dot: 'bg-text-muted',
    label: 'Top 5',
    labelFull: 'Top 5',
    pts: 1,
    title: 'Your pick finished in the top 5, off by 2+ positions',
  },
];

export function ScoringLegend({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 sm:gap-2 ${className}`}
    >
      {SCORING_LEGEND.map(({ dot, label, labelFull, pts, title }) => (
        <Tooltip key={pts} content={title}>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent-muted/50 px-2 py-0.5 text-xs text-text-muted sm:gap-1.5 sm:px-3 sm:py-1">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${dot}`}
              aria-hidden
            />
            <span className="hidden sm:inline">{labelFull}</span>
            <span className="sm:hidden">{label}</span>
            <span className="font-semibold text-text">{pts}</span>
          </span>
        </Tooltip>
      ))}
    </div>
  );
}
