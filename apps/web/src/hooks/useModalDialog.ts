import type { RefObject } from 'react';
import { useEffect, useRef } from 'react';

import { useCallbackRef } from './useCallbackRef';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])';

/*
 * One lock for however many modals are open. A duel takeover can stack a
 * confirm dialog on top of it, and the inner one closing must not hand scrolling
 * back to a page that is still covered — so the lock is counted, and only the
 * last one out releases it.
 *
 * The lock is an attribute (styled in `styles.css`) rather than an inline
 * `body.style.overflow`, because that property is not ours alone: Clerk's
 * sign-in modal writes it directly. This used to snapshot the value it found
 * and put it back on release, which meant the sign-in curtain — which rises
 * while Clerk's modal is still up — captured Clerk's own `hidden` and restored
 * it after everything had closed, leaving the page permanently unscrollable.
 * Owning a separate attribute means the two never share a slot.
 */
const SCROLL_LOCK_ATTRIBUTE = 'data-scroll-locked';
let scrollLockCount = 0;

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    document.documentElement.setAttribute(SCROLL_LOCK_ATTRIBUTE, '');
  }
  scrollLockCount++;

  return () => {
    scrollLockCount--;
    if (scrollLockCount === 0) {
      document.documentElement.removeAttribute(SCROLL_LOCK_ATTRIBUTE);
    }
  };
}

/**
 * Just the scroll lock, for a full-screen surface that is not a dialog.
 *
 * The sign-in curtain is the case: it covers the page and makes it `inert`, so
 * it needs nothing from the focus trap or Escape, but the page behind it was
 * still scrolling under the loader. It shares the counted lock above rather
 * than setting `overflow` itself, because a sign-in started from inside a
 * takeover has both up at once and whichever leaves first must not hand
 * scrolling back to a page the other one is still covering.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }
    return lockBodyScroll();
  }, [active]);
}

/**
 * The behaviour every modal owes the keyboard and the page behind it: the page
 * stops scrolling, focus moves in and cannot Tab out, Escape closes, and focus
 * goes back where it came from.
 *
 * Returns the ref to put on the dialog panel — the trap's boundary is that
 * element, so it must be the one wrapping the modal's content, not the backdrop.
 *
 * Three components used to carry their own copy of this; a fourth and fifth had
 * none, which is what a hand-rolled convention gets you.
 */
export function useModalDialog<Panel extends HTMLElement>({
  open = true,
  onClose,
  suspended = false,
  initialFocusRef,
}: {
  /** False while the modal is unmounted or closed: nothing is locked or trapped. */
  open?: boolean;
  /** Escape and (where the caller wires it up) the backdrop. */
  onClose?: () => void;
  /**
   * Release the trap and Escape while something is stacked on top, so the two
   * modals do not fight over the same keystroke. The scroll lock stays: the
   * page underneath is still covered.
   */
  suspended?: boolean;
  /** Where focus lands on open. Defaults to the panel itself. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}): RefObject<Panel | null> {
  const panelRef = useRef<Panel>(null);
  const handleClose = useCallbackRef(onClose ?? (() => {}));

  useEffect(() => {
    if (!open) {
      return;
    }
    return lockBodyScroll();
  }, [open]);

  // Focus moves in on open and back to the trigger on close. Reading
  // `activeElement` at effect time is what makes the return trip work: by the
  // time the modal unmounts, focus is inside it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement;
    (initialFocusRef?.current ?? panelRef.current)?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open || suspended) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const candidates = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      // `offsetParent` drops anything hidden, so a collapsed section inside the
      // panel cannot swallow the Tab that should have wrapped. Where there is
      // no layout to read at all (jsdom, `display: contents`) it reports every
      // element as hidden — so an empty result falls back to the full list
      // rather than to a trap that holds nothing.
      const visible = candidates.filter(
        (element) => element.offsetParent !== null,
      );
      const focusable = visible.length > 0 ? visible : candidates;

      if (focusable.length === 0) {
        // Nothing to move to, but Tab must still not escape to the page.
        event.preventDefault();
        return;
      }

      const currentIndex = focusable.indexOf(
        document.activeElement as HTMLElement,
      );

      // Focus sitting outside the panel (the panel itself, typically) counts as
      // being before the first element, so Tab enters rather than escapes.
      if (event.shiftKey && currentIndex <= 0) {
        event.preventDefault();
        focusable.at(-1)?.focus();
      } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
        event.preventDefault();
        focusable[0]?.focus();
      } else if (currentIndex === -1) {
        event.preventDefault();
        focusable[event.shiftKey ? focusable.length - 1 : 0]?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, suspended, handleClose]);

  return panelRef;
}
