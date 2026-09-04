import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { TabSwitch } from '@/components/TabSwitch';

import type { ChartRound, ChartSeries } from './charts/series';
import {
  GAP_CHART_ROW,
  PLOT_HEIGHT,
  type GapChartMode,
} from './charts/chartLayout';

const GapChart = lazy(() =>
  import('./charts/standingsCharts').then((module) => ({
    default: module.GapChart,
  })),
);
const ProgressionChart = lazy(() =>
  import('./charts/standingsCharts').then((module) => ({
    default: module.ProgressionChart,
  })),
);
const BumpChart = lazy(() =>
  import('./charts/standingsCharts').then((module) => ({
    default: module.BumpChart,
  })),
);

/**
 * Loads the charts once they are close to the viewport.
 *
 * They sit below two full tables that already carry every number, so nobody is
 * waiting on them: the chart code should not be in the way of the page
 * rendering, and on a visit that never scrolls that far it is never fetched.
 */
function useNearViewport() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, near };
}

/** Holds the chart's height from the first paint, so nothing moves later. */
function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  return <div style={{ minHeight: height }}>{children}</div>;
}

function ChartPlaceholder({ height = 300 }: { height?: number }) {
  return (
    <div style={{ minHeight: height }}>
      <div
        aria-hidden
        style={{ height }}
        className="w-full rounded-lg border border-border/60 bg-surface-muted/30"
      />
      <noscript>
        <p className="mt-2 text-xs text-text-muted">
          The chart needs JavaScript. The same figures are in the table below.
        </p>
      </noscript>
    </div>
  );
}

function ChartBlock({
  id,
  title,
  description,
  height,
  controls,
  chart,
  fallback,
  hidden,
}: {
  id: string;
  title: string;
  description: string;
  /** Reserved height for the chart, held before it loads. */
  height: number;
  /** A control that belongs to this chart, shown beside its heading. */
  controls?: ReactNode;
  chart: ReactNode;
  fallback: ReactNode;
  /**
   * Off-tab blocks stay in the document rather than being dropped: their
   * headings and their table of the same figures are what a crawler, and a
   * reader with no JavaScript, get instead of the chart.
   */
  hidden: boolean;
}) {
  return (
    <section aria-labelledby={id} hidden={hidden}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={id} className="text-base font-semibold text-text">
            {title}
          </h3>
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        </div>
        {controls}
      </div>
      <ChartFrame height={height}>{chart}</ChartFrame>
      {fallback}
    </section>
  );
}

/**
 * The same numbers as a chart, in a table.
 *
 * Server-rendered inside a collapsed disclosure rather than built on demand:
 * closed `<details>` content is still in the document, so the progression a
 * chart draws is readable with JavaScript off and indexable by a crawler that
 * never runs it.
 */
function RoundMatrixTable({
  caption,
  rounds,
  series,
  value,
}: {
  caption: string;
  rounds: readonly ChartRound[];
  series: readonly ChartSeries[];
  value: (entry: ChartSeries, round: ChartRound) => string | number | undefined;
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-accent underline-offset-2 hover:underline">
        View as table
      </summary>
      <div
        role="region"
        aria-label={caption}
        tabIndex={0}
        className="mt-2 overflow-x-auto rounded-lg border border-border"
      >
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-muted/50 text-left text-text-muted">
              <th scope="col" className="px-2 py-2">
                Round
              </th>
              {series.map((entry) => (
                <th
                  key={entry.key}
                  scope="col"
                  className="px-2 py-2 text-right"
                >
                  {entry.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rounds.map((round) => (
              <tr key={round.round} className="border-t border-border/70">
                <th scope="row" className="px-2 py-1.5 text-left font-normal">
                  {round.round}. {round.name}
                  {round.hasSprint ? ' (sprint)' : ''}
                </th>
                {series.map((entry) => (
                  <td
                    key={entry.key}
                    className="gpp-mono px-2 py-1.5 text-right text-text-muted"
                  >
                    {value(entry, round) ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Which chart the reader is looking at. */
type ChartTab = 'gap' | 'progression' | 'positions';

export type ChartSummaries = {
  gap: string;
  progression: string;
  bump: string;
};

/**
 * The charts under one championship table.
 *
 * `unit` names what a row is, so the copy reads as Formula 1 rather than as a
 * chart library: a driver's gap is to the driver ahead, a team's to the team
 * ahead.
 */
export function StandingsChartsSection({
  idPrefix,
  unit,
  gapSeries,
  lineSeries,
  bumpSeries,
  rounds,
  summaries,
}: {
  idPrefix: string;
  unit: string;
  gapSeries: readonly ChartSeries[];
  lineSeries: readonly ChartSeries[];
  bumpSeries: readonly ChartSeries[];
  rounds: readonly ChartRound[];
  summaries: ChartSummaries;
}) {
  const { ref, near } = useNearViewport();
  const [tab, setTab] = useState<ChartTab>('gap');
  // Owned here rather than inside the chart so its control can sit in the
  // chart's heading row: two stacked rows of tabs read as a settings panel.
  const [gapMode, setGapMode] = useState<GapChartMode>('points');
  const tabsId = `${idPrefix}-charts`;
  const panelId = `${tabsId}-panel`;

  return (
    <div ref={ref} className="mt-8 border-t border-border pt-6">
      <TabSwitch
        id={tabsId}
        value={tab}
        onChange={setTab}
        panelId={panelId}
        ariaLabel={`Charts for the ${unit}s' table`}
        options={[
          { value: 'gap', label: 'Gap' },
          { value: 'progression', label: 'Progression' },
          { value: 'positions', label: 'Positions' },
        ]}
      />

      {/* One panel holding all three blocks, with the two off-tab ones hidden.
          Three panels would mean three ids for one `aria-controls`, and
          unmounting them would take the chart data out of the document that a
          crawler reads. */}
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${tabsId}-${tab}`}
        className="mt-5"
      >
        <ChartBlock
          hidden={tab !== 'gap'}
          height={gapSeries.length * GAP_CHART_ROW}
          id={`${idPrefix}-gap-chart`}
          title="Championship gap"
          description={`Points scored, or the gap to the leader, for every ${unit} in the table.`}
          controls={
            <TabSwitch
              value={gapMode}
              onChange={setGapMode}
              ariaLabel="What the bars measure"
              options={[
                { value: 'points', label: 'Points' },
                { value: 'gap', label: 'Gap' },
              ]}
            />
          }
          chart={
            near && tab === 'gap' ? (
              <Suspense
                fallback={
                  <ChartPlaceholder height={gapSeries.length * GAP_CHART_ROW} />
                }
              >
                <GapChart
                  series={gapSeries}
                  summary={summaries.gap}
                  mode={gapMode}
                />
              </Suspense>
            ) : (
              <ChartPlaceholder height={gapSeries.length * GAP_CHART_ROW} />
            )
          }
          fallback={
            <p className="mt-2 text-xs text-text-muted">
              The same points and gaps are in the table above.
            </p>
          }
        />

        <ChartBlock
          hidden={tab !== 'progression'}
          height={PLOT_HEIGHT}
          id={`${idPrefix}-progression-chart`}
          title="Points progression"
          description="Championship points after every round. A dot on a round label marks a sprint weekend."
          chart={
            near && tab === 'progression' ? (
              <Suspense fallback={<ChartPlaceholder />}>
                <ProgressionChart
                  series={lineSeries}
                  rounds={rounds}
                  summary={summaries.progression}
                />
              </Suspense>
            ) : (
              <ChartPlaceholder />
            )
          }
          fallback={
            <RoundMatrixTable
              caption={`Championship points after each round, by ${unit}`}
              rounds={rounds}
              series={lineSeries}
              value={(entry, round) =>
                entry.rounds.find((row) => row.round === round.round)
                  ?.cumulative
              }
            />
          }
        />

        <ChartBlock
          hidden={tab !== 'positions'}
          height={PLOT_HEIGHT}
          id={`${idPrefix}-bump-chart`}
          title="Position by round"
          description={`Where every ${unit} stood in the championship after each round.`}
          chart={
            near && tab === 'positions' ? (
              <Suspense fallback={<ChartPlaceholder />}>
                <BumpChart
                  series={bumpSeries}
                  rounds={rounds}
                  summary={summaries.bump}
                />
              </Suspense>
            ) : (
              <ChartPlaceholder />
            )
          }
          fallback={
            <RoundMatrixTable
              caption={`Championship position after each round, by ${unit}`}
              rounds={rounds}
              series={bumpSeries}
              value={(entry, round) => {
                const row = entry.rounds.find(
                  (item) => item.round === round.round,
                );
                return row ? `P${row.position}` : undefined;
              }}
            />
          }
        />
      </div>
    </div>
  );
}
