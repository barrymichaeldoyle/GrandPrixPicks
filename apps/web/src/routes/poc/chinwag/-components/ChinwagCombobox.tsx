import { useEffect, useId, useRef, useState } from 'react';

import { Flag } from '@/components/Flag';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

export type ComboboxOption = {
  /** Team name, used for the colour bar and as a search term. */
  team: string | null;
  /** ISO 3166-1 alpha-2, when the option is a driver. */
  nationality?: string | null;
  /** Racing number, when the option is a driver. */
  number?: number | null;
  /** Three-letter code, when the option is a driver. This is what people type. */
  code?: string | null;
  label: string;
  value: string;
};

type ChinwagComboboxProps = {
  /**
   * Must match the `htmlFor` of the `<label>` that wraps the category artwork:
   * that label's text alternative (the image's `alt`) is this control's
   * accessible name. Deliberately no `aria-label` here — it would override the
   * label and say the same words twice.
   */
  id: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  value: string | undefined;
};

/**
 * Strips accents so "perez" finds "Pérez" and "hulkenberg" finds "Hülkenberg".
 *
 * Not a nicety on this grid in particular: two of the twenty-two drivers carry
 * a diacritic, and both are names a fan types from memory rather than copies.
 */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function matchesQuery(option: ComboboxOption, query: string): boolean {
  if (!query) {
    return true;
  }
  const q = fold(query);
  return (
    fold(option.label).includes(q) ||
    fold(option.code ?? '').startsWith(q) ||
    fold(option.team ?? '').includes(q)
  );
}

/**
 * A type-to-filter picker, in place of the native `<select>` his form uses.
 *
 * Twenty-two drivers in an unlabelled dropdown is a scroll-and-hunt on a phone,
 * and the grid is the one list an F1 audience already knows by sight: the team
 * colour, the code and the flag identify a driver faster than the name does.
 * Typing three letters beats all of it.
 *
 * Built as a real combobox rather than a styled div: `role="combobox"` with
 * `aria-activedescendant`, arrow keys, Enter to commit, Escape to revert, and
 * the input reverting to the committed label on blur so a half-typed query
 * never survives as an answer.
 *
 * The one thing it costs is the phone's native select wheel, which some people
 * prefer. Options are kept at a 44px touch target and the list scrolls, so the
 * fallback behaviour is "scroll a list", which is what the native control was
 * doing anyway.
 */
export function ChinwagCombobox({
  id,
  onChange,
  options,
  value,
}: ChinwagComboboxProps) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;
  // No useMemo: the React Compiler handles this, and the lint rule that caught
  // the manual version is right — 22 options is not a workload.
  const visible = options.filter((option) => matchesQuery(option, query));

  // Close when the pointer goes anywhere else. `mousedown` rather than `click`
  // so a click that lands on another control does not first re-open this one.
  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Keep the active option in view as the arrows move it.
  useEffect(() => {
    if (!open) {
      return;
    }
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => {
        if (visible.length === 0) {
          return 0;
        }
        return (current + step + visible.length) % visible.length;
      });
      return;
    }

    if (event.key === 'Enter' && open) {
      const option = visible[activeIndex];
      if (option) {
        event.preventDefault();
        commit(option);
      }
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
      return;
    }

    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(Math.max(0, visible.length - 1));
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <input
        aria-activedescendant={
          open && visible[activeIndex]
            ? `${listboxId}-${visible[activeIndex].value}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        autoComplete="off"
        className="h-12 w-full rounded border border-[var(--chinwag-border)] bg-[var(--chinwag-card)] px-3 text-[var(--chinwag-ink)] placeholder:text-[var(--chinwag-ink-muted)] focus:border-[var(--chinwag-coral)] focus:outline-none"
        id={id}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={(event) => {
          setOpen(true);
          setActiveIndex(0);
          event.target.select();
        }}
        onKeyDown={onKeyDown}
        /*
         * Losing focus closes the list, which is the WAI-ARIA combobox
         * behaviour for Tab and the reason this exists: without it, tabbing
         * from one category to the next left every listbox behind it open, so
         * six popups could be on screen at once and `aria-expanded` lied about
         * five of them.
         *
         * Safe against clicking an option, because the option's `mousedown`
         * calls `preventDefault()` and the input never blurs.
         *
         * The query is dropped rather than committed: a half-typed string is
         * not an answer, so whatever was already chosen wins back.
         */
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        placeholder="Choose"
        role="combobox"
        type="text"
        value={open ? query : (selected?.label ?? '')}
      />

      {open ? (
        <ul
          className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded border border-[var(--chinwag-border)] bg-[var(--chinwag-card)] py-1"
          id={listboxId}
          ref={listRef}
          role="listbox"
        >
          {visible.length === 0 ? (
            <li className="px-3 py-3 text-sm text-[var(--chinwag-ink-muted)]">
              Nobody by that name.
            </li>
          ) : (
            visible.map((option, index) => (
              <li
                aria-selected={option.value === value}
                className={`flex h-11 cursor-pointer items-center gap-3 px-3 ${
                  index === activeIndex ? 'bg-[var(--chinwag-page)]' : ''
                }`}
                data-active={index === activeIndex}
                id={`${listboxId}-${option.value}`}
                key={option.value}
                // `mousedown`, because the input's blur would otherwise close
                // the list before a click could land on it.
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                role="option"
              >
                <span
                  aria-hidden
                  className="h-6 w-[3px] shrink-0 rounded-full"
                  style={{
                    background:
                      TEAM_COLORS[option.team ?? ''] ?? FALLBACK_TEAM_COLOR,
                  }}
                />
                {option.code ? (
                  <span className="w-9 shrink-0 font-mono text-sm font-medium text-[var(--chinwag-ink)]">
                    {option.code}
                  </span>
                ) : null}
                {option.nationality ? (
                  <Flag
                    className="[outline-color:rgba(48,48,48,0.18)]"
                    code={option.nationality}
                    size="xs"
                  />
                ) : null}
                <span className="truncate text-sm text-[var(--chinwag-ink)]">
                  {option.label}
                </span>
                {option.code && option.team ? (
                  <span className="ml-auto shrink-0 truncate text-xs text-[var(--chinwag-ink-muted)]">
                    {option.team}
                  </span>
                ) : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
