import { Suspense, lazy, useEffect, useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

const CommandPalette = lazy(() =>
  import('./CommandPalette').then((module) => ({
    default: module.CommandPalette,
  })),
);

/**
 * True while the keystroke belongs to whatever the person is typing into.
 * Without this, ⌘K inside the pick form or the feedback box would swallow the
 * keystroke and open the palette over half-finished text.
 */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT'
  );
}

/**
 * ⌘K opens the command palette. Nothing says so.
 *
 * This renders no UI at all — deliberately. An earlier version put a labelled
 * button in the header, which is the textbook answer to "a shortcut nobody can
 * discover is a shortcut nobody uses", and it was cut on purpose: the palette
 * is for the handful of people who already reach for ⌘K everywhere else, and
 * they find it by trying it. The cost of that choice is that everyone else
 * never learns it exists. That is the intended trade, not an oversight.
 *
 * Mounted for signed-out visitors too. That was worth reconsidering once the
 * button went away: the objection to a public palette was an icon competing
 * with the picks CTA on the landing page, and an easter egg competes with
 * nothing. The list itself narrows instead — see `buildCommands`.
 *
 * There is no visible affordance to keep off small screens, so the component
 * does not branch on width: a tablet with a keyboard gets the same easter egg
 * a laptop does.
 *
 * WCAG 2.1.4 (Character Key Shortcuts) does not apply — it governs single-key
 * shortcuts with no modifier, and this one needs Meta or Control.
 */
export function CommandPaletteShortcut({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  // Nothing is imported until someone reaches for a chord, so the palette's
  // chunk stays off the critical path of every page the header renders.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The modifier lands before the K. Warming the chunk here is what makes
      // the first open paint immediately instead of on a resolved import, and
      // it only ever fires for someone already pressing a shortcut.
      if (event.key === 'Meta' || event.key === 'Control') {
        setShouldLoad(true);
        return;
      }

      if (event.key !== 'k' || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      // While the palette is open the chord always closes it, even though the
      // event target is the palette's own input — the typing guard exists to
      // protect text the person is writing, and there is none here.
      if (open) {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (isTypingTarget(event.target)) {
        return;
      }
      event.preventDefault();
      setShouldLoad(true);
      setOpen(true);
      captureAnalyticsEvent('command_palette_opened', {
        source: 'shortcut',
        signed_in: signedIn,
      });
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, signedIn]);

  if (!shouldLoad) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CommandPalette
        open={open}
        onClose={() => setOpen(false)}
        signedIn={signedIn}
      />
    </Suspense>
  );
}
