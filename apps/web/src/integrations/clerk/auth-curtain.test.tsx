import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn();
vi.mock('@sentry/tanstackstart-react', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}));

import {
  AuthCurtainHost,
  reportPrePaintCurtainTimeout,
  useAuthCurtainGate,
} from './auth-curtain';
import {
  AUTH_HANDOFF_ATTRIBUTE,
  PRE_PAINT_TIMEOUT_GLOBAL,
} from './pre-paint-curtain';
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
    label = 'Signing you in',
  }: {
    handoff: boolean;
    confirmedSignedIn: boolean;
    /** Omitted means the page mounts no gate at all. */
    gate?: boolean;
    label?: string;
  }) {
    act(() =>
      root.render(
        <ViewerSessionProvider
          value={{ isSignedIn: true, confirmedSignedIn, isLoaded: true }}
        >
          <AuthCurtainHost handoff={handoff} label={label}>
            {gate === undefined ? <p>page content</p> : <Gate ready={gate} />}
          </AuthCurtainHost>
        </ViewerSessionProvider>,
      ),
    );
  }

  /** Attribute, not inline `body.style.overflow`: Clerk's sign-in modal owns
   *  that property and the curtain rises while it is still up. */
  function isScrollLocked() {
    return document.documentElement.hasAttribute('data-scroll-locked');
  }

  function curtain() {
    return container.querySelector('[role="status"]');
  }

  it('takes the pre-paint curtain down when its own is finished', () => {
    // The two are one loader from the visitor's side: the attribute keeps the
    // document hidden across the window React did not exist for, and React owns
    // the moment it stops being needed. Clearing it on mount instead would open
    // a hole between the two curtains.
    document.documentElement.setAttribute(AUTH_HANDOFF_ATTRIBUTE, '');
    render({ handoff: true, confirmedSignedIn: false });
    expect(document.documentElement.hasAttribute(AUTH_HANDOFF_ATTRIBUTE)).toBe(
      true,
    );

    render({ handoff: true, confirmedSignedIn: true });
    expect(document.documentElement.hasAttribute(AUTH_HANDOFF_ATTRIBUTE)).toBe(
      false,
    );
  });

  it('names what the visitor is actually waiting for', () => {
    // A returning player on a resumed tab reaches this curtain too, and is not
    // being signed in.
    render({
      handoff: true,
      confirmedSignedIn: false,
      label: 'Loading your dashboard',
    });
    expect(curtain()?.textContent).toContain('Loading your dashboard');
  });

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

  it('stops the page scrolling underneath, and hands scrolling back when it lifts', () => {
    // `inert` keeps the tab order and screen readers out of the page behind the
    // curtain, but does nothing about a wheel or a swipe: the handoff used to
    // end on a page scrolled somewhere the visitor never chose.
    expect(isScrollLocked()).toBe(false);

    render({ handoff: true, confirmedSignedIn: false });
    expect(isScrollLocked()).toBe(true);

    render({ handoff: true, confirmedSignedIn: true });
    expect(curtain()).toBeNull();
    expect(isScrollLocked()).toBe(false);
  });

  it('leaves Clerk’s own scroll lock exactly as it found it', () => {
    // Clerk's sign-in modal sets `body.style.overflow` itself, and the curtain
    // always rises while that modal is still up. A lock that snapshotted the
    // value it found captured Clerk's `hidden` and restored it on release, so
    // the page never scrolled again once the handoff finished.
    document.body.style.overflow = 'hidden';

    render({ handoff: true, confirmedSignedIn: false });
    expect(isScrollLocked()).toBe(true);

    // Clerk closes its modal and cleans up after itself.
    document.body.style.overflow = '';

    render({ handoff: true, confirmedSignedIn: true });
    expect(isScrollLocked()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('gives up after the timeout rather than trapping the visitor', () => {
    vi.useFakeTimers();
    render({ handoff: true, confirmedSignedIn: false, gate: false });
    expect(curtain()).not.toBeNull();

    act(() => void vi.advanceTimersByTime(8_000));
    expect(curtain()).toBeNull();
    expect(container.textContent).toContain('page content');
  });

  /**
   * The ceiling exists so nobody is stranded, which is exactly why it hid a
   * two-week bug. Reaching it is never normal, so it has to be reported.
   */
  it('reports a curtain that ran out of time', () => {
    vi.useFakeTimers();
    captureMessage.mockClear();
    render({ handoff: true, confirmedSignedIn: false, gate: false });
    act(() => void vi.advanceTimersByTime(8_000));

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = captureMessage.mock.calls[0] as [
      string,
      { level: string; tags: Record<string, string> },
    ];
    expect(message).toBe('Auth curtain timed out');
    expect(options.level).toBe('error');
    // Clerk never confirmed, so this is the auth bug rather than a slow page.
    expect(options.tags.curtain_waiting_for).toBe('clerk');
  });

  it('names a stuck page gate as a different failure from a stuck Clerk', () => {
    vi.useFakeTimers();
    captureMessage.mockClear();
    render({ handoff: true, confirmedSignedIn: true, gate: false });
    act(() => void vi.advanceTimersByTime(8_000));

    const [, options] = captureMessage.mock.calls[0] as [
      string,
      { tags: Record<string, string> },
    ];
    expect(options.tags.curtain_waiting_for).toBe('gates');
  });

  it('says nothing when the handoff resolves in time', () => {
    vi.useFakeTimers();
    captureMessage.mockClear();
    render({ handoff: true, confirmedSignedIn: false, gate: false });
    render({ handoff: true, confirmedSignedIn: true, gate: true });

    act(() => void vi.advanceTimersByTime(30_000));
    expect(captureMessage).not.toHaveBeenCalled();
  });

  /**
   * The report reads its detail from a ref for this reason. Listing
   * `pendingGates` in the effect's dependency array would restart the eight
   * seconds every time a gate registered or released, so a page that flapped
   * one while the curtain stayed up would never reach the ceiling at all.
   *
   * `confirmedSignedIn` is false throughout, which pins `active` true, so the
   * gate count is the only thing changing here. A flap that also flips `active`
   * legitimately restarts the clock: the curtain is down in that window, so
   * nobody is trapped.
   */
  it('keeps counting while a gate flaps under a curtain that stays up', () => {
    vi.useFakeTimers();
    captureMessage.mockClear();
    for (let tick = 0; tick < 8; tick++) {
      render({ handoff: true, confirmedSignedIn: false, gate: tick % 2 === 0 });
      act(() => void vi.advanceTimersByTime(1_100));
    }

    expect(curtain()).toBeNull();
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });
});

describe('reportPrePaintCurtainTimeout', () => {
  const marked = window as unknown as Record<string, unknown>;

  afterEach(() => {
    delete marked[PRE_PAINT_TIMEOUT_GLOBAL];
  });

  it('says nothing when the script never timed out', () => {
    captureMessage.mockClear();
    reportPrePaintCurtainTimeout();
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('reports the mark the script leaves, and only once', () => {
    captureMessage.mockClear();
    marked[PRE_PAINT_TIMEOUT_GLOBAL] = 1;

    reportPrePaintCurtainTimeout();
    reportPrePaintCurtainTimeout();

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, options] = captureMessage.mock.calls[0] as [
      string,
      { tags: Record<string, string> },
    ];
    expect(message).toBe('Pre-paint auth curtain timed out');
    expect(options.tags.curtain_waiting_for).toBe('boot');
  });
});
