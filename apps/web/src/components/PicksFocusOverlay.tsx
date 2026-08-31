import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useEffectEvent } from 'react';
import { createPortal } from 'react-dom';

import { useModalDialog } from '@/hooks/useModalDialog';

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
  /**
   * Let the body stretch to the takeover's full height instead of stacking from
   * the top. Long forms want the default (scroll from the top); a single
   * question does not, because on a phone it leaves two thirds of the screen
   * empty under it. Only affects the mobile takeover — the desktop modal is
   * already sized to its content.
   */
  fillBody?: boolean;
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
  fillBody = false,
  children,
}: PicksFocusOverlayProps) {
  const reduceMotion = useReducedMotion();
  const closeFromHistory = useEffectEvent(() => {
    if (!suspended) {
      onClose();
    }
  });

  // Scroll lock, focus trap, Escape and focus restore. `suspended` releases the
  // trap and Escape (not the lock) so a stacked confirm dialog owns them.
  const panelRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    suspended,
  });

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
      closeFromHistory();
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

  // Portalling needs a document, and an overlay is never open during SSR.
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    // The takeover used to vanish: `open` went false and the portal returned
    // null on the same frame, so a decision that had just been made ended in a
    // blink. It leaves now — the surface settles back and fades — which is
    // what makes the close read as the end of the flow rather than a glitch.
    // `AnimatePresence` is what holds it mounted long enough to do that.
    <AnimatePresence>
      {open ? (
        <m.div
          key="picks-focus-overlay"
          data-testid="picks-focus-overlay"
          className="fixed inset-0 z-50 flex bg-page sm:items-center sm:justify-center sm:bg-black/60 sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !suspended) {
              onClose();
            }
          }}
        >
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="picks-focus-title"
            tabIndex={-1}
            className="flex h-full w-full flex-col bg-page outline-none sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border"
            // One gesture that works at both sizes: a small rise on the way in
            // and a settle back on the way out. The panel is the whole screen
            // on a phone, where anything larger reads as the page itself
            // moving, and a modest scale is all a desktop dialog needs.
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.99 }
            }
            transition={{
              duration: reduceMotion ? 0 : 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
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
                    <p className="truncate text-xs text-text-muted">
                      {subtitle}
                    </p>
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
            <div
              className={`min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-0 sm:px-6 sm:py-5 ${
                fillBody ? 'flex flex-col sm:block' : ''
              }`}
            >
              {children}
            </div>
          </m.div>
        </m.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
