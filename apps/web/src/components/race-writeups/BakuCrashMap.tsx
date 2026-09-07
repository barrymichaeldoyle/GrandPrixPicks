import { ChevronRight, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Flag } from '@/components/Flag';
import { useModalDialog } from '@/hooks/useModalDialog';
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
  markerRadius,
  orderedForList,
  placeMarkers,
  rankedCorners,
  rankedDrivers,
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
 * summary is the map beside its tally, drill-down is a modal, and the full
 * fifty-seven rows sit in a closed `details`. An earlier version listed every
 * incident inline and ran to seven thousand pixels, which is a fine page and a
 * bad section.
 *
 * Everything still renders on the server, the rows inside the closed `details`
 * included: the filter and the modal narrow what is already in the HTML rather
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
  const [openCorner, setOpenCorner] = useState<number | null>(null);
  const [openDriver, setOpenDriver] = useState<string | null>(null);
  const [showAllRows, setShowAllRows] = useState(false);
  const headingId = useId();
  const markerGroupRef = useRef<SVGGElement>(null);

  // Plain derivations: the React Compiler memoizes these, and the whole
  // dataset is 57 rows, so there is nothing here worth a manual cache.
  const visible = filterCrashes(BAKU_CRASHES, filter);
  const counts = countsByCorner(visible);
  const max = Math.max(0, ...counts.values());
  const ranked = rankedCorners(counts);
  const rankedDriverRows = rankedDrivers(countsByDriver(visible));
  const unplaced = unplacedCount(visible);

  function applyFilter(next: BakuFilter) {
    setFilter(next);
    setShowAllRows(false);
    /*
     * A corner or driver the new filter empties must not stay open over an
     * empty list.
     */
    const nextCrashes = filterCrashes(BAKU_CRASHES, next);
    if (openCorner !== null && !countsByCorner(nextCrashes).has(openCorner)) {
      setOpenCorner(null);
    }
    if (openDriver !== null && !countsByDriver(nextCrashes).has(openDriver)) {
      setOpenDriver(null);
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
              {placeMarkers(
                BAKU_CORNERS.map((corner) => ({
                  corner: corner.number,
                  count: counts.get(corner.number) ?? 0,
                  x: corner.x,
                  y: corner.y,
                  radius: markerRadius(counts.get(corner.number) ?? 0, max),
                })).filter((marker) => marker.count > 0),
              )
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
                  const labelled = radius >= 18;
                  const focusable = ranked[0]?.corner === marker.corner;
                  return (
                    <g
                      key={marker.corner}
                      data-corner={marker.corner}
                      role="button"
                      tabIndex={focusable ? 0 : -1}
                      aria-haspopup="dialog"
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
                      className="cursor-pointer transition-[filter] hover:brightness-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
                      onClick={() => setOpenCorner(marker.corner)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setOpenCorner(marker.corner);
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
                      {/* A transparent target wider than the drawn dot, so a
                          pointer need not land on an 11-unit circle. */}
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r={Math.max(radius + 14, 26)}
                        fill="transparent"
                      />
                      <circle
                        cx={corner.x}
                        cy={corner.y}
                        r={radius}
                        fill={heatColor(heatStep(count, max))}
                        stroke="var(--page)"
                        strokeWidth={3}
                      />
                      {/*
                        The label is the corner number, not the count. Size and
                        shading both already say how many; what the picture
                        cannot otherwise tell you is which corner this is.
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
              direction of the lap. Select a corner for its incidents.
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
          onSelectCorner={setOpenCorner}
          onSelectDriver={setOpenDriver}
        />
      </div>

      <FullArchive crashes={visible} unplaced={unplaced} filter={filter} />

      {openCorner === null ? null : (
        <IncidentModal
          title={`Turn ${openCorner}`}
          crashes={visible.filter((crash) => crash.corner === openCorner)}
          onClose={() => setOpenCorner(null)}
        />
      )}
      {openDriver === null ? null : (
        <IncidentModal
          title={driverName(openDriver)}
          country={driverCountry(openDriver)}
          showCorner
          crashes={visible.filter((crash) =>
            crash.drivers.includes(openDriver),
          )}
          onClose={() => setOpenDriver(null)}
        />
      )}
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
      className="flex flex-wrap gap-2"
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
            className={`inline-flex min-h-9 items-center gap-2 rounded-sm border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
  onSelectCorner,
  onSelectDriver,
}: {
  breakdown: BakuBreakdown;
  onBreakdownChange: (next: BakuBreakdown) => void;
  corners: readonly { corner: number; count: number }[];
  drivers: readonly { driver: string; count: number }[];
  showAllRows: boolean;
  onShowAllRows: () => void;
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
          onSelect: () => onSelectCorner(entry.corner),
        }))
      : drivers.map((entry) => ({
          key: entry.driver,
          country: driverCountry(entry.driver),
          lead: driverSurname(entry.driver),
          full: driverName(entry.driver),
          count: entry.count,
          onSelect: () => onSelectDriver(entry.driver),
        }));
  const max = Math.max(0, ...rows.map((row) => row.count));

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
              className={`min-h-9 rounded-sm border px-3 text-xs tracking-label uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
                    : index >= VISIBLE_ROWS
                      ? 'hidden'
                      : index >= VISIBLE_ROWS_ON_PHONE
                        ? 'hidden lg:block'
                        : ''
                }`}
              >
                <button
                  type="button"
                  aria-haspopup="dialog"
                  onClick={row.onSelect}
                  className="flex min-h-9 w-full items-center gap-3 text-left hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                  <span
                    aria-hidden
                    className="h-1.5 rounded-xs"
                    style={{
                      width: `${Math.round((row.count / max) * 100)}%`,
                      backgroundColor: heatColor(heatStep(row.count, max)),
                    }}
                  />
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
          {rows.length > VISIBLE_ROWS_ON_PHONE && !showAllRows ? (
            <button
              type="button"
              onClick={onShowAllRows}
              /* Hidden above `lg` unless the list is long enough to be capped
                 there too, so the control never offers to reveal nothing. */
              className={`mt-2 min-h-9 text-sm text-text-muted underline underline-offset-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                rows.length > VISIBLE_ROWS ? '' : 'lg:hidden'
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
 * How many rows the breakdown shows before asking.
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
      <ol className="mt-8 flex flex-col gap-px bg-border">
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

function IncidentModal({
  title,
  crashes,
  onClose,
  showCorner = false,
  country,
}: {
  title: string;
  crashes: readonly BakuCrash[];
  onClose: () => void;
  /** Driver drill-downs span corners, so the row has to name which. */
  showCorner?: boolean;
  /** Set for a driver, absent for a corner. */
  country?: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    onClose,
    initialFocusRef: closeButtonRef,
  });
  const listed = orderedForList(crashes);

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baku-detail-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3
              id="baku-detail-title"
              className="flex items-center gap-2 text-lg font-semibold text-text"
            >
              {country === undefined ? null : (
                <Flag code={country} size="sm" className="shrink-0" />
              )}
              {title}
            </h3>
            <p className="text-xs text-text-muted">
              {listed.length} {listed.length === 1 ? 'incident' : 'incidents'}{' '}
              since 2016
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={`Close ${title} incidents`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="min-h-0 divide-y divide-border overflow-y-auto">
          {listed.map((crash) => (
            <li key={crash.id} className="px-4 py-3">
              <IncidentRow crash={crash} showCorner={showCorner} />
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
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
        <span className="font-semibold text-text">
          {driversLabel(crash.drivers)}
        </span>
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
