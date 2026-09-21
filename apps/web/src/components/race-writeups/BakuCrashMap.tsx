import { ChevronRight, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { Flag } from '@/components/Flag';
import {
  BAKU_CORNERS,
  BAKU_START_FINISH,
  BAKU_TRACK_SEGMENTS,
  BAKU_VIEW_BOX,
} from '@/lib/bakuCircuitGeometry';
import type { BakuCrash } from '@/lib/bakuCrashes';
import { BAKU_CRASHES } from '@/lib/bakuCrashes';

import type { BakuBreakdown, BakuFilter } from './bakuCrashMapModel';
import {
  BAKU_FILTERS,
  calloutCorners,
  countByFilter,
  countsByCorner,
  countsByDriver,
  driverCountry,
  driverName,
  driverSurname,
  driversLabel,
  filterCrashes,
  HEAT_STEPS,
  heatColor,
  heatStep,
  hitRadius,
  markerRadius,
  orderedForList,
  placeMarkers,
  rankedCorners,
  rankedDrivers,
  rowsBeforeTie,
  sessionLabel,
  unplacedCount,
} from './bakuCrashMapModel';

/**
 * Where the walls have taken cars at Baku, 2016 to 2025.
 *
 * Built for this one write-up and deliberately not generalised. There is no
 * shared `CrashMap` and no per-circuit route: twenty-three near-identical
 * circuit pages are what got the site rejected for low value content three
 * times, and a second one of these earns its abstraction only if it exists.
 *
 * **The section is built to a vertical budget.** By race week this page also
 * carries news, practice results, the weekend schedule and championship
 * context, so the archive cannot take a screen and a half on the way past. The
 * summary is the map beside its tally, a selected corner or driver lists its
 * incidents in place under them, and the full fifty-seven rows sit in a closed
 * `details`. An earlier version listed every
 * incident inline and ran to seven thousand pixels, which is a fine page and a
 * bad section.
 *
 * Everything still renders on the server, the rows inside the closed `details`
 * included: the filter and the selection narrow what is already in the HTML rather
 * than fetching, so a crawler and a reviewer see all fifty-seven incidents and
 * every citation on first paint. That is not a nicety here, since a `<Link>`
 * behind a client query once orphaned all eleven practice pages.
 *
 * Colour is never the only channel. The tally carries the same numbers as text
 * with a full-width target per row, which is also what lets the map's markers
 * stay small enough to sit in the castle section without colliding: every
 * corner is reachable from a row, so the markers qualify for WCAG 2.5.8's
 * equivalent-control exception.
 *
 * **It is circuit history, not form.** Nothing here is advice about who to
 * pick, and the copy must not drift that way: the cars and the regulations have
 * both changed underneath these numbers, and a driver who put it in the wall in
 * 2019 learned from it. The driver breakdown keeps everyone who has ever been
 * caught out here, retired or not, because Ricciardo's five and Raikkonen's
 * four are part of what makes the place what it is.
 */
export function BakuCrashMap() {
  const [filter, setFilter] = useState<BakuFilter>('all');
  const [breakdown, setBreakdown] = useState<BakuBreakdown>('corner');
  /*
   * What the reader has picked, from the map or the tally. It opens in place
   * under the map rather than in a modal: the modal covered the map the reader
   * had just clicked, so they lost sight of the corner and its neighbours at
   * the moment they wanted to compare them.
   */
  const [selected, setSelected] = useState<Selection | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const headingId = useId();
  const markerGroupRef = useRef<SVGGElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);

  // Plain derivations: the React Compiler memoizes these, and the whole
  // dataset is 57 rows, so there is nothing here worth a manual cache.
  const visible = filterCrashes(BAKU_CRASHES, filter);
  const counts = countsByCorner(visible);
  const max = Math.max(0, ...counts.values());
  const ranked = rankedCorners(counts);
  const rankedDriverRows = rankedDrivers(countsByDriver(visible));
  const unplaced = unplacedCount(visible);
  const callouts = calloutCorners(ranked);
  const placed = placeMarkers(
    BAKU_CORNERS.map((corner) => ({
      corner: corner.number,
      count: counts.get(corner.number) ?? 0,
      x: corner.x,
      y: corner.y,
      radius: markerRadius(counts.get(corner.number) ?? 0, max),
    })).filter((marker) => marker.count > 0),
  );
  const selectedCrashes =
    selected === null
      ? []
      : visible.filter((crash) =>
          selected.kind === 'corner'
            ? crash.corner === selected.corner
            : crash.drivers.includes(selected.driver),
        );
  /* The corners the selection touches, ringed on the map: one for a corner,
     every corner a driver was caught at for a driver. */
  const highlighted = new Set(
    selectedCrashes.flatMap((crash) =>
      crash.corner === null ? [] : [crash.corner],
    ),
  );

  function select(next: Selection) {
    const same =
      selected !== null &&
      selected.kind === next.kind &&
      (next.kind === 'corner'
        ? selected.kind === 'corner' && selected.corner === next.corner
        : selected.kind === 'driver' && selected.driver === next.driver);
    setSelected(same ? null : next);
    if (!same) {
      /* On a phone the list lands below the fold. `nearest` leaves it alone
         when it is already on screen, which it is beside a desktop map. */
      requestAnimationFrame(() =>
        selectionRef.current?.scrollIntoView({ block: 'nearest' }),
      );
    }
  }

  function applyFilter(next: BakuFilter) {
    setFilter(next);
    setShowAllRows(false);
    /*
     * A corner or driver the new filter empties must not stay selected over an
     * empty list.
     */
    const nextCrashes = filterCrashes(BAKU_CRASHES, next);
    if (
      selected !== null &&
      !(selected.kind === 'corner'
        ? countsByCorner(nextCrashes).has(selected.corner)
        : countsByDriver(nextCrashes).has(selected.driver))
    ) {
      setSelected(null);
    }
  }

  /*
   * One tab stop for the whole map. Twenty markers each taking a stop would
   * make skipping the figure cost twenty presses, so the group is entered once
   * and the arrow keys move between corners inside it.
   */
  function moveFocus(from: number, delta: number) {
    const order = ranked.map((entry) => entry.corner);
    const index = order.indexOf(from);
    if (index === -1) {
      return;
    }
    const next = order[(index + delta + order.length) % order.length];
    markerGroupRef.current
      ?.querySelector<SVGGElement>(`[data-corner="${next}"]`)
      ?.focus();
  }

  const rangeLabel = max <= 1 ? `${max} per corner` : `1 to ${max} per corner`;

  return (
    <section aria-labelledby={headingId} className="py-8 sm:py-16">
      <h2
        id={headingId}
        className="font-title text-2xl font-medium text-text sm:text-3xl"
      >
        Every notable crash at Baku since 2016
      </h2>
      <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
        Nine weekends, {BAKU_CRASHES.length} incidents that ended in a red flag,
        a retirement or a stewards' collision note, each placed at the corner
        where the car stopped. Turn 3 has taken the most, and it takes them in
        groups: three in the 2021 qualifying hour alone.
      </p>

      <div className="mt-6">
        <FilterBar filter={filter} onChange={applyFilter} />
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {visible.length}{' '}
        {visible.length === 1 ? 'incident' : 'incidents'},{' '}
        {BAKU_FILTERS.find((entry) => entry.value === filter)?.label}.
        {breakdown === 'corner'
          ? ranked.length === 0
            ? ' No corner has an incident in this filter.'
            : ` Busiest corners: ${ranked
                .slice(0, 3)
                .map((entry) => `Turn ${entry.corner}, ${entry.count}`)
                .join('; ')}.`
          : ` Most caught out: ${rankedDriverRows
              .slice(0, 3)
              .map((entry) => `${driverName(entry.driver)}, ${entry.count}`)
              .join('; ')}.`}
        {selected === null
          ? ''
          : ` Selected ${selectionTitle(selected)}: ${selectedCrashes.length} ${
              selectedCrashes.length === 1 ? 'incident' : 'incidents'
            }, listed below the map.`}
      </p>

      {/*
        Map and tally are one row on a wide screen. Stacked they were 800px of
        the section on their own; side by side they cost the height of the map,
        and the tally reads as the map's key rather than as a second module.
      */}
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <figure className="m-0">
          <svg
            viewBox={`0 0 ${BAKU_VIEW_BOX.width} ${BAKU_VIEW_BOX.height}`}
            width={BAKU_VIEW_BOX.width}
            height={BAKU_VIEW_BOX.height}
            className="h-auto w-full"
            /*
              A group, not an image. `role="img"` collapses the subtree into a
              single node, which would have left every marker button below in
              the tab order but unreachable to a screen reader: axe flags that
              as nested-interactive, and it is right to. The map is a set of
              controls, and the tally carries the text equivalent.
            */
            role="group"
            aria-label="Baku City Circuit, incidents by corner"
          >
            {/*
              The base outline first, so a corner with no incidents in the
              current filter still reads as track rather than as a gap. The
              segments between them are the whole lap, which is why there is no
              separate full-lap path to ship.
            */}
            {BAKU_TRACK_SEGMENTS.map((segment, index) => (
              <path
                key={`base-${segment.corner}-${index}`}
                d={segment.d}
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth={9}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {BAKU_TRACK_SEGMENTS.map((segment, index) => {
              const count = counts.get(segment.corner) ?? 0;
              if (count === 0) {
                return null;
              }
              return (
                <path
                  key={`heat-${segment.corner}-${index}`}
                  d={segment.d}
                  fill="none"
                  stroke={heatColor(heatStep(count, max))}
                  strokeWidth={11}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}

            <StartFinish />

            <g ref={markerGroupRef}>
              {/*
                Ascending by count, so the busiest corners paint last and sit on
                top, and nudged apart first so none of them is buried. Baku
                doubles back on itself and the castle section is several corners
                in a few metres, which at map scale put whole markers underneath
                each other.
              */}
              {placed
                .slice()
                .sort((a, b) => a.count - b.count)
                .map((marker) => {
                  const corner = {
                    number: marker.corner,
                    x: marker.x,
                    y: marker.y,
                  };
                  const anchor = BAKU_CORNERS.find(
                    (entry) => entry.number === marker.corner,
                  );
                  const count = marker.count;
                  const radius = marker.radius;
                  /* A numeral needs room. Below that the marker is a plain dot
                     and the tally beside it is where its number is read. */
                  const callout = callouts.has(marker.corner);
                  const labelled = radius >= 18 && !callout;
                  const focusable = ranked[0]?.corner === marker.corner;
                  const isSelected = highlighted.has(marker.corner);
                  return (
                    <g
                      key={marker.corner}
                      data-corner={marker.corner}
                      role="button"
                      tabIndex={focusable ? 0 : -1}
                      aria-pressed={
                        selected?.kind === 'corner' &&
                        selected.corner === marker.corner
                      }
                      aria-label={`Turn ${marker.corner}, ${count} ${
                        count === 1 ? 'incident' : 'incidents'
                      }`}
                      /*
                        A marker that does nothing on hover reads as decoration.
                        Brightness rather than a size change, because growing
                        the circle would shift the one channel that encodes the
                        count, and in the castle section it would also push a
                        marker over its neighbour.
                      */
                      className="cursor-pointer transition-[filter] outline-none hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                      onClick={() =>
                        select({ kind: 'corner', corner: marker.corner })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          select({ kind: 'corner', corner: marker.corner });
                        }
                        if (
                          event.key === 'ArrowRight' ||
                          event.key === 'ArrowDown'
                        ) {
                          event.preventDefault();
                          moveFocus(marker.corner, 1);
                        }
                        if (
                          event.key === 'ArrowLeft' ||
                          event.key === 'ArrowUp'
                        ) {
                          event.preventDefault();
                          moveFocus(marker.corner, -1);
                        }
                      }}
                    >
                      {/* A leader back to the corner, drawn only when the
                          marker had to move far enough for the link to stop
                          being obvious. */}
                      {anchor !== undefined &&
                      Math.hypot(anchor.x - marker.x, anchor.y - marker.y) >
                        6 ? (
                        <line
                          x1={anchor.x}
                          y1={anchor.y}
                          x2={marker.x}
                          y2={marker.y}
                          stroke="var(--border-strong)"
                          strokeWidth={2}
                        />
                      ) : null}
                      {/* A transparent target as wide as the space around the
                          dot allows (`hitRadius`), so a thumb need not land on
                          an 11-unit circle drawn at a third of its size. */}
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r={hitRadius(marker, placed)}
                        fill="transparent"
                      />
                      {/* The selection ring: the one mark that says "this is
                          what the list below is about". */}
                      {isSelected ? (
                        <circle
                          cx={corner.x}
                          cy={corner.y}
                          r={radius + 7}
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth={4}
                        />
                      ) : null}
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r={radius}
                        fill={heatColor(heatStep(count, max))}
                        stroke="var(--page)"
                        strokeWidth={3}
                      />
                      {callout ? (
                        <CornerCallout
                          corner={marker.corner}
                          count={count}
                          x={corner.x}
                          y={corner.y}
                          radius={radius}
                        />
                      ) : null}
                      {/*
                        Inside the dot, the corner number. The busiest corners
                        say their count outside instead, as "Turn 3 / 11", the
                        way the social posters that link here do: a lone "3"
                        inside a dot beside an "11" outside it read as two
                        counts.
                      */}
                      {labelled ? (
                        <text
                          x={corner.x}
                          y={corner.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={Math.round(radius * 1.05)}
                          fontWeight={700}
                          fill="var(--page)"
                          className="pointer-events-none select-none"
                        >
                          {marker.corner}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
            </g>
          </svg>
          <figcaption className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden>Fewer</span>
              {/* One swatch per step of the ramp, so the legend cannot drift
                  from the scale it is describing. */}
              {Array.from({ length: HEAT_STEPS }, (_, index) => (
                <span
                  key={index}
                  aria-hidden
                  className="inline-block h-2.5 w-4 rounded-xs"
                  style={{ backgroundColor: heatColor(index + 1) }}
                />
              ))}
              <span aria-hidden>More</span>
            </span>
            <span>
              {rangeLabel}. The bar and arrow mark the start/finish line and the
              direction of the lap. Select a corner to list its incidents below.
            </span>
          </figcaption>
        </figure>

        <BreakdownPanel
          breakdown={breakdown}
          onBreakdownChange={(next) => {
            setBreakdown(next);
            setShowAllRows(false);
          }}
          corners={ranked}
          drivers={rankedDriverRows}
          showAllRows={showAllRows}
          onShowAllRows={() => setShowAllRows(true)}
          selected={selected}
          onSelectCorner={(corner) => select({ kind: 'corner', corner })}
          onSelectDriver={(driver) => select({ kind: 'driver', driver })}
        />
      </div>

      <div ref={selectionRef} className="scroll-mt-20">
        {selected === null ? (
          <FullArchive crashes={visible} unplaced={unplaced} filter={filter} />
        ) : (
          <SelectedIncidents
            selection={selected}
            crashes={selectedCrashes}
            filter={filter}
            onClear={() => setSelected(null)}
          />
        )}
      </div>
    </section>
  );
}

function FilterBar({
  filter,
  onChange,
}: {
  filter: BakuFilter;
  onChange: (next: BakuFilter) => void;
}) {
  return (
    /*
     * A radio group rather than tabs: there is one view and four ways to narrow
     * it, not four panels. The count sits on the control because the contrast
     * between the buckets is the finding, and burying it behind a click would
     * hide it.
     */
    <div
      role="radiogroup"
      aria-label="Filter incidents by session"
      className="flex flex-wrap gap-1.5 sm:gap-2"
    >
      {BAKU_FILTERS.map((entry) => {
        const active = entry.value === filter;
        return (
          <button
            key={entry.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(entry.value)}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-sm border px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:gap-2 sm:px-3 ${
              active
                ? 'border-accent bg-accent-muted font-semibold text-text'
                : 'border-border text-text-muted hover:border-border-strong hover:text-text'
            }`}
          >
            {entry.label}
            <span className="gpp-mono text-xs text-text-muted">
              {countByFilter(BAKU_CRASHES, entry.value)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The breakdown beside the map: the same numbers as text, and the map's
 * equivalent controls.
 *
 * A full-width row is a target anyone can hit, which is what lets the markers
 * on the map stay small enough to sit in the castle section without colliding.
 * On a phone, where a marker's hit area works out under ten pixels, these rows
 * are the only practical way in.
 */
function BreakdownPanel({
  breakdown,
  onBreakdownChange,
  corners,
  drivers,
  showAllRows,
  onShowAllRows,
  selected,
  onSelectCorner,
  onSelectDriver,
}: {
  breakdown: BakuBreakdown;
  onBreakdownChange: (next: BakuBreakdown) => void;
  corners: readonly { corner: number; count: number }[];
  drivers: readonly { driver: string; count: number }[];
  showAllRows: boolean;
  onShowAllRows: () => void;
  selected: Selection | null;
  onSelectCorner: (corner: number) => void;
  onSelectDriver: (driver: string) => void;
}) {
  const rows =
    breakdown === 'corner'
      ? corners.map((entry) => ({
          key: `T${entry.corner}`,
          country: undefined as string | undefined,
          /* Written out rather than abbreviated. "T3" is shorthand that
             assumes the reader already thinks in it, and the row has the
             width for the real words. */
          lead: `Turn ${entry.corner}`,
          full: `Turn ${entry.corner}`,
          count: entry.count,
          selected:
            selected?.kind === 'corner' && selected.corner === entry.corner,
          onSelect: () => onSelectCorner(entry.corner),
        }))
      : drivers.map((entry) => ({
          key: entry.driver,
          country: driverCountry(entry.driver),
          lead: driverSurname(entry.driver),
          full: driverName(entry.driver),
          count: entry.count,
          selected:
            selected?.kind === 'driver' && selected.driver === entry.driver,
          onSelect: () => onSelectDriver(entry.driver),
        }));
  const max = Math.max(0, ...rows.map((row) => row.count));
  /* Caps that never split a tie: see `rowsBeforeTie`. */
  const rowCounts = rows.map((row) => row.count);
  const phoneRows = rowsBeforeTie(rowCounts, VISIBLE_ROWS_ON_PHONE);
  const wideRows = rowsBeforeTie(rowCounts, VISIBLE_ROWS);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Break incidents down by"
        className="flex gap-2"
      >
        {(
          [
            ['corner', 'By corner'],
            ['driver', 'By driver'],
          ] as const
        ).map(([value, label]) => {
          const active = breakdown === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onBreakdownChange(value)}
              className={`min-h-9 rounded-sm border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active
                  ? 'border-accent bg-accent-muted font-semibold text-text'
                  : 'border-border text-text-muted hover:border-border-strong hover:text-text'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Nothing in this filter.</p>
      ) : (
        <>
          <ul className="mt-3 flex flex-col">
            {rows.map((row, index) => (
              <li
                key={row.key}
                /*
                 * Beyond the sixth row the list is hidden on a phone until
                 * asked for. `display: none` also takes those rows out of the
                 * tab order, which is the point: the whole archive is still one
                 * disclosure away underneath.
                 */
                className={`border-b border-border last:border-0 ${
                  showAllRows
                    ? ''
                    : index >= wideRows
                      ? 'hidden'
                      : index >= phoneRows
                        ? 'hidden lg:block'
                        : ''
                }`}
              >
                <button
                  type="button"
                  aria-pressed={row.selected}
                  onClick={row.onSelect}
                  className={`flex min-h-9 w-full items-center gap-3 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    row.selected ? 'bg-surface' : ''
                  }`}
                >
                  {/* The flag reserves its box whether or not the asset
                      exists, so a driver with no flag on file does not knock
                      the column out of line with the rest. */}
                  {row.country === undefined ? null : (
                    <Flag code={row.country} size="xs" className="shrink-0" />
                  )}
                  <span
                    className={`shrink-0 truncate text-sm text-text ${
                      row.country === undefined ? 'w-[5.5rem]' : 'w-[6.5rem]'
                    }`}
                    title={row.full}
                  >
                    {row.lead}
                  </span>
                  {/* The bar gets its own track. Sized against the whole row,
                      the long bars were squeezed by the name and the count
                      beside them until a 6 and a 4 drew the same length. */}
                  <span aria-hidden className="flex min-w-0 flex-1">
                    <span
                      className="h-1.5 rounded-xs"
                      style={{
                        width: `${Math.round((row.count / max) * 100)}%`,
                        backgroundColor: heatColor(heatStep(row.count, max)),
                      }}
                    />
                  </span>
                  {/* Only when the visible label is an abbreviation of the
                      real name, which is the driver rows and not the corners. */}
                  {row.lead === row.full ? null : (
                    <span className="sr-only">{row.full},</span>
                  )}
                  <span className="gpp-mono ml-auto shrink-0 text-sm text-text-muted">
                    {row.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {rows.length > phoneRows && !showAllRows ? (
            <button
              type="button"
              onClick={onShowAllRows}
              /* Hidden above `lg` unless the list is long enough to be capped
                 there too, so the control never offers to reveal nothing. */
              className={`mt-2 min-h-9 text-sm text-text-muted underline underline-offset-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                rows.length > wideRows ? '' : 'lg:hidden'
              }`}
            >
              Show all {rows.length}{' '}
              {breakdown === 'corner' ? 'corners' : 'drivers'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * How many rows the breakdown aims to show before asking. The real cut moves
 * to the nearest change of count, so a tie is never split.
 *
 * Six on a phone, where the panel stacks under the map and would otherwise
 * double the section. Twelve elsewhere, which is the whole corner list and
 * roughly the map's height: the driver list runs to thirty-one, and left
 * uncapped it turned the panel into a column twice as tall as the thing it
 * sits beside.
 */
const VISIBLE_ROWS_ON_PHONE = 6;
const VISIBLE_ROWS = 12;

/**
 * Every row, server-rendered, closed by default.
 *
 * A closed `details` keeps the whole archive and its citations in the HTML for
 * a crawler, a reviewer and anyone without JavaScript, while costing the
 * section one line of height. It is also the only place the incidents with no
 * corner can be read, since nothing places them on the map.
 */
/**
 * The three newest incidents in view, then the rest behind a disclosure.
 *
 * Collapsing all fifty-seven was right for the section's height but it left no
 * incident visible at all, and the notes are the part of this page that exists
 * nowhere else. Three of them read above the fold, and the archive underneath
 * holds the other fifty-four rather than repeating these: the same paragraph
 * twice in one document helps nobody, least of all a crawler weighing it.
 */
function FullArchive({
  crashes,
  unplaced,
  filter,
}: {
  crashes: readonly BakuCrash[];
  unplaced: number;
  filter: BakuFilter;
}) {
  const listed = orderedForList(crashes);
  const preview = listed.slice(0, PREVIEW_COUNT);
  const rest = listed.slice(PREVIEW_COUNT);
  const label = BAKU_FILTERS.find((entry) => entry.value === filter)?.label;
  return (
    <>
      <h3 className="mt-8 text-sm font-semibold text-text">Latest incidents</h3>
      <ol className="mt-2 flex flex-col gap-px bg-border">
        {preview.map((crash) => (
          <li key={crash.id} className="bg-page py-3">
            <IncidentRow crash={crash} showCorner />
          </li>
        ))}
      </ol>
      <details className="group mt-2 border-t border-border">
        {/*
        `list-none` removes the native marker, so the chevron has to replace it
        rather than sit beside it: without one the row reads as a caption and
        nobody discovers the archive underneath.
      */}
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <ChevronRight
            aria-hidden
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          />
          The other {rest.length}{' '}
          {filter === 'all' ? '' : `${label?.toLowerCase()} `}incidents, back to
          2016
          {unplaced > 0 ? `, including ${unplaced} with no corner named` : null}
        </summary>
        <ol className="mb-2 flex flex-col gap-px bg-border">
          {rest.map((crash) => (
            <li key={crash.id} className="bg-page py-3">
              <IncidentRow crash={crash} showCorner />
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}

/** Incidents shown before the archive folds. */
const PREVIEW_COUNT = 3;

type Selection =
  | { kind: 'corner'; corner: number }
  | { kind: 'driver'; driver: string };

function selectionTitle(selection: Selection): string {
  return selection.kind === 'corner'
    ? `Turn ${selection.corner}`
    : driverName(selection.driver);
}

/**
 * The incidents behind what the reader selected, in place of the latest
 * three. Under the map and the tally rather than over them, so the ring on
 * the map and the highlighted row stay in view while the reader reads.
 */
function SelectedIncidents({
  selection,
  crashes,
  filter,
  onClear,
}: {
  selection: Selection;
  crashes: readonly BakuCrash[];
  filter: BakuFilter;
  onClear: () => void;
}) {
  const listed = orderedForList(crashes);
  const country =
    selection.kind === 'driver' ? driverCountry(selection.driver) : undefined;
  const label = BAKU_FILTERS.find((entry) => entry.value === filter)?.label;
  return (
    <div className="mt-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-text">
            {country === undefined ? null : (
              <Flag code={country} size="sm" className="shrink-0" />
            )}
            {selectionTitle(selection)}
          </h3>
          <p className="text-sm text-text-muted">
            {listed.length} {filter === 'all' ? '' : `${label?.toLowerCase()} `}
            {listed.length === 1 ? 'incident' : 'incidents'} since 2016
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 text-sm text-text-muted hover:border-border-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X aria-hidden className="h-4 w-4" />
          Clear
        </button>
      </div>
      <ol className="mt-3 flex flex-col gap-px bg-border">
        {listed.map((crash) => (
          <li key={crash.id} className="bg-page py-3">
            {/* A driver's incidents span corners, so each row names its own. */}
            <IncidentRow
              crash={crash}
              showCorner={selection.kind === 'driver'}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Where a callout sits relative to its dot, for each corner that can hold one
 * of the two highest counts under any filter. Chosen by hand against the
 * geometry so the label lands in open space rather than across the track; any
 * other corner falls back to the right.
 */
const CALLOUT_SIDE: Record<number, 'left' | 'right' | 'below'> = {
  1: 'below',
  2: 'right',
  3: 'left',
  6: 'below',
  15: 'right',
};

/**
 * "Turn 3 / 11" beside a dot: the corner name small and muted, the count
 * large. The same reading as the social posters, so a reader arriving from
 * one finds the number where they expect it.
 */
function CornerCallout({
  corner,
  count,
  x,
  y,
  radius,
}: {
  corner: number;
  count: number;
  x: number;
  y: number;
  radius: number;
}) {
  const side = CALLOUT_SIDE[corner] ?? 'right';
  const gap = 12;
  const anchor =
    side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle';
  const tx =
    side === 'left'
      ? x - radius - gap
      : side === 'right'
        ? x + radius + gap
        : x;
  const top = side === 'below' ? y + radius + gap : y - 44;
  return (
    <text
      aria-hidden
      textAnchor={anchor}
      className="pointer-events-none select-none"
    >
      <tspan
        x={tx}
        y={top}
        dominantBaseline="hanging"
        fontSize={30}
        fontWeight={600}
        fill="var(--text-muted)"
      >
        Turn {corner}
      </tspan>
      <tspan
        x={tx}
        y={top + 36}
        dominantBaseline="hanging"
        fontSize={52}
        fontWeight={800}
        fill="var(--text)"
      >
        {count}
      </tspan>
    </text>
  );
}

function IncidentRow({
  crash,
  showCorner = false,
}: {
  crash: BakuCrash;
  showCorner?: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="gpp-mono text-sm text-text">{crash.year}</span>
        <span className="text-sm text-text-muted">
          {sessionLabel(crash.session)}
          {crash.lap === undefined ? '' : `, lap ${crash.lap}`}
        </span>
        <DriverNames drivers={crash.drivers} />
        {showCorner && crash.corner !== null ? (
          <span className="gpp-mono text-sm text-text-muted">
            Turn {crash.corner}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        {crash.note} <IncidentSource crash={crash} />
      </p>
    </>
  );
}

/**
 * The drivers in an incident, each with their nationality flag, joined the
 * way `driversLabel` joins them ("A, B and C"). The flag is the same one the
 * tally and the social posters carry, so a driver reads the same everywhere.
 */
function DriverNames({ drivers }: { drivers: readonly string[] }) {
  if (drivers.length === 0) {
    return (
      <span className="font-semibold text-text">{driversLabel(drivers)}</span>
    );
  }
  return (
    <span className="font-semibold text-text">
      {drivers.map((code, index) => {
        const country = driverCountry(code);
        return (
          <span key={code}>
            {index === 0 ? null : index === drivers.length - 1 ? ' and ' : ', '}
            <span className="inline-flex items-center gap-1.5">
              {country === undefined ? null : <Flag code={country} size="xs" />}
              {driverName(code)}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The citation on an incident, which is not always a link.
 *
 * A handful of rows are cited to the FIA race control log rather than to a
 * published report, because no report covers them. That provenance is real and
 * belongs on the row, but it has no URL: rendering it as an anchor produced a
 * "Source" link that went nowhere, which is worse than no link at all on a
 * feature whose whole claim is that it can be checked.
 */
function IncidentSource({ crash }: { crash: BakuCrash }) {
  if (!crash.source.startsWith('https://')) {
    return (
      /* `text-muted`, not `text-disabled`. This is a citation a reader is
         meant to read, and the disabled token is tuned for controls nobody can
         use: it failed contrast outright. */
      <span className="text-text-muted">Source: FIA race control log</span>
    );
  }
  return (
    <a
      href={crash.source}
      rel="noreferrer nofollow"
      target="_blank"
      aria-label={`Source for ${crash.year} ${sessionLabel(
        crash.session,
      )}, ${driversLabel(crash.drivers)}`}
      className="underline underline-offset-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      Source
    </a>
  );
}

/**
 * The start/finish line and the direction the lap runs.
 *
 * Without these the drawing is an abstract shape: a reader cannot tell where a
 * lap begins, and "Turn 3" means nothing if you do not know which way round the
 * numbers go. Both are derived from the geometry rather than placed by eye, so
 * they cannot drift from the outline they sit on.
 */
function StartFinish() {
  const { x, y, angle } = BAKU_START_FINISH;
  return (
    <g aria-hidden transform={`translate(${x} ${y}) rotate(${angle})`}>
      {/* The line across the track, drawn past both edges so it reads as a
          line on the circuit rather than a mark on the ribbon. */}
      <line
        x1={0}
        y1={-16}
        x2={0}
        y2={16}
        stroke="var(--text)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      {/*
        The arrow sits beside the track, not on it. Drawn over the ribbon it was
        a grey shape on an orange band and effectively invisible; off to the
        side it has the page behind it and reads at a glance.
      */}
      <g transform="translate(34 -30)">
        <line
          x1={-16}
          y1={0}
          x2={6}
          y2={0}
          stroke="var(--text)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path d="M4 -9 L20 0 L4 9 Z" fill="var(--text)" />
      </g>
    </g>
  );
}
