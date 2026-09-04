import { useEffect, useRef, useState } from 'react';

import { PLOT_HEIGHT, type GapChartMode } from './chartLayout';
import type { ChartRound, ChartSeries } from './series';

/**
 * The standings charts: a gap chart, a points progression and a bump chart.
 *
 * Hand-drawn SVG rather than a charting library, which is what keeps the
 * charts inside the page's JavaScript budget: three charts of this shape cost
 * a few kilobytes here against tens of kilobytes for a general-purpose
 * renderer, and nothing in them needs a general-purpose renderer.
 *
 * This module is only ever reached through a dynamic import, once the charts
 * scroll into view. Everything a reader needs without JavaScript (the tables,
 * and the same numbers in a disclosure under each chart) is server-rendered by
 * `StandingsChartsSection` and does not import this file.
 *
 * No transitions or animated draws anywhere, so `prefers-reduced-motion` has
 * nothing to suppress.
 */

const CHART_HEIGHT = PLOT_HEIGHT;
const PAD = { top: 14, right: 16, bottom: 28, left: 38 };

/** Measures the container so text is drawn at real pixels, not scaled SVG. */
function useChartWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) {
        setWidth(Math.max(260, Math.round(measured)));
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/**
 * The round the tooltip is reading, moved by pointer or by the arrow keys.
 *
 * Keyboard access to a chart means being able to reach the values, not just
 * the picture: left and right step a round, Home and End jump to the ends, and
 * the readout under the chart is a live region so every step is announced.
 */
function useRoundCursor(count: number) {
  const [index, setIndex] = useState<number | null>(null);

  function onKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    if (count === 0) {
      return;
    }
    const current = index ?? count - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight') {
      next = Math.min(current + 1, count - 1);
    } else if (event.key === 'ArrowLeft') {
      next = Math.max(current - 1, 0);
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = count - 1;
    } else if (event.key === 'Escape') {
      setIndex(null);
      return;
    } else {
      return;
    }
    event.preventDefault();
    setIndex(next);
  }

  return { index, setIndex, onKeyDown };
}

function useHidden() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  function toggle(key: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }
  return { hidden, toggle };
}

function Legend({
  series,
  hidden,
  onToggle,
}: {
  series: readonly ChartSeries[];
  hidden: ReadonlySet<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
      {series.map((entry) => {
        const shown = !hidden.has(entry.key);
        return (
          <li key={entry.key}>
            <button
              type="button"
              aria-pressed={shown}
              onClick={() => onToggle(entry.key)}
              className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                shown ? 'text-text' : 'text-text-muted line-through'
              }`}
            >
              {/* The marker the chart draws for this entrant: filled for a
                  team's first car, hollow for its second, so team-mates are
                  told apart without reading the colour. */}
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full border-2"
                style={{
                  borderColor: shown ? entry.color : 'currentColor',
                  backgroundColor: entry.dashed
                    ? 'transparent'
                    : shown
                      ? entry.color
                      : 'currentColor',
                }}
              />
              {entry.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Readout({ children }: { children: string }) {
  return (
    <p
      aria-live="polite"
      className="mt-2 min-h-[2.5rem] text-xs text-text-muted"
    >
      {children}
    </p>
  );
}

const KEYBOARD_HINT =
  'Arrow keys step through the rounds. Escape clears the reading.';

function visibleSeries(
  series: readonly ChartSeries[],
  hidden: ReadonlySet<string>,
): ChartSeries[] {
  return series.filter((entry) => !hidden.has(entry.key));
}

/**
 * Chart A: the championship as bar lengths, either points scored or points
 * behind the leader. The one chart that states the size of a lead without a
 * reader having to compare two numbers.
 */
export function GapChart({
  series,
  summary,
  mode,
}: {
  series: readonly ChartSeries[];
  summary: string;
  /** Bar length: points scored, or points behind the leader. */
  mode: GapChartMode;
}) {
  const leaderPoints = series[0]?.points ?? 0;
  const maxGap = Math.max(
    ...series.map((entry) => leaderPoints - entry.points),
    1,
  );

  return (
    <div>
      {/* A plain container, not a list: `role="img"` on a <ul> strips the
          list role its children need, and the bars are one picture anyway. */}
      <div role="img" aria-label={summary} className="mt-3 space-y-1.5">
        {series.map((entry) => {
          const gap = leaderPoints - entry.points;
          const value = mode === 'points' ? entry.points : gap;
          const share =
            mode === 'points'
              ? leaderPoints > 0
                ? entry.points / leaderPoints
                : 0
              : gap / maxGap;
          return (
            <div
              key={entry.key}
              // A fixed row height, so the section can hold the chart's space
              // before it loads: `GAP_CHART_ROW` is this row plus its gap.
              className="grid h-6 grid-cols-[2.5rem_1fr_2.75rem] items-center gap-2 text-xs sm:grid-cols-[8rem_1fr_3rem]"
            >
              <span className="truncate text-text-muted">
                <span className="sm:hidden">{entry.shortLabel}</span>
                <span className="hidden sm:inline">{entry.label}</span>
              </span>
              {/* No track behind the bar: eleven grey rails the length of the
                  chart carry no information and are the loudest thing on it. */}
              <span className="block h-2 w-full">
                <span
                  className="block h-full rounded-xs"
                  style={{
                    width: `${Math.max(share * 100, value === 0 ? 0 : 1.5).toFixed(1)}%`,
                    backgroundColor: entry.color,
                  }}
                />
              </span>
              <span className="gpp-mono text-right text-text">
                {mode === 'gap' && gap === 0 ? '—' : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type PlotProps = {
  series: readonly ChartSeries[];
  rounds: readonly ChartRound[];
  summary: string;
};

/** Chart B: cumulative points, round by round. */
export function ProgressionChart({ series, rounds, summary }: PlotProps) {
  const { ref, width } = useChartWidth();
  const { hidden, toggle } = useHidden();
  const cursor = useRoundCursor(rounds.length);
  const shown = visibleSeries(series, hidden);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 40);
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const step = rounds.length > 1 ? plotWidth / (rounds.length - 1) : 0;
  const maxPoints = Math.max(
    ...shown.flatMap((entry) => entry.rounds.map((row) => row.cumulative)),
    1,
  );

  function x(index: number) {
    return PAD.left + index * step;
  }
  function y(points: number) {
    return PAD.top + (1 - points / maxPoints) * plotHeight;
  }

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((share) =>
    Math.round(share * maxPoints),
  );

  return (
    <div>
      <div ref={ref}>
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={cursor.onKeyDown}
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const offset = event.clientX - box.left - PAD.left;
            cursor.setIndex(
              Math.min(
                Math.max(step > 0 ? Math.round(offset / step) : 0, 0),
                rounds.length - 1,
              ),
            );
          }}
          onPointerLeave={() => cursor.setIndex(null)}
          className="touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotWidth}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                className="text-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(tick) + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                className="gpp-mono text-text-muted"
              >
                {tick}
              </text>
            </g>
          ))}

          <RoundAxis
            rounds={rounds}
            x={x}
            top={PAD.top}
            bottom={PAD.top + plotHeight}
            active={cursor.index}
          />

          {shown.map((entry) => {
            const byRound = new Map(
              entry.rounds.map((row) => [row.round, row.cumulative]),
            );
            const path = rounds
              .map((round, index) => {
                const value = byRound.get(round.round);
                return value === undefined
                  ? null
                  : `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`;
              })
              .filter((command): command is string => command !== null)
              .join(' ');
            return (
              <path
                key={entry.key}
                d={path}
                fill="none"
                stroke={entry.color}
                strokeWidth={2}
                strokeDasharray={entry.dashed ? '5 3' : undefined}
                strokeLinejoin="round"
              />
            );
          })}

          {cursor.index !== null &&
            shown.map((entry) => {
              const round = rounds[cursor.index as number];
              const value = entry.rounds.find(
                (row) => row.round === round.round,
              )?.cumulative;
              if (value === undefined) {
                return null;
              }
              return (
                <circle
                  key={entry.key}
                  cx={x(cursor.index as number)}
                  cy={y(value)}
                  r={3.5}
                  fill={entry.dashed ? 'var(--color-page)' : entry.color}
                  stroke={entry.color}
                  strokeWidth={2}
                />
              );
            })}
        </svg>
      </div>
      <Legend series={series} hidden={hidden} onToggle={toggle} />
      <Readout>
        {cursor.index === null
          ? KEYBOARD_HINT
          : progressionReadout(shown, rounds[cursor.index])}
      </Readout>
    </div>
  );
}

function progressionReadout(
  series: readonly ChartSeries[],
  round: ChartRound,
): string {
  const values = series
    .map((entry) => {
      const row = entry.rounds.find((item) => item.round === round.round);
      if (!row) {
        return null;
      }
      // A sprint weekend pays twice, so the weekend is stated as the two
      // results it was rather than as one number nobody can decompose.
      const weekend =
        row.sprintPoints > 0
          ? `${row.points - row.sprintPoints} in the race and ${row.sprintPoints} in the sprint`
          : `${row.points} this round`;
      return `${entry.label} ${row.cumulative} points, P${row.position}, ${weekend}`;
    })
    .filter((line): line is string => line !== null);
  const sprint = round.hasSprint ? ' (sprint weekend)' : '';
  return `Round ${round.round}, ${round.name}${sprint}: ${values.join('; ')}.`;
}

/** Chart C: championship position by round, with P1 at the top. */
export function BumpChart({ series, rounds, summary }: PlotProps) {
  const { ref, width } = useChartWidth();
  const { hidden, toggle } = useHidden();
  const cursor = useRoundCursor(rounds.length);
  const shown = visibleSeries(series, hidden);

  const plotWidth = Math.max(width - PAD.left - PAD.right, 40);
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const step = rounds.length > 1 ? plotWidth / (rounds.length - 1) : 0;
  const maxPosition = Math.max(
    ...series.flatMap((entry) => entry.rounds.map((row) => row.position)),
    2,
  );

  function x(index: number) {
    return PAD.left + index * step;
  }
  function y(position: number) {
    return PAD.top + ((position - 1) / (maxPosition - 1)) * plotHeight;
  }

  const ticks = [1, ...Array.from({ length: maxPosition }, (_, i) => i + 1)]
    .filter((position, index, all) => all.indexOf(position) === index)
    .filter(
      (position) =>
        position === 1 || position === maxPosition || position % 5 === 0,
    );

  return (
    <div>
      <div ref={ref}>
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={summary}
          tabIndex={0}
          onKeyDown={cursor.onKeyDown}
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const offset = event.clientX - box.left - PAD.left;
            cursor.setIndex(
              Math.min(
                Math.max(step > 0 ? Math.round(offset / step) : 0, 0),
                rounds.length - 1,
              ),
            );
          }}
          onPointerLeave={() => cursor.setIndex(null)}
          className="touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {ticks.map((position) => (
            <text
              key={position}
              x={PAD.left - 6}
              y={y(position) + 3}
              textAnchor="end"
              fontSize={10}
              fill="currentColor"
              className="gpp-mono text-text-muted"
            >
              P{position}
            </text>
          ))}

          <RoundAxis
            rounds={rounds}
            x={x}
            top={PAD.top}
            bottom={PAD.top + plotHeight}
            active={cursor.index}
          />

          {shown.map((entry) => {
            const path = rounds
              .map((round, index) => {
                const row = entry.rounds.find(
                  (item) => item.round === round.round,
                );
                return row
                  ? `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(row.position).toFixed(1)}`
                  : null;
              })
              .filter((command): command is string => command !== null)
              .join(' ');
            return (
              <g key={entry.key}>
                <path
                  d={path}
                  fill="none"
                  stroke={entry.color}
                  strokeWidth={2}
                  strokeDasharray={entry.dashed ? '5 3' : undefined}
                  strokeLinejoin="round"
                />
                {rounds.map((round, index) => {
                  const row = entry.rounds.find(
                    (item) => item.round === round.round,
                  );
                  return row ? (
                    <circle
                      key={round.round}
                      cx={x(index)}
                      cy={y(row.position)}
                      r={3}
                      fill={entry.dashed ? 'var(--color-page)' : entry.color}
                      stroke={entry.color}
                      strokeWidth={1.5}
                    />
                  ) : null;
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <Legend series={series} hidden={hidden} onToggle={toggle} />
      <Readout>
        {cursor.index === null
          ? KEYBOARD_HINT
          : bumpReadout(shown, rounds[cursor.index])}
      </Readout>
    </div>
  );
}

function bumpReadout(
  series: readonly ChartSeries[],
  round: ChartRound,
): string {
  const values = series
    .map((entry) => {
      const row = entry.rounds.find((item) => item.round === round.round);
      return row ? `${entry.label} P${row.position}` : null;
    })
    .filter((line): line is string => line !== null);
  const sprint = round.hasSprint ? ' (sprint weekend)' : '';
  return `Round ${round.round}, ${round.name}${sprint}: ${values.join('; ')}.`;
}

/**
 * The shared x-axis: a label per round, a dot under the sprint weekends, and a
 * guide line on whichever round is being read.
 */
function RoundAxis({
  rounds,
  x,
  top,
  bottom,
  active,
}: {
  rounds: readonly ChartRound[];
  x: (index: number) => number;
  top: number;
  bottom: number;
  active: number | null;
}) {
  // Thin the labels out rather than let them collide on a phone.
  const stride = Math.ceil(rounds.length / 12);
  return (
    <g>
      {active !== null && (
        <line
          x1={x(active)}
          x2={x(active)}
          y1={top}
          y2={bottom}
          stroke="currentColor"
          className="text-text-muted"
          strokeWidth={1}
        />
      )}
      {rounds.map((round, index) =>
        index % stride === 0 || index === rounds.length - 1 ? (
          <text
            key={round.round}
            x={x(index)}
            y={bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            className="gpp-mono text-text-muted"
          >
            {round.code}
            {round.hasSprint ? '•' : ''}
          </text>
        ) : null,
      )}
    </g>
  );
}
