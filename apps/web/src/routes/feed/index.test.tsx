import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FeedContent } from './index';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const useQueryMock = vi.fn();

vi.mock('@convex-generated/api', () => ({
  api: {
    feed: {
      getPersonalizedFeed: 'getPersonalizedFeed',
      getFeedEvent: 'getFeedEvent',
    },
    follows: {
      getViewerFollowedIds: 'getViewerFollowedIds',
      getSuggestedLeagueMembersToFollow: 'getSuggestedLeagueMembersToFollow',
    },
    leagues: {
      getMyLeagues: 'getMyLeagues',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href="/" {...props}>
      {children}
    </a>
  ),
  createFileRoute: () => () => ({}),
}));

vi.mock('lucide-react', () => ({
  Gauge: () => null,
  Trophy: () => null,
}));

vi.mock('../../components/Button/Button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('../../components/FeedItem', () => ({
  FeedEmptyState: ({
    title,
    message,
    children,
  }: {
    title?: string;
    message: string;
    children?: React.ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      <div>{message}</div>
      {children}
    </div>
  ),
  FeedItem: ({ event }: { event: { _id: string } }) => <div>{event._id}</div>,
  FeedItemSkeleton: () => <div>loading</div>,
  SessionSeparator: () => null,
}));

vi.mock('../../components/Avatar', () => ({
  Avatar: () => <div>avatar</div>,
}));

vi.mock('../../components/FollowButton', () => ({
  FollowButton: () => <button>Follow</button>,
}));

vi.mock('../../lib/site', () => ({
  canonicalMeta: () => ({ meta: [], links: [] }),
}));

function renderFeedContent() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<FeedContent />);
  });

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('FeedContent', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('uses nextCursor from the last page when loading more', () => {
    useQueryMock.mockImplementation((_query: unknown, args: unknown) => {
      if (_query === 'getViewerFollowedIds') {
        return [];
      }
      if (_query === 'getMyLeagues') {
        return [];
      }
      if (_query === 'getSuggestedLeagueMembersToFollow') {
        return [];
      }
      if (args === 'skip') {
        return undefined;
      }
      if (!args || !('paginationCursor' in (args as Record<string, unknown>))) {
        return {
          events: [{ _id: 'event-1', type: 'joined_league', createdAt: 10 }],
          sessions: {},
          hasMore: true,
          nextCursor: 'cursor-page-2',
        };
      }
      if (
        (args as { paginationCursor?: string }).paginationCursor ===
        'cursor-page-2'
      ) {
        return {
          events: [{ _id: 'event-2', type: 'joined_league', createdAt: 9 }],
          sessions: {},
          hasMore: false,
          nextCursor: null,
        };
      }
      return undefined;
    });

    const view = renderFeedContent();
    const button = Array.from(view.container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Load more',
    );

    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useQueryMock).toHaveBeenCalledWith('getPersonalizedFeed', {});
    expect(useQueryMock).toHaveBeenCalledWith('getPersonalizedFeed', {
      paginationCursor: 'cursor-page-2',
    });
    expect(view.container.textContent).toContain('event-1');
    expect(view.container.textContent).toContain('event-2');

    view.unmount();
  });

  it('nudges users with no follows and no leagues toward the leaderboard', () => {
    useQueryMock.mockImplementation((query: unknown, args: unknown) => {
      if (query === 'getViewerFollowedIds') {
        return [];
      }
      if (query === 'getMyLeagues') {
        return [];
      }
      if (query === 'getSuggestedLeagueMembersToFollow') {
        return [];
      }
      if (args === 'skip') {
        return undefined;
      }
      return {
        events: [],
        sessions: {},
        hasMore: false,
        nextCursor: null,
      };
    });

    const view = renderFeedContent();

    expect(view.container.textContent).toContain('Find players to follow');
    expect(view.container.textContent).toContain('Browse leaderboard');

    view.unmount();
  });
});
