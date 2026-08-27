import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let plan: { plan: string; isPro: boolean } | undefined;
let enabled = true;

vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => plan,
}));

vi.mock('@convex-generated/api', () => ({
  api: { billing: { getMyPlan: 'billing:getMyPlan' } },
}));

vi.mock('@/lib/adsense', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/adsense')>('@/lib/adsense');
  return {
    ...actual,
    adsEnabled: () => enabled,
    // Never resolves, so nothing tries to reach Google from a test. The gates
    // under test all decide before the script is asked for.
    ensureAdSenseLoaded: () => new Promise<void>(() => {}),
  };
});

const { AdSlot } = await import('./AdSlot');

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode) {
  act(() => {
    root.render(node);
  });
}

/** The slot's own wrapper, which is also the reserved space. */
function slotEl() {
  return container.querySelector('[aria-label="Advertisement"]');
}

beforeEach(() => {
  plan = { plan: 'free', isPro: false };
  enabled = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('AdSlot', () => {
  it('renders a labelled, space-reserving slot for a free viewer', () => {
    render(<AdSlot slot="1234567890" minHeight={280} />);

    const el = slotEl();
    expect(el).not.toBeNull();
    expect((el as HTMLElement).style.minHeight).toBe('280px');
  });

  it('renders nothing at all for a PRO subscriber', () => {
    // The one that would be a bug worth money: a paying subscriber seeing ads.
    plan = { plan: 'pro', isPro: true };
    render(<AdSlot slot="1234567890" />);

    expect(slotEl()).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing until the plan is known', () => {
    // Not "free until proven PRO" — that would flash an ad at a subscriber.
    plan = undefined;
    render(<AdSlot slot="1234567890" />);

    expect(slotEl()).toBeNull();
  });

  it('renders nothing when ads are switched off', () => {
    enabled = false;
    render(<AdSlot slot="1234567890" />);

    expect(slotEl()).toBeNull();
  });

  it('renders nothing without a configured ad unit', () => {
    // The state the app ships in until the account is approved and units exist.
    render(<AdSlot slot={undefined} />);

    expect(slotEl()).toBeNull();
  });

  it('mounts the <ins> only once the slot is approached', () => {
    // The whole point of the deferral: no ad markup, so no push and no script
    // fetch, for a reader who never scrolls here.
    const observers: Array<(entries: unknown[]) => void> = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: unknown[]) => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      },
    );

    render(<AdSlot slot="1234567890" />);
    expect(slotEl()).not.toBeNull();
    expect(container.querySelector('ins.adsbygoogle')).toBeNull();

    act(() => observers[0]([{ isIntersecting: true }]));
    expect(container.querySelector('ins.adsbygoogle')).not.toBeNull();

    vi.unstubAllGlobals();
  });

  it('renders the slot immediately where IntersectionObserver is missing', () => {
    // Old browsers and jsdom. Better a loaded ad than a unit that can never
    // fill because nothing will ever tell it that it is visible.
    expect(globalThis.IntersectionObserver).toBeUndefined();
    render(<AdSlot slot="1234567890" />);

    expect(container.querySelector('ins.adsbygoogle')).not.toBeNull();
  });
});
