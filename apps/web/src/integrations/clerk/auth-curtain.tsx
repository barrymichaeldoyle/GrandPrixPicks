import { Loader2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { useBodyScrollLock } from '@/hooks/useModalDialog';

import { useViewerSession } from './useViewerSession';

/**
 * A hard ceiling on how long the curtain may stay up. Clerk failing to confirm
 * a session, a Convex query that never resolves, or a gate whose owner never
 * reports ready must all end with the app on screen rather than a spinner the
 * visitor cannot dismiss. Partial content beats a stuck loader.
 */
const CURTAIN_TIMEOUT_MS = 8_000;

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
  children,
}: PropsWithChildren<{ handoff: boolean }>) {
  const { confirmedSignedIn } = useViewerSession();
  const [pendingGates, setPendingGates] = useState(0);
  const [expired, setExpired] = useState(false);

  // Stable by construction rather than by memo hook: React Compiler only runs
  // on production builds here, and a `registerGate` whose identity changed each
  // render would re-run every gate's effect each render, incrementing and
  // decrementing the count forever in dev. It closes over nothing but the
  // setter, so a ref is the honest way to say "this never changes".
  const registerGate = useRef(() => {
    setPendingGates((count) => count + 1);
    return () => setPendingGates((count) => count - 1);
  }).current;

  const active =
    handoff && !expired && (!confirmedSignedIn || pendingGates > 0);

  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setTimeout(() => setExpired(true), CURTAIN_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  return (
    <AuthCurtainContext.Provider value={{ active, registerGate }}>
      {active ? <SigningInCurtain /> : null}
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
 */
function SigningInCurtain() {
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-4 bg-page"
      role="status"
      aria-live="polite"
    >
      <Loader2
        className="h-8 w-8 animate-spin text-accent motion-reduce:animate-none"
        aria-hidden
      />
      <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
        Signing you in
      </p>
    </div>
  );
}
