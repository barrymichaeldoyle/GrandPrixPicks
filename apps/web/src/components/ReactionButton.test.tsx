import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { emptyReactionCounts } from '@grandprixpicks/shared/reactions';

import { ReactionButton } from './ReactionButton';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    feed: { setReaction: 'setReaction', removeReaction: 'removeReaction' },
  },
}));

vi.mock('convex/react', () => ({
  useMutation: vi.fn(() => vi.fn(async () => null)),
}));

vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: vi.fn(),
}));

const feedEventId = 'event_1' as Parameters<
  typeof ReactionButton
>[0]['feedEventId'];

describe('the reaction a viewer has already left', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(context: 'pick' | 'news') {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => {
      root?.render(
        <ReactionButton
          context={context}
          feedEventId={feedEventId}
          reactionCount={1}
          reactionCounts={{ ...emptyReactionCounts(), fire: 1 }}
          viewerReaction="fire"
        />,
      );
    });
    return container;
  }

  /*
   * The regression this exists for.
   *
   * The picker, and the count beside the trigger, were both built from the
   * surface's own wording; the trigger drawing the viewer's reaction read the
   * context-free map instead. So a news card showed "🔥 Great pick" against a
   * 🌶️ in its own count, about one reaction — and offered to remove a "Great
   * pick" from a grid penalty.
   */
  it('is worded for the surface it was left on', () => {
    expect(render('news').textContent).toContain('Spicy');
    expect(container?.textContent).not.toContain('Great pick');
  });

  it('still says Great pick where there is a pick', () => {
    expect(render('pick').textContent).toContain('Great pick');
  });

  it('offers to remove it by the name it was given', () => {
    const trigger = render('news').querySelector('button[title]');
    expect(trigger?.getAttribute('title')).toBe('Remove Spicy reaction');
  });
});
