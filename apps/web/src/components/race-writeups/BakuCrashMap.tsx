import { useId, useRef, useState } from 'react';

import {
  BAKU_CORNERS,
  BAKU_TRACK_SEGMENTS,
  BAKU_VIEW_BOX,
} from '@/lib/bakuCircuitGeometry';
import { BAKU_CRASHES } from '@/lib/bakuCrashes';

import type { BakuFilter } from './bakuCrashMapModel';
import {
  BAKU_FILTERS,
  HEAT_STEPS,
  countByFilter,
  countsByCorner,
  driversLabel,
  filterCrashes,
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
 * shared `CrashMap`, no per-circuit route and no second dataset: twenty-three
 * near-identical circuit pages are what got the site rejected for low value
 * content three times, and a second one of these earns its abstraction only if
 * it ever exists.
 *
 * Everything renders on the server. The filter narrows what is already in the
 * HTML rather than fetching, so a crawler and a reviewer see all fifty-seven
 * incidents on first paint. That is not a nicety here: a `<Link>` behind a
 * client query once orphaned all eleven practice pages.
 *
 * Three surfaces show the same filtered set, which is the accessibility design
 * as much as the visual one. The map is the picture; the tally is the same
 * numbers as text and full-width controls; the list is the evidence, with a
 * citation on every row. Colour is never the only channel, and the small SVG
 * markers are legitimate under WCAG 2.5.8's equivalent-control exception
 * because every corner is also selectable from a tally row.
 */
export function BakuCrashMap() {
  const [filter, setFilter] = useState<BakuFilter>('all');
  const [selectedCorner, setSelectedCorner] = useState<number | null>(null);
  const headingId = useId();
  const markerGroupRef = useRef<SVGGElement>(null);

  // Plain derivations: the React Compiler memoizes these, and the whole
  // dataset is 57 rows, so there is nothing here worth a manual cache.
  const visible = filterCrashes(BAKU_CRASHES, filter);
  const counts = countsByCorner(visible);
  const max = Math.max(0, ...counts.values());
  const ranked = rankedCorners(counts);
  const unplaced = unplacedCount(visible);
  const listed = orderedForList(
    selectedCorner === null
      ? visible
      : visible.filter((crash) => crash.corner === selectedCorner),
  );

  /*
   * Changing the filter silently rewrites the map, so the count is announced.
   * A selected corner that the new filter empties is dropped rather than left
   * showing an empty list under a highlighted marker.
   */
  function applyFilter(next: BakuFilter) {
    setFilter(next);
    const nextCounts = countsByCorner(filterCrashes(BAKU_CRASHES, next));
    if (selectedCorner !== null && !nextCounts.has(selectedCorner)) {
      setSelectedCorner(null);
    }
  }

  function toggleCorner(corner: number) {
    setSelectedCorner((current) => (current === corner ? null : corner));
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

  const rangeLabel =
    max <= 0
      ? 'no incidents'
      : max === 1
        ? '1 incident per corner'
        : `1 to ${max} incidents per corner`;

  return (
    <section aria-labelledby={headingId} className="py-8 sm:py-16">
      <h2
        id={headingId}
        className="font-title text-2xl font-medium text-text sm:text-3xl"
      >
        Every notable crash at Baku since 2016
      </h2>
      <div className="max-w-3xl">
        <p className="gpp-reading-copy mt-4 text-text-muted">
          Nine Formula 1 weekends have run here, starting with the 2016 European
          Grand Prix. These are the {BAKU_CRASHES.length} incidents that ended
          in a red flag, a retirement or a stewards' collision note, each placed
          at the corner where the car stopped.
        </p>
        <p className="gpp-reading-copy mt-3 text-text-muted">
          Turn 3 has collected the most, and it takes cars in groups: three in
          the 2021 qualifying hour alone. Filter by session to see how the
          practice, qualifying and race patterns differ.
        </p>
      </div>

      <div className="max-w-3xl">
        <FilterBar filter={filter} onChange={applyFilter} />
      </div>

      <p aria-live="polite" className="sr-only">
        Showing {visible.length}{' '}
        {visible.length === 1 ? 'incident' : 'incidents'},{' '}
        {BAKU_FILTERS.find((entry) => entry.value === filter)?.label}
        {selectedCorner === null ? '' : `, Turn ${selectedCorner}`}.
      </p>

      <p className="sr-only">
        {ranked.length === 0
          ? 'No incidents in this filter.'
          : `Busiest corners: ${ranked
              .slice(0, 3)
              .map((entry) => `Turn ${entry.corner}, ${entry.count}`)
              .join('; ')}. Every corner is listed below the map.`}
      </p>
      <figure className="mt-6 max-w-3xl">
        <svg
          viewBox={`0 0 ${BAKU_VIEW_BOX.width} ${BAKU_VIEW_BOX.height}`}
          width={BAKU_VIEW_BOX.width}
          height={BAKU_VIEW_BOX.height}
          className="h-auto w-full"
          /*
            A group, not an image. `role="img"` collapses the subtree into a
            single node, which would have made every marker button below
            unreachable to a screen reader while still leaving it in the tab
            order: axe flags that as nested-interactive, and it is right to.
            The map is a set of controls, so it is labelled as a group and the
            corner tally underneath carries the text equivalent.
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
                key={`${segment.corner}-${index}`}
                d={segment.d}
                fill="none"
                stroke={heatColor(heatStep(count, max))}
                strokeWidth={
                  selectedCorner === null || selectedCorner === segment.corner
                    ? 11
                    : 9
                }
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={
                  selectedCorner === null || selectedCorner === segment.corner
                    ? 1
                    : 0.35
                }
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
                const step = heatStep(count, max);
                const radius = markerRadius(count, max);
                /* A numeral needs room. Below that the marker is a plain dot
                   and the tally underneath is where its number is read. */
                const labelled = radius >= 18;
                const selected = selectedCorner === corner.number;
                const focusable =
                  selectedCorner === corner.number ||
                  (selectedCorner === null &&
                    ranked[0]?.corner === corner.number);
                return (
                  <g
                    key={corner.number}
                    data-corner={corner.number}
                    role="button"
                    tabIndex={focusable ? 0 : -1}
                    aria-pressed={selected}
                    aria-label={`Turn ${corner.number}, ${count} ${
                      count === 1 ? 'incident' : 'incidents'
                    }`}
                    className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    onClick={() => toggleCorner(corner.number)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleCorner(corner.number);
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
                      pointer does not have to land on an 11-unit circle. */}
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
                      fill={heatColor(step)}
                      stroke="var(--page)"
                      strokeWidth={3}
                      opacity={selectedCorner === null || selected ? 1 : 0.4}
                    />
                    {/*
                    The label is the corner number, not the count. Size and
                    shading both already say how many; what the picture cannot
                    otherwise tell you is which corner you are looking at.
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

        <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden>Fewer</span>
            {/* One swatch per step of the ramp, so the legend cannot drift
                from the scale it is describing. */}
            {Array.from({ length: HEAT_STEPS }, (_, index) => (
              <span
                key={index}
                aria-hidden
                className="inline-block h-3 w-5 rounded-xs"
                style={{ backgroundColor: heatColor(index + 1) }}
              />
            ))}
            <span aria-hidden>More</span>
          </span>
          <span>Shading and dot size both show {rangeLabel}.</span>
        </figcaption>
      </figure>

      <CornerTally
        ranked={ranked}
        max={max}
        selected={selectedCorner}
        onSelect={toggleCorner}
      />

      {unplaced > 0 ? (
        <p className="mt-4 max-w-3xl text-sm text-text-muted">
          {unplaced} {unplaced === 1 ? 'incident is' : 'incidents are'} listed
          below without a corner, because no source names one. They are counted
          in the total and left off the map rather than guessed at.
        </p>
      ) : null}

      <IncidentList
        crashes={listed}
        selectedCorner={selectedCorner}
        onClearCorner={() => setSelectedCorner(null)}
      />
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
     * A radio group rather than tabs: there is one view and four ways to
     * narrow it, not four panels. The count sits on the control because the
     * contrast between the buckets is the finding, and burying it behind a
     * click would hide it.
     */
    <div
      role="radiogroup"
      aria-label="Filter incidents by session"
      className="mt-6 flex flex-wrap gap-2"
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
  selected,
  onSelect,
}: {
  ranked: readonly { corner: number; count: number }[];
  max: number;
  selected: number | null;
  onSelect: (corner: number) => void;
}) {
  if (ranked.length === 0) {
    return null;
  }
  return (
    <div className="mt-8 max-w-3xl">
      <h3 className="text-xs tracking-label text-text-muted uppercase">
        Incidents by corner
      </h3>
      <ul className="mt-3 grid gap-px bg-border sm:grid-cols-2">
        {ranked.map((entry) => {
          const active = selected === entry.corner;
          return (
            <li key={entry.corner} className="bg-page">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(entry.corner)}
                className={`flex min-h-11 w-full items-center gap-3 px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  active ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <span className="gpp-mono w-12 shrink-0 text-sm text-text">
                  T{entry.corner}
                </span>
                <span
                  aria-hidden
                  className="h-2 rounded-xs"
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
          );
        })}
      </ul>
    </div>
  );
}

function IncidentList({
  crashes,
  selectedCorner,
  onClearCorner,
}: {
  crashes: readonly ReturnType<typeof orderedForList>[number][];
  selectedCorner: number | null;
  onClearCorner: () => void;
}) {
  return (
    <div className="mt-8 max-w-3xl">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-xs tracking-label text-text-muted uppercase">
          {selectedCorner === null
            ? 'Every incident'
            : `Turn ${selectedCorner}`}
        </h3>
        {selectedCorner === null ? null : (
          <button
            type="button"
            onClick={onClearCorner}
            className="text-xs text-text-muted underline underline-offset-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Show every corner
          </button>
        )}
      </div>
      <ol className="mt-3 flex flex-col gap-px bg-border">
        {crashes.map((crash) => (
          <li key={crash.id} className="bg-page p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="gpp-mono text-sm text-text">{crash.year}</span>
              <span className="text-sm text-text-muted">
                {sessionLabel(crash.session)}
                {crash.lap === undefined ? '' : `, lap ${crash.lap}`}
              </span>
              <span className="font-semibold text-text">
                {driversLabel(crash.drivers)}
              </span>
              {crash.corner === null ? null : (
                <span className="gpp-mono text-sm text-text-muted">
                  Turn {crash.corner}
                </span>
              )}
            </div>
            <p className="mt-1.5 max-w-prose text-sm text-text-muted">
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
          </li>
        ))}
      </ol>
    </div>
  );
}
