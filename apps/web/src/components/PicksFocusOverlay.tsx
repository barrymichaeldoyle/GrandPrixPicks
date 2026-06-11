import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

/** Sentinel key marking the history entry pushed while the overlay is open. */
const HISTORY_KEY = 'picksFocusOverlay';

interface PicksFocusOverlayProps {
  open: boolean;
  /** Called when the user asks to leave (close button, Escape, backdrop, Back). */
  onClose: () => void;
  /** While true the overlay ignores Escape/backdrop/Back and releases its
      focus trap — set this when a confirm dialog is stacked on top so the
      two don't fight over the same events. */
  suspended?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}

/**
 * Focused picks experience: a full-screen takeover on mobile and a centered
 * modal on desktop. The body is the scroll container, padded px-3 py-4 on
 * mobile so the H2H form's sticky submit bar (-mx-3 -mb-4) sits flush.
 */
export function PicksFocusOverlay({
  open,
  onClose,
  suspended = false,
  title,
  subtitle,
  children,
}: PicksFocusOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;

  // Focus the panel on open; hand focus back to the trigger on close.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Make browser/hardware Back close the overlay instead of leaving the page
  // (it's a full-screen takeover on mobile, where Back is the natural close
  // gesture). We push a same-URL sentinel entry on open; popping it asks to
  // close. The handler re-pushes the sentinel before asking so that if the
  // close is declined (unsaved-changes confirm), Back still works next time;
  // when the overlay does close, the cleanup consumes the sentinel.
  useEffect(() => {
    if (!open) {
      return;
    }
    window.history.pushState(
      { ...window.history.state, [HISTORY_KEY]: true },
      '',
    );
    function handlePopState() {
      window.history.pushState(
        { ...window.history.state, [HISTORY_KEY]: true },
        '',
      );
      if (!suspendedRef.current) {
        onCloseRef.current();
      }
    }
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.[HISTORY_KEY]) {
        // Consume our sentinel. The resulting popstate is bookkeeping, not a
        // user Back — swallow it so a chained overlay (Top 5 save → H2H) that
        // mounted in the meantime doesn't treat it as a close request.
        function swallowOwnPop(e: PopStateEvent) {
          window.removeEventListener('popstate', swallowOwnPop);
          e.stopImmediatePropagation();
        }
        window.addEventListener('popstate', swallowOwnPop);
        window.history.back();
      }
    };
  }, [open]);

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);

      if (focusable.length === 0) {
        return;
      }

      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement,
      );

      if (e.shiftKey && currentIndex <= 0) {
        e.preventDefault();
        focusable[focusable.length - 1]?.focus();
      } else if (!e.shiftKey && currentIndex === focusable.length - 1) {
        e.preventDefault();
        focusable[0]?.focus();
      }
    }
  }

  useEffect(() => {
    if (open && !suspended) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, suspended, handleKeyDown]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      data-testid="picks-focus-overlay"
      className="fixed inset-0 z-50 flex bg-page sm:items-center sm:justify-center sm:bg-black/60 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !suspended) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picks-focus-title"
        tabIndex={-1}
        className="flex h-full w-full flex-col bg-page outline-none sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="min-w-0">
              <h2
                id="picks-focus-title"
                className="truncate text-lg font-semibold text-text"
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="truncate text-xs text-text-muted">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-testid="picks-focus-close"
            className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
          >
            <X size={20} aria-hidden />
          </button>
        </header>
        {/* No bottom padding on mobile: a sticky bottom bar (H2H submit) can't
            enter the scroll container's padding, so padding would leave a gap
            under it. Content without its own bar should bring pb-4 sm:pb-0. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-0 sm:px-6 sm:py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
