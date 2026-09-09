import { api } from '@convex-generated/api';
import { useNavigate } from '@tanstack/react-router';
import type { KeyboardEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';
import type { PaletteCommand } from './commands';
import { buildCommands, filterCommands, groupCommands } from './commands';

const LISTBOX_ID = 'command-palette-results';

function optionId(command: PaletteCommand) {
  return `command-palette-option-${command.id}`;
}

/**
 * Keyboard navigation for the signed-in app: one dialog, one input, a filtered
 * list of destinations.
 *
 * Built as a combobox rather than a list of links, and the distinction is load
 * bearing. Focus never leaves the input — arrow keys move
 * `aria-activedescendant` and nothing else — so the results must not be
 * focusable. That is why each row is a `div` navigated through the router on
 * Enter, and not an `<a>` or a `<button>`: `useModalDialog`'s focus trap
 * selects both, which would put every result in the Tab cycle and desync real
 * focus from the option the palette believes is active.
 *
 * Mounted only while open (the trigger lazy-loads it), so the race query fires
 * on first open rather than on every page the header renders.
 */
export function CommandPalette({
  open,
  onClose,
  signedIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Decides which destinations are offered. See `buildCommands`. */
  signedIn: boolean;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: inputRef,
  });

  const nextRace = useQuery(api.races.getNextRace);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const sections = groupCommands(
    filterCommands(buildCommands(nextRace, { signedIn }), query),
  );

  // Grouping reorders the ranked list, so the flat order the keyboard walks is
  // derived from the sections rather than from the ranked list they came from.
  // Otherwise Enter opens a different row than the one highlighted.
  const visibleCommands = sections.flatMap((section) => section.commands);

  const activeCommand = visibleCommands[activeIndex] ?? null;

  // The highlight is not focus, so nothing scrolls it into view on its own.
  useEffect(() => {
    if (!activeCommand) {
      return;
    }
    const element = panelRef.current?.querySelector(
      `#${CSS.escape(optionId(activeCommand))}`,
    );
    // Feature-detected rather than assumed: jsdom does not implement it, and
    // scrolling the highlight into view is a nicety the palette works without.
    element?.scrollIntoView?.({ block: 'nearest' });
  }, [activeCommand, panelRef]);

  if (!open) {
    return null;
  }

  function runCommand(command: PaletteCommand) {
    captureAnalyticsEvent('command_palette_command_run', {
      command_id: command.id,
      query_length: query.trim().length,
    });
    // Close first: it restores focus to the trigger, which is the right place
    // for it to land when the new route paints.
    onClose();
    void navigate({ to: command.href });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (visibleCommands.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % visibleCommands.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(
        (index) =>
          (index - 1 + visibleCommands.length) % visibleCommands.length,
      );
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(visibleCommands.length - 1);
      return;
    }

    if (event.key === 'Enter' && activeCommand) {
      event.preventDefault();
      runCommand(activeCommand);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        tabIndex={-1}
        className="flex max-h-[70vh] w-full max-w-lg flex-col rounded-sm border border-border bg-surface outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <label htmlFor="command-palette-input" className="sr-only">
          Search pages and actions
        </label>
        <input
          id="command-palette-input"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded
          aria-controls={LISTBOX_ID}
          aria-activedescendant={
            activeCommand ? optionId(activeCommand) : undefined
          }
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            // A new query is a new list, so the highlight goes back to the best
            // match — reset here rather than in an effect, so the render that
            // shows the new results already shows the right row highlighted.
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="shrink-0 border-b border-border bg-transparent px-4 py-3 text-sm text-text placeholder:text-text-muted focus:outline-none"
        />

        <div id={LISTBOX_ID} role="listbox" className="min-h-0 overflow-y-auto">
          {visibleCommands.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">
              No matches.
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.group} role="group" aria-label={section.group}>
                <p
                  aria-hidden
                  className="px-4 pt-3 pb-1 text-[10px] font-medium tracking-label text-text-muted uppercase"
                >
                  {section.group}
                </p>
                {section.commands.map((command) => {
                  const isActive = command.id === activeCommand?.id;
                  return (
                    <div
                      key={command.id}
                      id={optionId(command)}
                      role="option"
                      aria-selected={isActive}
                      // Focusable to the API, never to Tab: `useModalDialog`'s
                      // trap selector excludes `tabindex="-1"`, which is what
                      // keeps real focus on the input while the highlight moves.
                      tabIndex={-1}
                      onClick={() => runCommand(command)}
                      onMouseMove={() =>
                        setActiveIndex(visibleCommands.indexOf(command))
                      }
                      className={`cursor-pointer px-4 py-2 text-sm ${
                        isActive
                          ? 'bg-surface-muted text-text'
                          : 'text-text-muted'
                      }`}
                    >
                      {command.label}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* The list is not focusable, so a screen reader hears the count from
            here rather than from the options moving under it. */}
        <p aria-live="polite" className="sr-only">
          {visibleCommands.length === 0
            ? 'No matches.'
            : `${visibleCommands.length} ${
                visibleCommands.length === 1 ? 'result' : 'results'
              }.`}
        </p>

        <p
          aria-hidden
          className="shrink-0 border-t border-border px-4 py-2 text-[11px] text-text-muted"
        >
          <kbd className="font-sans">↑↓</kbd> move{' '}
          <kbd className="ml-2 font-sans">↵</kbd> open{' '}
          <kbd className="ml-2 font-sans">esc</kbd> close
        </p>
      </div>
    </div>,
    document.body,
  );
}
