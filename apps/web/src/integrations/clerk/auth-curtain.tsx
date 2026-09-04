import * as Sentry from '@sentry/tanstackstart-react';
import { Loader2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { errorDiagnosticTags } from '@/components/error/diagnostics';
import { useBodyScrollLock } from '@/hooks/useModalDialog';

import {
  AUTH_HANDOFF_ATTRIBUTE,
  PRE_PAINT_TIMEOUT_GLOBAL,
} from './pre-paint-curtain';
import { useViewerSession } from './useViewerSession';

/**
 * A hard ceiling on how long the curtain may stay up. Clerk failing to confirm
 * a session, a Convex query that never resolves, or a gate whose owner never
 * reports ready must all end with the app on screen rather than a spinner the
 * visitor cannot dismiss. Partial content beats a stuck loader.
 */
const CURTAIN_TIMEOUT_MS = 8_000;

/**
 * Report a curtain that ran out of time.
 *
 * The ceiling exists so a visitor is never stranded behind a spinner, and that
 * is exactly why it hides the bugs it catches. A signed-out visitor spent two
 * weeks getting "Signing you in" over a dashboard whose queries could never
 * resolve, and the only reason it was ever found is that somebody happened to
 * open the site and say so. The loader did its job; nothing told us it had had
 * to.
 *
 * This fires only when the ceiling is reached, which is only ever a bug — every
 * healthy handoff resolves in well under eight seconds — so it is a signal with
 * no steady-state noise, not a metric.
 *
 * `waitingFor` is the whole diagnosis. `clerk` means Clerk never confirmed a
 * session we were told existed (a stale cookie, a dead session, a failed boot);
 * `gates` means Clerk confirmed but a route never reported its content ready
 * (a Convex read that never resolved, a gate whose owner unmounted holding it).
 * They are different bugs in different files.
 */
function reportCurtainTimeout({
  label,
  confirmedSignedIn,
  pendingGates,
}: {
  label: string;
  confirmedSignedIn: boolean;
  pendingGates: number;
}) {
  try {
    Sentry.captureMessage('Auth curtain timed out', {
      level: 'error',
      tags: {
        ...errorDiagnosticTags(),
        curtain_waiting_for: confirmedSignedIn ? 'gates' : 'clerk',
      },
      extra: { label, confirmedSignedIn, pendingGates },
    });
  } catch {
    // A report is never worth taking the page down for, least of all on the
    // path that exists to rescue a page that is already struggling.
  }
}

/**
 * Send the pre-paint script's own timeout, if it fired.
 *
 * Separate from {@link reportCurtainTimeout} because it is a separate failure:
 * that one means the app booted and could not finish the handoff, this one
 * means the app did not boot in time to try. Reported once per document, from
 * whichever code does eventually run.
 */
export function reportPrePaintCurtainTimeout() {
  if (typeof window === 'undefined') {
    return;
  }
  const marked = window as unknown as Record<string, unknown>;
  if (!marked[PRE_PAINT_TIMEOUT_GLOBAL]) {
    return;
  }
  delete marked[PRE_PAINT_TIMEOUT_GLOBAL];

  try {
    Sentry.captureMessage('Pre-paint auth curtain timed out', {
      level: 'error',
      tags: {
        ...errorDiagnosticTags(),
        curtain_waiting_for: 'boot',
      },
    });
  } catch {
    // Same reasoning as the React curtain: never throw from the rescue path.
  }
}

type AuthCurtain = {
  /** The handoff is in progress: page content must stay hidden and inert. */
  active: boolean;
  /**
   * Hold the curtain up. Returns the release. Callers use
   * {@link useAuthCurtainGate} rather than this directly.
   */
  registerGate: () => () => void;
};

const AuthCurtainContext = createContext<AuthCurtain>({
  active: false,
  registerGate: () => () => undefined,
});

export function useAuthCurtain() {
  return useContext(AuthCurtainContext);
}

/**
 * Keeps the sign-in curtain up until this component's own content is real.
 *
 * Clerk confirming a session only means the *shell* is ready. The page behind
 * it still has a lazy chunk to fetch and its first Convex reads to await, and
 * those render placeholder identity ("Your race weekend" before "Welcome back,
 * Barry"). A gate lets the route say "not yet" so the curtain lifts onto
 * finished content instead of onto a guess.
 *
 * Outside a handoff this is inert: no curtain exists, so nothing is held.
 */
export function useAuthCurtainGate(ready: boolean) {
  const { registerGate } = useAuthCurtain();

  useEffect(() => {
    if (ready) {
      return;
    }
    return registerGate();
  }, [ready, registerGate]);
}

/**
 * Owns the curtain for one mount of the app runtime.
 *
 * Rendered inside the runtime so it can read `confirmedSignedIn` from the
 * viewer session, and as a sibling of the page rather than a wrapper around it:
 * the page must keep mounting and fetching underneath, otherwise its gates
 * could never resolve.
 *
 * `handoff` is only ever true as the result of a client-side sign-in signal, so
 * an anonymous visit (every crawler included) renders exactly what it did
 * before this existed.
 */
export function AuthCurtainHost({
  handoff,
  label,
  children,
}: PropsWithChildren<{
  handoff: boolean;
  /**
   * What the visitor is actually waiting for. A sign-in and a resumed tab both
   * end at the same assembled dashboard, but only one of them is signing
   * anybody in, and telling a returning player they are being signed in is a
   * small lie they can feel.
   */
  label: string;
}>) {
  const { confirmedSignedIn } = useViewerSession();
  const [pendingGates, setPendingGates] = useState(0);
  const [expired, setExpired] = useState(false);

  // Stable by construction rather than by memo hook: React Compiler only runs
  // on production builds here, and a `registerGate` whose identity changed each
  // render would re-run every gate's effect each render, incrementing and
  // decrementing the count forever in dev. It closes over nothing but the
  // setter, so a ref is the honest way to say "this never changes".
  const [registerGate] = useState(() => () => {
    setPendingGates((count) => count + 1);
    return () => setPendingGates((count) => count - 1);
  });

  const active =
    handoff && !expired && (!confirmedSignedIn || pendingGates > 0);

  // What the curtain was still waiting for, for the timeout report. A ref so
  // reading it cannot restart the timeout that reads it.
  const stateRef = useRef({ confirmedSignedIn, pendingGates });
  stateRef.current = { confirmedSignedIn, pendingGates };

  useEffect(() => {
    if (!active) {
      // Hands the pre-paint curtain over. It covered the window this component
      // did not exist for, and clearing the attribute here rather than on mount
      // is what makes the two one continuous loader: the document stays hidden
      // by CSS until React's own curtain has finished with it.
      document.documentElement.removeAttribute(AUTH_HANDOFF_ATTRIBUTE);
      return;
    }
    const timer = window.setTimeout(() => {
      setExpired(true);
      // Read through the ref rather than the closure: listing these in the
      // dependency array would restart the eight seconds every time a gate
      // registered or released, so a page that flaps a gate would never reach
      // the ceiling at all — which is the one thing the ceiling exists for.
      reportCurtainTimeout({ label, ...stateRef.current });
    }, CURTAIN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [active, label]);

  return (
    <AuthCurtainContext.Provider value={{ active, registerGate }}>
      {active ? <SigningInCurtain label={label} /> : null}
      {children}
    </AuthCurtainContext.Provider>
  );
}

/**
 * The curtain itself.
 *
 * `role="status"` + `aria-live="polite"` announces the wait once; the shell
 * behind it carries `inert` (see `AppShell` in `__root.tsx`) so assistive tech
 * and the tab order never reach the content this is covering.
 *
 * `inert` does not stop a wheel or a swipe, though, so the page kept scrolling
 * under the loader: the curtain is opaque and fixed, so what moved behind it
 * was invisible, and the handoff ended on a page scrolled somewhere the visitor
 * never chose. The lock is the same counted one the modals use.
 *
 * `z-[152]` is relative to the pre-paint curtain, which stays up until this one
 * resolves (see the effect above) and draws its spinner at z-151. Anything
 * lower left that spinner visible on top of this curtain — whose own spinner
 * sits ~1rem higher because of the label below it — so a redirect sign-in
 * showed two loaders side by side. Above 151, this curtain covers it whole.
 */
function SigningInCurtain({ label }: { label: string }) {
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-[152] flex flex-col items-center justify-center gap-4 bg-page"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-accent motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
        {label}
      </p>
    </div>
  );
}
