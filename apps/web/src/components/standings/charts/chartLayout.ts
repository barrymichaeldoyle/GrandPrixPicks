/**
 * The few numbers both sides of the chart boundary need.
 *
 * The section reserves a chart's height before the chart itself is fetched, so
 * it has to know how tall each one will be. Keeping these here rather than in
 * `standingsCharts.tsx` is what keeps that module lazy: a value imported from
 * it would pull the whole chart bundle into the page's first payload.
 */

/** Height of the plotted charts (progression, bump), in pixels. */
export const PLOT_HEIGHT = 300;

/** One gap-chart row, in pixels, including the gap under it. */
export const GAP_CHART_ROW = 30;

/** Bar length on the gap chart: points scored, or points behind the leader. */
export type GapChartMode = 'points' | 'gap';
