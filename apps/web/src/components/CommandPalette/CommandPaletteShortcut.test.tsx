import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandPaletteShortcut } from './CommandPaletteShortcut';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: { races: { getNextRace: 'getNextRace' } },
}));

vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => null,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

describe('command palette shortcut', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  function mount(signedIn = true) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<CommandPaletteShortcut signedIn={signedIn} />));
  }

  beforeEach(() => {
    mount();
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function chord(target: EventTarget = document.body) {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      target.dispatchEvent(event);
    });
    return event;
  }

  function isOpen() {
    return !!document.querySelector('[role="dialog"]');
  }

  /**
   * The palette is lazy, so opening it resolves a dynamic import and then
   * commits a Suspense boundary. How many turns that takes depends on how
   * loaded the runner is — a fixed count passed alone and failed inside the
   * full suite — so this waits on the condition instead.
   */
  async function settleUntil(predicate: () => boolean, turns = 80) {
    for (let turn = 0; turn < turns; turn += 1) {
      if (predicate()) {
        return;
      }
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 16));
      });
    }
  }

  /** For asserting that nothing opens: settle without a condition to reach. */
  async function settle() {
    await settleUntil(() => false, 5);
  }

  // The whole point of the easter egg: no affordance anywhere.
  it('renders no visible affordance', () => {
    expect(container!.innerHTML).toBe('');
    expect(document.querySelector('button')).toBeNull();
  });

  it('opens on the chord and swallows the keystroke', async () => {
    const event = chord();
    await settleUntil(isOpen);

    expect(event.defaultPrevented).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('closes on a second chord, from inside its own input', async () => {
    chord();
    await settleUntil(isOpen);

    const input = document.querySelector<HTMLElement>('[role="combobox"]')!;
    chord(input);
    await settleUntil(() => !isOpen());

    expect(isOpen()).toBe(false);
  });

  it('leaves the keystroke alone while the person is typing elsewhere', async () => {
    const field = document.createElement('textarea');
    document.body.append(field);

    const event = chord(field);
    await settle();

    expect(event.defaultPrevented).toBe(false);
    expect(isOpen()).toBe(false);
    field.remove();
  });

  it('ignores k without the modifier', async () => {
    act(() => {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
      );
    });
    await settle();

    expect(isOpen()).toBe(false);
  });

  it('opens for a signed-out visitor too', async () => {
    act(() => root?.unmount());
    container?.remove();
    mount(false);

    chord();
    await settleUntil(isOpen);

    expect(isOpen()).toBe(true);
  });
});
