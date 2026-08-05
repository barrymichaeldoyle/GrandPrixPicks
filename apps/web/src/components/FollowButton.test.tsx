import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FollowButton } from './FollowButton';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    follows: {
      isFollowing: 'isFollowing',
      follow: 'follow',
      unfollow: 'unfollow',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => false),
  useMutation: vi.fn(() => vi.fn(async () => null)),
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

const followeeId = 'user_1' as Parameters<typeof FollowButton>[0]['followeeId'];

describe('follow button confirmation', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<FollowButton followeeId={followeeId} />));
  }

  function button() {
    const el = container?.querySelector('button');
    if (!el) {
      throw new Error('no follow button rendered');
    }
    return el;
  }

  function label() {
    return button().textContent;
  }

  // Both event families on purpose. A mouse produces the pointer *and* the
  // mouse event, so a revert to `onMouseEnter` has to fail these tests rather
  // than quietly pass them for want of an event it listens to.
  function pointerEnter(pointerType: string) {
    act(() => {
      button().dispatchEvent(
        new PointerEvent('pointerover', { bubbles: true, pointerType }),
      );
      button().dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
  }

  function pointerLeave() {
    act(() => {
      button().dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }),
      );
      button().dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
  }

  it('still says Following while the cursor sits where the click landed', () => {
    // The click leaves the pointer on the button. Swapping straight to
    // "Unfollow" there reads as the follow not having taken.
    render();
    expect(label()).toContain('Follow');

    act(() => button().click());
    expect(label()).toContain('Following');

    pointerEnter('mouse');
    expect(label()).toContain('Following');
  });

  it('offers Unfollow once the pointer leaves and comes back', () => {
    render();
    act(() => button().click());

    pointerLeave();
    pointerEnter('mouse');
    expect(label()).toContain('Unfollow');
  });

  it('never offers Unfollow to a touch pointer', () => {
    // A tap fires the compatibility pointer events with no leave to follow, so
    // hover state set from touch would stick until the next tap elsewhere.
    render();
    act(() => button().click());

    pointerLeave();
    pointerEnter('touch');
    expect(label()).toContain('Following');
  });
});
