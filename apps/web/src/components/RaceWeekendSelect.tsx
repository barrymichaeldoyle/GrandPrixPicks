import { ChevronDown, Search, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

import { RaceFlag } from '@/components/RaceFlag';
import { useCallbackRef } from '@/hooks/useCallbackRef';
import { useModalDialog } from '@/hooks/useModalDialog';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { useIsomorphicLayoutEffect } from '@/lib/useIsomorphicLayoutEffect';

/** Tailwind `sm`: below this the picker is a full-screen takeover, not a menu. */
const TAKEOVER_QUERY = '(max-width: 639px)';
const HISTORY_KEY = 'raceWeekendSelect';

function useMobileTakeover() {
  const [takeover, setTakeover] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(TAKEOVER_QUERY);
    function sync() {
      setTakeover(media.matches);
    }
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return takeover;
}

export type RaceWeekendOption = {
  _id: string;
  name: string;
  round: number;
  season: number;
  slug: string;
};

/**
 * Strips accents so "sao paulo" finds "São Paulo". Same folding the driver
 * combobox uses; venue names pick up the same diacritics.
 */
export function foldRaceWeekendQuery(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function matchesRaceWeekend(
  race: RaceWeekendOption,
  query: string,
): boolean {
  const q = foldRaceWeekendQuery(query.trim());
  if (!q) {
    return true;
  }
  const slugWords = race.slug.replaceAll('-', ' ');
  return (
    foldRaceWeekendQuery(race.name).includes(q) ||
    foldRaceWeekendQuery(`round ${race.round}`).includes(q) ||
    String(race.round) === q ||
    foldRaceWeekendQuery(slugWords).includes(q) ||
    String(race.season).includes(q)
  );
}

export function raceWeekendLabel(race: {
  round: number;
  name: string;
}): string {
  return `Round ${race.round} · ${race.name}`;
}

function RaceWeekendFlag({ countryCode }: { countryCode: string | null }) {
  return (
    <span className="flex h-[18px] w-6 shrink-0 items-center justify-center">
      {countryCode ? (
        <RaceFlag
          countryCode={countryCode}
          size="sm"
          className="overflow-hidden"
        />
      ) : null}
    </span>
  );
}

/**
 * Phone-sized viewports get a full-screen picker instead of a dropdown: 24
 * flagged rows in a 18rem menu under the filters is a cramped thumb target,
 * and the page behind it still scrolls. Same takeover the practice results
 * sheet uses — covering the nav, trapping focus, Back closes it.
 */
function RaceWeekendTakeover({
  titleId,
  panelRef,
  onClose,
  children,
}: {
  titleId: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-page">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex h-dvh w-full flex-col bg-page outline-none"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3">
          <h2 id={titleId} className="font-title text-lg font-medium text-text">
            Race weekend
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="gpp-touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded text-text-muted hover:text-text"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function RaceWeekendSelect({
  races,
  value,
  onChange,
  className = '',
}: {
  races: RaceWeekendOption[];
  value: string;
  onChange: (raceId: string) => void;
  className?: string;
}) {
  const reactId = useId().replaceAll(':', '');
  const listboxId = `race-weekend-list-${reactId}`;
  const searchId = `race-weekend-search-${reactId}`;
  const titleId = `race-weekend-title-${reactId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const takeover = useMobileTakeover();

  const selected = races.find((race) => race._id === value) ?? races[0];
  const visible = races.filter((race) => matchesRaceWeekend(race, query));
  const active = visible[activeIndex];
  const showSeason = races.some((race) => race.season !== races[0]?.season);

  const close = useCallbackRef((restoreFocus?: boolean) => {
    setOpen(false);
    setQuery('');
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  });

  const panelRef = useModalDialog<HTMLDivElement>({
    open: open && takeover,
    onClose: () => close(true),
  });

  useEffect(() => {
    if (!open || takeover) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, takeover, close]);

  // Desktop: type to filter immediately. Takeover: leave focus on the dialog
  // so the list is on screen; focusing the field would raise the keyboard
  // over it.
  useEffect(() => {
    if (!open || takeover) {
      return;
    }
    searchRef.current?.focus();
  }, [open, takeover]);

  // Browser/hardware Back should leave the takeover, not the page underneath.
  useEffect(() => {
    if (!open || !takeover) {
      return;
    }
    window.history.pushState(
      { ...window.history.state, [HISTORY_KEY]: true },
      '',
    );
    let closedByPop = false;
    function handlePopState() {
      closedByPop = true;
      close();
    }
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPop && window.history.state?.[HISTORY_KEY]) {
        window.history.back();
      }
    };
  }, [open, takeover, close]);

  // Keyboard (and the first paint of the open list) keep the active row in
  // the list. Hover must not: `scrollIntoView` walks every ancestor, so
  // moving the pointer down the menu was scrolling the page behind it.
  const scrollActiveIntoList = useRef(false);

  useIsomorphicLayoutEffect(() => {
    if (!open || !scrollActiveIntoList.current) {
      return;
    }
    scrollActiveIntoList.current = false;
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !option) {
      return;
    }
    const listRect = list.getBoundingClientRect();
    const optionRect = option.getBoundingClientRect();
    if (optionRect.top < listRect.top) {
      list.scrollTop -= listRect.top - optionRect.top;
    } else if (optionRect.bottom > listRect.bottom) {
      list.scrollTop += optionRect.bottom - listRect.bottom;
    }
  }, [activeIndex, open]);

  function openList() {
    const selectedIndex = races.findIndex((race) => race._id === value);
    scrollActiveIntoList.current = true;
    setActiveIndex(selectedIndex < 0 ? 0 : selectedIndex);
    setQuery('');
    setOpen(true);
  }

  function commit(race: RaceWeekendOption) {
    // The takeover pushed a same-URL sentinel so hardware Back closes it.
    // Selecting a race `replace`s the current entry; if we leave the sentinel
    // flag on that entry, unmount pops it and the new `raceId` goes with it.
    if (takeover && window.history.state?.[HISTORY_KEY]) {
      const nextState = { ...window.history.state };
      delete nextState[HISTORY_KEY];
      window.history.replaceState(nextState, '');
    }
    onChange(race._id);
    close(true);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openList();
    }
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (visible.length === 0) {
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      scrollActiveIntoList.current = true;
      setActiveIndex(
        (current) => (current + step + visible.length) % visible.length,
      );
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      scrollActiveIntoList.current = true;
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      scrollActiveIntoList.current = true;
      setActiveIndex(Math.max(0, visible.length - 1));
      return;
    }

    if (event.key === 'Enter') {
      if (active) {
        event.preventDefault();
        commit(active);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  }

  if (!selected) {
    return null;
  }

  const selectedCode = getCountryCodeForRace(selected);
  const selectedLabel = raceWeekendLabel(selected);

  const picker = (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3">
        <Search aria-hidden className="h-4 w-4 shrink-0 text-text-muted" />
        <label htmlFor={searchId} className="sr-only">
          Search races
        </label>
        <input
          id={searchId}
          ref={searchRef}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded
          aria-controls={listboxId}
          aria-activedescendant={
            active ? `${listboxId}-${active._id}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          placeholder="Search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleSearchKeyDown}
          onBlur={(event) => {
            if (takeover) {
              return;
            }
            if (!rootRef.current?.contains(event.relatedTarget as Node)) {
              close();
            }
          }}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
      </div>

      <ul
        id={listboxId}
        ref={listRef}
        role="listbox"
        aria-label="Race weekends"
        className={
          takeover
            ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain py-1 pb-[env(safe-area-inset-bottom,0px)]'
            : 'max-h-72 overflow-y-auto overscroll-contain rounded-b-lg py-1'
        }
      >
        {visible.length === 0 ? (
          <li role="presentation" className="px-3 py-3 text-sm text-text-muted">
            No matches.
          </li>
        ) : (
          visible.map((race, index) => {
            const code = getCountryCodeForRace(race);
            const isSelected = race._id === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={race._id}
                id={`${listboxId}-${race._id}`}
                role="option"
                aria-selected={isSelected}
                data-active={isActive}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(race);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex min-h-11 cursor-pointer items-center gap-2.5 text-sm ${
                  takeover ? 'px-4' : 'px-3'
                } ${
                  isSelected
                    ? 'bg-surface font-medium text-text ring-1 ring-accent ring-inset'
                    : isActive
                      ? 'bg-surface text-text'
                      : 'text-text'
                }`}
              >
                <RaceWeekendFlag countryCode={code} />
                <span className="min-w-0 truncate">
                  {showSeason
                    ? `${race.season} ${raceWeekendLabel(race)}`
                    : raceWeekendLabel(race)}
                </span>
              </li>
            );
          })
        )}
      </ul>

      <p aria-live="polite" className="sr-only">
        {visible.length === 0
          ? 'No matches.'
          : `${visible.length} ${visible.length === 1 ? 'race' : 'races'}.`}
      </p>
    </>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup={takeover ? 'dialog' : 'listbox'}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Select race weekend, ${selectedLabel}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleTriggerKeyDown}
        className="flex h-11 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 text-left text-sm font-medium text-text transition-[color,background-color,border-color] duration-150 hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none"
      >
        <RaceWeekendFlag countryCode={selectedCode} />
        <span className="min-w-0 flex-1 truncate">
          {showSeason ? `${selected.season} ${selectedLabel}` : selectedLabel}
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && takeover ? (
        <RaceWeekendTakeover
          titleId={titleId}
          panelRef={panelRef}
          onClose={() => close(true)}
        >
          {picker}
        </RaceWeekendTakeover>
      ) : open ? (
        <div className="absolute z-30 mt-1 w-full min-w-[18rem] rounded-lg border border-border bg-surface-elevated">
          {picker}
        </div>
      ) : null}
    </div>
  );
}
