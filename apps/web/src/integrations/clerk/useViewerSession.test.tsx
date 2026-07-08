import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useViewerSession } from './useViewerSession';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// Controllable auth sources.
const auth: { isLoaded: boolean; isSignedIn: boolean | undefined } = {
  isLoaded: false,
  isSignedIn: undefined,
};
const initialAuth: { isSignedIn: boolean } = { isSignedIn: false };

vi.mock('@clerk/react', () => ({
  useAuth: () => auth,
}));

vi.mock('./initial-auth', () => ({
  useInitialAuth: () => initialAuth,
}));

let result: ReturnType<typeof useViewerSession>;

function Probe() {
  result = useViewerSession();
  return null;
}

describe('useViewerSession', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
  });

  function render() {
    act(() => root.render(<Probe />));
    return result;
  }

  it('is signed-in from SSR before Clerk boots (avatar placeholder, not confirmed)', () => {
    initialAuth.isSignedIn = true;
    auth.isLoaded = false;
    auth.isSignedIn = undefined;
    expect(render()).toEqual({ isSignedIn: true, confirmedSignedIn: false });
  });

  it('does NOT downgrade to signed-out during Clerk’s mid-boot transient', () => {
    // The regression: initialAuth says signed-in, but Clerk momentarily reports
    // isLoaded=true + isSignedIn=false. isSignedIn must stay true (no flash).
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = false;
    expect(render()).toEqual({ isSignedIn: true, confirmedSignedIn: false });
  });

  it('confirms the session once Clerk resolves signed-in', () => {
    initialAuth.isSignedIn = true;
    auth.isLoaded = true;
    auth.isSignedIn = true;
    expect(render()).toEqual({ isSignedIn: true, confirmedSignedIn: true });
  });

  it('stays signed-out for an anonymous visitor', () => {
    initialAuth.isSignedIn = false;
    auth.isLoaded = false;
    auth.isSignedIn = undefined;
    expect(render()).toEqual({ isSignedIn: false, confirmedSignedIn: false });

    auth.isLoaded = true;
    auth.isSignedIn = false;
    expect(render()).toEqual({ isSignedIn: false, confirmedSignedIn: false });
  });

  it('upgrades to signed-in when an anonymous visitor signs in', () => {
    initialAuth.isSignedIn = false;
    auth.isLoaded = true;
    auth.isSignedIn = true;
    expect(render()).toEqual({ isSignedIn: true, confirmedSignedIn: true });
  });
});
