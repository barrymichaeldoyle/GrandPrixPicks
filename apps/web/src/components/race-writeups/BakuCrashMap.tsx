import { ChevronRight, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';
import {
  BAKU_CORNERS,
  BAKU_TRACK_SEGMENTS,
  BAKU_VIEW_BOX,
} from '@/lib/bakuCircuitGeometry';
import type { BakuCrash } from '@/lib/bakuCrashes';
import { BAKU_CRASHES } from '@/lib/bakuCrashes';

import type { BakuFilter } from './bakuCrashMapModel';
import {
  BAKU_FILTERS,
  countByFilter,
  countsByCorner,
  driversLabel,
  filterCrashes,
  HEAT_STEPS,
  heatColor,
  heatStep,
  markerRadius,
  orderedForList,
  rankedCorners,
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
 */
export function BakuCrashMap() {
  const [filter, setFilter] = useState<BakuFilter>('all');
  const [openCorner, setOpenCorner] = useState<number | null>(null);
  const headingId = useId();
  const markerGroupRef = useRef<SVGGElement>(null);

  // Plain derivations: the React Compiler memoizes these, and the whole
  // dataset is 57 rows, so there is nothing here worth a manual cache.
  const visible = filterCrashes(BAKU_CRASHES, filter);
  const counts = countsByCorner(visible);
  const max = Math.max(0, ...counts.values());
  const ranked = rankedCorners(counts);
  const unplaced = unplacedCount(visible);

  function applyFilter(next: BakuFilter) {
    setFilter(next);
    // A corner the new filter empties must not stay open over an empty list.
    const nextCounts = countsByCorner(filterCrashes(BAKU_CRASHES, next));
    if (openCorner !== null && !nextCounts.has(openCorner)) {
      setOpenCorner(null);
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
        {ranked.length === 0
          ? ' No corner has an incident in this filter.'
          : ` Busiest: ${ranked
              .slice(0, 3)
              .map((entry) => `Turn ${entry.corner}, ${entry.count}`)
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

            <g ref={markerGroupRef}>
              {/*
                Ascending by count, so the busiest corners paint last and sit on
                top. Turns 5, 6 and 20 are within a few units of each other in
                the castle section and their markers do overlap; drawing bigger
                over smaller keeps the finding readable, and the page-coloured
                ring on each marker separates the pile.
              */}
              {[...BAKU_CORNERS]
                .sort(
                  (a, b) =>
                    (counts.get(a.number) ?? 0) - (counts.get(b.number) ?? 0),
                )
                .map((corner) => {
                  const count = counts.get(corner.number) ?? 0;
                  if (count === 0) {
                    return null;
                  }
                  const radius = markerRadius(count, max);
                  /* A numeral needs room. Below that the marker is a plain dot
                     and the tally beside it is where its number is read. */
                  const labelled = radius >= 18;
                  const focusable = ranked[0]?.corner === corner.number;
                  return (
                    <g
                      key={corner.number}
                      data-corner={corner.number}
                      role="button"
                      tabIndex={focusable ? 0 : -1}
                      aria-haspopup="dialog"
                      aria-label={`Turn ${corner.number}, ${count} ${
                        count === 1 ? 'incident' : 'incidents'
                      }`}
                      className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      onClick={() => setOpenCorner(corner.number)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setOpenCorner(corner.number);
                        }
                        if (
                          event.key === 'ArrowRight' ||
                          event.key === 'ArrowDown'
                        ) {
                          event.preventDefault();
                          moveFocus(corner.number, 1);
                        }
                        if (
                          event.key === 'ArrowLeft' ||
                          event.key === 'ArrowUp'
                        ) {
                          event.preventDefault();
                          moveFocus(corner.number, -1);
                        }
                      }}
                    >
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
                          {corner.number}
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
            <span>{rangeLabel}. Select a corner for its incidents.</span>
          </figcaption>
        </figure>

        <CornerTally
          ranked={ranked}
          max={max}
          onSelect={(corner) => setOpenCorner(corner)}
        />
      </div>

      <FullArchive crashes={visible} unplaced={unplaced} filter={filter} />

      {openCorner === null ? null : (
        <CornerModal
          corner={openCorner}
          crashes={visible.filter((crash) => crash.corner === openCorner)}
          onClose={() => setOpenCorner(null)}
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
 * The same numbers as text, and the map's equivalent controls.
 *
 * A full-width row is a target anyone can hit, which is what lets the markers
 * on the map stay small enough to sit in the castle section without colliding.
 */
function CornerTally({
  ranked,
  max,
  onSelect,
}: {
  ranked: readonly { corner: number; count: number }[];
  max: number;
  onSelect: (corner: number) => void;
}) {
  if (ranked.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No corner has an incident in this filter.
      </p>
    );
  }
  return (
    <div>
      <h3 className="text-xs tracking-label text-text-muted uppercase">
        Incidents by corner
      </h3>
      <ul className="mt-2 flex flex-col">
        {ranked.map((entry) => (
          <li
            key={entry.corner}
            className="border-b border-border last:border-0"
          >
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => onSelect(entry.corner)}
              className="flex min-h-9 w-full items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span className="gpp-mono w-9 shrink-0 text-sm text-text">
                T{entry.corner}
              </span>
              <span
                aria-hidden
                className="h-1.5 rounded-xs"
                style={{
                  width: `${Math.round((entry.count / max) * 100)}%`,
                  backgroundColor: heatColor(heatStep(entry.count, max)),
                }}
              />
              <span className="gpp-mono ml-auto shrink-0 text-sm text-text-muted">
                {entry.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Every row, server-rendered, closed by default.
 *
 * A closed `details` keeps the whole archive and its citations in the HTML for
 * a crawler, a reviewer and anyone without JavaScript, while costing the
 * section one line of height. It is also the only place the incidents with no
 * corner can be read, since nothing places them on the map.
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
  const label = BAKU_FILTERS.find((entry) => entry.value === filter)?.label;
  return (
    <details className="group mt-6 border-t border-border">
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
        All {listed.length} {filter === 'all' ? '' : `${label?.toLowerCase()} `}
        incidents, newest first
        {unplaced > 0 ? `, including ${unplaced} with no corner named` : null}
      </summary>
      <ol className="mb-2 flex flex-col gap-px bg-border">
        {listed.map((crash) => (
          <li key={crash.id} className="bg-page p-3">
            <IncidentRow crash={crash} showCorner />
          </li>
        ))}
      </ol>
    </details>
  );
}

function CornerModal({
  corner,
  crashes,
  onClose,
}: {
  corner: number;
  crashes: readonly BakuCrash[];
  onClose: () => void;
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
        aria-labelledby="baku-corner-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3
              id="baku-corner-title"
              className="text-lg font-semibold text-text"
            >
              Turn {corner}
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
            aria-label={`Close Turn ${corner} incidents`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ol className="min-h-0 divide-y divide-border overflow-y-auto">
          {listed.map((crash) => (
            <li key={crash.id} className="px-4 py-3">
              <IncidentRow crash={crash} />
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
        {crash.note}{' '}
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
      </p>
    </>
  );
}
