import { act, useEffect } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useViewerSession } from './useViewerSession';
import {
  deriveViewerSession,
  ViewerSessionProvider,
} from './viewer-session-context';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Controllable auth sources.
const auth: { isLoaded: boolean; isSignedIn: boolean | undefined } = {
  isLoaded: false,
  isSignedIn: undefined,
};
const initialAuth: { isSignedIn: boolean } = { isSignedIn: false };
/** Browser SDK readiness, independent of the SSR-derived useAuth result. */
let clientLoaded = true;

let result: ReturnType<typeof useViewerSession>;

function Probe() {
  const value = useViewerSession();
  useEffect(() => {
    result = value;
  }, [value]);
  return null;
}

describe('useViewerSession', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
    clientLoaded = true;
  });
  afterEach(() => {
    act(() => root.unmount());
  });

  function render() {
    // Goes through the same helper the provider uses, so these tests cannot
    // drift from the real derivation.
    const session = deriveViewerSession({
      isLoaded: auth.isLoaded,
      clientSignedIn: auth.isSignedIn,
      initialSignedIn: initialAuth.isSignedIn,
      clientLoaded,
    });
    act(() =>
      root.render(
        <ViewerSessionProvider value={session}>
          <Probe />
        </ViewerSessionProvider>,
      ),
    );
    return result;
  }

  it('is signed-in from SSR before Clerk boots (avatar placeholder, not confirmed)', () => {
    initialAuth.isSignedIn = true;
    auth.isLoaded = false;
    auth.isSignedIn = undefined;
    expect(render()).toEqual({
      isLoaded: false,
      isSignedIn: true,
      confirmedSignedIn: false,
    });
  });

  it('does NOT downgrade to signed-out during Clerk’s mid-boot transient', () => {
    // The regression: initialAuth says signed-in, but Clerk momentarily reports
    // isLoaded=true + isSignedIn=false. isSignedIn must stay true (no flash).
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = false;
    clientLoaded = false;
    expect(render()).toEqual({
      isLoaded: false,
      isSignedIn: true,
      confirmedSignedIn: false,
    });
  });

  it('drops a stale SSR session when the browser finishes signed out', () => {
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = false;
    clientLoaded = false;
    expect(render().isSignedIn).toBe(true);

    clientLoaded = true;
    expect(render()).toEqual({
      isLoaded: true,
      isSignedIn: false,
      confirmedSignedIn: false,
    });
  });

  it('confirms the session once Clerk resolves signed-in', () => {
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = true;
    expect(render()).toEqual({
      isLoaded: true,
      isSignedIn: true,
      confirmedSignedIn: true,
    });
  });

  it('stays signed-out for an anonymous visitor', () => {
    initialAuth.isSignedIn = false;
    auth.isLoaded = false;
    auth.isSignedIn = undefined;
    expect(render()).toEqual({
      isLoaded: false,
      isSignedIn: false,
      confirmedSignedIn: false,
    });

    auth.isLoaded = true;
    auth.isSignedIn = false;
    expect(render()).toEqual({
      isLoaded: true,
      isSignedIn: false,
      confirmedSignedIn: false,
    });
  });

  it('goes signed-out after a real sign-out (no stuck avatar placeholder)', () => {
    // Regression: initialAuth is captured at SSR and never changes, so the old
    // `initialAuth.isSignedIn || confirmedSignedIn` kept isSignedIn true after
    // sign-out and HeaderUser rendered its loading pulse forever.
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = true;
    expect(render().confirmedSignedIn).toBe(true);

    auth.isSignedIn = false;
    expect(render()).toEqual({
      isLoaded: true,
      isSignedIn: false,
      confirmedSignedIn: false,
    });
  });

  it('upgrades to signed-in when an anonymous visitor signs in', () => {
    initialAuth.isSignedIn = false;
    auth.isLoaded = true;
    auth.isSignedIn = true;
    expect(render()).toEqual({
      isLoaded: true,
      isSignedIn: true,
      confirmedSignedIn: true,
    });
  });
});
