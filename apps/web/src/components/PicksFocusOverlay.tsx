import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

interface PicksFocusOverlayProps {
  open: boolean;
  /** Called when the user asks to leave (close button, Escape, backdrop). */
  onClose: () => void;
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
  title,
  subtitle,
  children,
}: PicksFocusOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
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
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      data-testid="picks-focus-overlay"
      className="fixed inset-0 z-50 flex bg-page sm:items-center sm:justify-center sm:bg-black/60 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
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
