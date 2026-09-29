import type { Id } from '@convex-generated/dataModel';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { m } from 'framer-motion';
import type { ReactNode } from 'react';

import type { RosterDriver } from '@/lib/roster';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../DriverBadge';
import { DRIVER_POOL_DROPPABLE_ID } from './dndIds';

type Driver = RosterDriver;
/** "Verstappen" from "Max Verstappen", for the roster that stores no family name. */
function driverSurname(driver: Driver) {
  return driver.familyName || driver.displayName.split(' ').slice(1).join(' ');
}

/** Driver card in the pool – draggable so user can drag to picks list; tap still adds. */
function DraggableDriverCard({
  driver,
  pickedPosition,
  disabled,
  onTap,
}: {
  driver: Driver;
  /** 1-5 when this driver is already in the list, otherwise null. */
  pickedPosition: number | null;
  disabled: boolean;
  onTap: () => void;
}) {
  const { listeners, setNodeRef } = useDraggable({
    id: driver._id,
    disabled,
  });
  const picked = pickedPosition !== null;
  const surname = driverSurname(driver);
  return (
    <button
      ref={setNodeRef}
      // Drag is pointer-only: dnd-kit's keyboard listener calls preventDefault
      // on Enter/Space, which blocks native button activation (WCAG 2.1.1).
      onPointerDown={(event) => {
        listeners?.onPointerDown?.(event);
      }}
      type="button"
      data-testid={`driver-${driver.code}`}
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      disabled={disabled}
      /*
       * No `aria-label` here on purpose. It used to read "Kimi Antonelli" while
       * the card showed "ANT Antonelli", so the accessible name did not contain
       * the visible one (WCAG 2.5.3, Label in Name) and a voice-control user
       * saying "click ANT" hit nothing. The name now comes from the card's own
       * text, with the state appended below as screen-reader-only.
       */
      /*
       * Team colour is the 3px left bar, not the fill. Twenty-two saturated
       * tiles in a grid was the loudest surface in the app; confined to a bar
       * the same twenty-two are still instantly sortable by team, and the
       * code can sit at full contrast on a neutral surface.
       *
       * Hover is a surface step rather than an opacity change — opacity is
       * never used to signal hover in this system.
       *
       * The two reasons a card is disabled have to look different: a driver
       * already in the list carries the position that took him out of the
       * pool, while the rest simply grey out once five slots are full. Dimming
       * both identically made a picked driver read as "unavailable for some
       * reason" against twenty-one lookalikes.
       */
      /*
       * `@container` is on the button itself so the code/surname layout tracks
       * *this* cell's width, not the form's. At 5 columns the dashboard rail
       * leaves ~75px per pill — enough for "ANT" but not "ANT Antonelli" on
       * one line — so below 7.5rem the surname stacks under the code.
       */
      className={`gpp-team-bar @container flex min-h-11 w-full items-center justify-start gap-2 rounded-sm border py-2.5 pr-2 pl-3 text-left transition-colors duration-150 ease-out ${
        picked
          ? 'cursor-not-allowed border-accent/40 bg-accent-muted/15'
          : 'border-border bg-surface-elevated hover:border-border-strong hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface-elevated'
      }`}
      style={
        {
          '--team-colour':
            (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
        } as React.CSSProperties
      }
    >
      {/* Corner badge, not in the text flow — stacked surnames used to collide
          with an inline trailing P#. */}
      {picked ? (
        <span className="gpp-mono absolute top-1 right-1.5 text-xs leading-none font-semibold text-accent">
          P{pickedPosition}
        </span>
      ) : null}
      {/* Narrow: surname under the code. Wide: one baseline row. */}
      <span className="flex w-full min-w-0 flex-col gap-0.5 @min-[7.5rem]:flex-row @min-[7.5rem]:items-baseline @min-[7.5rem]:gap-2">
        <span
          className={`gpp-mono shrink-0 text-xs leading-none sm:text-sm ${
            picked ? 'text-text-muted' : 'text-text'
          }`}
        >
          {driver.code}
        </span>
        {/* Three-letter codes are the broadcast language, but a landing-page
            visitor may not know all twenty-two. Stack under the code when the
            pill is too narrow for a side-by-side pair. */}
        {surname ? (
          <span className="min-w-0 truncate text-xs leading-none text-text-muted @min-[7.5rem]:flex-1">
            {surname}
          </span>
        ) : null}
        {/* `shrink-0` so the marker never eats the surname's width: the name is
            the thing being picked, and it is the one that truncates well. */}
        {'entryUnconfirmed' in driver && driver.entryUnconfirmed ? (
          <span className="shrink-0 text-xs leading-none tracking-label text-text-muted uppercase">
            Unconfirmed
          </span>
        ) : null}
      </span>
      {/* Appended after the visible text so the accessible name still starts
          with what is on the card. */}
      {picked ? (
        <span className="sr-only">already picked</span>
      ) : disabled ? (
        <span className="sr-only">
          unavailable, five drivers already picked
        </span>
      ) : null}
    </button>
  );
}

/** Wrapper that makes the driver grid a drop target (drop a pick here to remove). */
function DriverPoolDroppable({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: DRIVER_POOL_DROPPABLE_ID,
  });
  return (
    <div
      ref={setNodeRef}
      // Columns follow the form's own width (container), not the viewport —
      // the dashboard center rail is ~640px wide while the viewport is `lg`,
      // and viewport breakpoints left a 4-col grid crushed into ~280px.
      className={`grid grid-cols-2 gap-2 @min-[360px]:grid-cols-3 @min-[480px]:grid-cols-4 @min-[640px]:grid-cols-5 ${isOver ? 'rounded-lg bg-accent-muted/20' : ''}`}
      data-testid="driver-selection"
    >
      {children}
    </div>
  );
}

/** The right-hand (or, on the landing stack, upper) column of pickable drivers. */
export function DriverPoolSection({
  drivers,
  picks,
  mobileActionFirst,
  pickStatus,
  onAddDriver,
}: {
  /** The racing subset, in the order to show it. */
  drivers: Driver[];
  picks: Id<'drivers'>[];
  mobileActionFirst: boolean;
  /** Shown beside the label when the side-by-side layout moves it up here. */
  pickStatus: ReactNode;
  onAddDriver: (driverId: Id<'drivers'>) => void;
}) {
  return (
    <div
      className={`${mobileActionFirst ? 'order-1 @min-[875px]:order-2' : ''} @min-[875px]:min-w-0 @min-[875px]:flex-1`}
    >
      {/* The label only earns its line in the side-by-side layout, where
          it names the right-hand column against "Your Picks". Stacked it
          just repeats the section heading, so it stays sr-only then. */}
      <div className="mb-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 @min-[875px]:mb-3">
        <h3 className="text-lg font-semibold text-text">
          <span className="sr-only @min-[875px]:not-sr-only">
            Select Drivers
          </span>
        </h3>
        {pickStatus ? (
          <div className="hidden items-baseline gap-x-3 @min-[875px]:flex">
            {pickStatus}
          </div>
        ) : null}
      </div>
      {mobileActionFirst ? (
        /* Sentences are inline-block so the line breaks between them
           rather than mid-sentence, and stays on one line when it fits. */
        <p className="mb-3 text-sm text-text-muted @min-[875px]:hidden">
          <span className="inline-block">Tap drivers in finishing order.</span>{' '}
          <span className="inline-block">You can reorder later.</span>
        </p>
      ) : null}
      <DriverPoolDroppable>
        {drivers.map((driver) => {
          const pickedIndex = picks.indexOf(driver._id);
          const isPicked = pickedIndex !== -1;
          return (
            <m.div
              key={driver._id}
              layout
              initial={false}
              tabIndex={-1}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
              }}
              whileHover={{
                scale: isPicked || picks.length >= 5 ? 1 : 1.05,
              }}
              whileTap={{
                scale: isPicked || picks.length >= 5 ? 1 : 0.95,
              }}
            >
              <DraggableDriverCard
                driver={driver}
                pickedPosition={isPicked ? pickedIndex + 1 : null}
                disabled={isPicked || picks.length >= 5}
                onTap={() => onAddDriver(driver._id)}
              />
            </m.div>
          );
        })}
      </DriverPoolDroppable>
    </div>
  );
}
