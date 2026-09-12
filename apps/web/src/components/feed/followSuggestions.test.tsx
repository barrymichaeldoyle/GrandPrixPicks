import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuery } from '@/integrations/convex/query';

import { useFeedOffersFollows } from './followSuggestions';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    feed: { getPersonalizedFeed: 'getPersonalizedFeed' },
    follows: {
      getSuggestedLeagueMembersToFollow: 'getSuggestedLeagueMembersToFollow',
    },
  },
}));

vi.mock('@/integrations/convex/query', () => ({ useQuery: vi.fn() }));

const mockedUseQuery = vi.mocked(useQuery);

/** Answers each of the hook's two queries by name. */
function answerWith({
  feed,
  suggested,
}: {
  feed?: unknown;
  suggested?: unknown;
}) {
  mockedUseQuery.mockImplementation(((query: string) =>
    query === 'getPersonalizedFeed'
      ? feed
      : suggested) as unknown as typeof useQuery);
}

const someone = [{ _id: 'user_1' }];

function page(events: unknown[]) {
  return { events, hasMore: false };
}

let container: HTMLDivElement;
let root: Root;

function render(initialPage?: unknown) {
  function Probe() {
    return (
      <span>
        {String(
          useFeedOffersFollows(
            initialPage as Parameters<typeof useFeedOffersFollows>[0],
          ),
        )}
      </span>
    );
  }
  act(() => root.render(<Probe />));
  return container.textContent;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

describe('useFeedOffersFollows', () => {
  it('is true when the stream is empty and has people to suggest', () => {
    answerWith({ feed: page([]), suggested: someone });
    expect(render()).toBe('true');
  });

  it('is false once the stream has events: the rail keeps the card', () => {
    answerWith({ feed: page([{ _id: 'event_1' }]), suggested: someone });
    expect(render()).toBe('false');
  });

  it('is false when there is nobody to suggest', () => {
    answerWith({ feed: page([]), suggested: [] });
    expect(render()).toBe('false');
  });

  // Both surfaces are waiting on the same answer; the rail card is the one
  // that is already on screen, so an unanswered feed must not hide it.
  it('is false while the feed query has not answered', () => {
    answerWith({ feed: undefined, suggested: someone });
    expect(render()).toBe('false');
  });

  it('reads the SSR seed while the live query is still out', () => {
    answerWith({ feed: undefined, suggested: someone });
    expect(render(page([]))).toBe('true');
  });

  // A signed-out client gets null on every page of a viewer-scoped feed.
  it('treats a null page as an empty stream', () => {
    answerWith({ feed: null, suggested: someone });
    expect(render()).toBe('true');
  });
});
