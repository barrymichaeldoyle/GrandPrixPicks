import { ChevronDown, X } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { Doc, Id } from '../../convex/_generated/dataModel';

type Driver = Doc<'drivers'>;

type DriverSearchSelectProps = {
  drivers: Array<Driver>;
  value: Id<'drivers'> | null;
  /** Drivers already selected in other positions (excluded from options unless they're the current value) */
  excludedIds: Array<Id<'drivers'>>;
  onChange: (driverId: Id<'drivers'> | null) => void;
  /** Optional; when omitted (e.g. in a lane with its own position label) the position badge is not shown */
  positionLabel?: string;
  placeholder?: string;
  disabled?: boolean;
};

function matchDriver(driver: Driver, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = driver.displayName.toLowerCase();
  const code = driver.code.toLowerCase();
  const family = (driver.familyName ?? '').toLowerCase();
  const given = (driver.givenName ?? '').toLowerCase();
  return (
    name.includes(q) ||
    code.includes(q) ||
    family.includes(q) ||
    given.includes(q)
  );
}

export function DriverSearchSelect({
  drivers,
  value,
  excludedIds,
  onChange,
  positionLabel,
  placeholder = 'Search driver…',
  disabled = false,
}: DriverSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const fallbackId = useId();
  const listId =
    positionLabel != null ? `${positionLabel}-list` : `${fallbackId}-list`;
  const ariaLabel =
    positionLabel != null
      ? `Select driver for ${positionLabel}`
      : 'Select driver';

  const selectedDriver = value ? drivers.find((d) => d._id === value) : null;

  const options = useMemo(() => {
    const available = drivers.filter(
      (d) => !excludedIds.includes(d._id) || d._id === value,
    );
    if (!query.trim()) return available;
    return available.filter((d) => matchDriver(d, query));
  }, [drivers, excludedIds, value, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlightIndex(0);
  }, []);

  // Sync highlight when options change
  useEffect(() => {
    setHighlightIndex((i) => Math.min(i, Math.max(0, options.length - 1)));
  }, [options.length]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        inputRef.current?.blur();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && options[highlightIndex]) {
        e.preventDefault();
        onChange(options[highlightIndex]._id);
        close();
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, options, highlightIndex, onChange, close]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || !listRef.current) {
      return;
    }
    const el = listRef.current.children[highlightIndex] as
      | HTMLElement
      | undefined;
    if (!el) {
      return;
    }
    el.scrollIntoView({ block: 'nearest' });
  }, [open, highlightIndex]);

  const handleSelect = (driverId: Id<'drivers'>) => {
    onChange(driverId);
    close();
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 rounded-lg border bg-slate-800/50 transition-colors ${
          open
            ? 'border-yellow-500/60 ring-1 ring-yellow-500/30'
            : 'border-slate-600 hover:border-slate-500'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        {positionLabel != null && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-sm font-bold text-yellow-400">
            {positionLabel}
          </span>
        )}
        {selectedDriver ? (
          <>
            <div className="min-w-0 flex-1 truncate font-medium text-white">
              {selectedDriver.displayName}
            </div>
            <span className="shrink-0 text-sm text-slate-500">
              {selectedDriver.code}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                aria-label="Change driver"
              >
                <ChevronDown size={18} />
              </button>
            )}
          </>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setHighlightIndex(0);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className="min-w-0 flex-1 bg-transparent py-2 pr-2 pl-0 text-white placeholder-slate-500 focus:outline-none"
              aria-label={ariaLabel}
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
            />
            <ChevronDown
              size={18}
              className="shrink-0 text-slate-500"
              aria-hidden
            />
          </>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
          {selectedDriver && (
            <div className="border-b border-slate-600 px-2 py-2">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightIndex(0);
                }}
                placeholder="Type to filter…"
                className="w-full rounded border border-slate-600 bg-slate-700/80 px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:border-yellow-500/50 focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            className="max-h-56 overflow-auto py-1"
          >
            {options.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">
                No matching drivers
              </li>
            ) : (
              options.map((driver, i) => (
                <li
                  key={driver._id}
                  role="option"
                  aria-selected={driver._id === value}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    i === highlightIndex
                      ? 'bg-yellow-500/20 text-white'
                      : 'text-slate-300 hover:bg-slate-700'
                  } ${driver._id === value ? 'font-medium' : ''}`}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => handleSelect(driver._id)}
                >
                  <span className="font-medium">{driver.displayName}</span>
                  <span className="ml-2 text-slate-500">{driver.code}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
