import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthCurtainHost, useAuthCurtainGate } from './auth-curtain';
import { ViewerSessionProvider } from './viewer-session-context';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Gate({ ready }: { ready: boolean }) {
  useAuthCurtainGate(ready);
  return <p>page content</p>;
}

describe('AuthCurtainHost', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    vi.useRealTimers();
  });

  /** Renders the real host, so these tests cannot drift from its logic. */
  function render({
    handoff,
    confirmedSignedIn,
    gate,
  }: {
    handoff: boolean;
    confirmedSignedIn: boolean;
    /** Omitted means the page mounts no gate at all. */
    gate?: boolean;
  }) {
    act(() =>
      root.render(
        <ViewerSessionProvider
          value={{ isSignedIn: true, confirmedSignedIn, isLoaded: true }}
        >
          <AuthCurtainHost handoff={handoff}>
            {gate === undefined ? <p>page content</p> : <Gate ready={gate} />}
          </AuthCurtainHost>
        </ViewerSessionProvider>,
      ),
    );
  }

  function curtain() {
    return container.querySelector('[role="status"]');
  }

  it('renders nothing extra outside a handoff, however loud the gates are', () => {
    // The anonymous path. A gate that is not ready must not conjure a curtain
    // onto a page that was never signing anyone in.
    render({ handoff: false, confirmedSignedIn: false, gate: false });
    expect(curtain()).toBeNull();
    expect(container.textContent).toContain('page content');
  });

  it('covers the page while Clerk has not confirmed the session', () => {
    render({ handoff: true, confirmedSignedIn: false });
    expect(curtain()?.textContent).toContain('Signing you in');
  });

  it('stays up after confirmation while a gate is still waiting on its data', () => {
    // The dashboard flash: Clerk is done, but the page would render "Your race
    // weekend" until the viewer query lands.
    render({ handoff: true, confirmedSignedIn: true, gate: false });
    expect(curtain()).not.toBeNull();
  });

  it('lifts once the session is confirmed and every gate reports ready', () => {
    render({ handoff: true, confirmedSignedIn: true, gate: false });
    expect(curtain()).not.toBeNull();

    render({ handoff: true, confirmedSignedIn: true, gate: true });
    expect(curtain()).toBeNull();
    expect(container.textContent).toContain('page content');
  });

  it('lifts when a waiting gate unmounts instead of reporting ready', () => {
    // A route that navigates away mid-handoff must not strand the curtain.
    render({ handoff: true, confirmedSignedIn: true, gate: false });
    expect(curtain()).not.toBeNull();

    render({ handoff: true, confirmedSignedIn: true });
    expect(curtain()).toBeNull();
  });

  it('gives up after the timeout rather than trapping the visitor', () => {
    vi.useFakeTimers();
    render({ handoff: true, confirmedSignedIn: false, gate: false });
    expect(curtain()).not.toBeNull();

    act(() => void vi.advanceTimersByTime(8_000));
    expect(curtain()).toBeNull();
    expect(container.textContent).toContain('page content');
  });
});
