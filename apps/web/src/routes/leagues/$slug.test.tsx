import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '@convex-generated/dataModel';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const useQueryMock = vi.fn();

vi.mock('@convex-generated/api', () => ({
  api: {
    feed: {
      getLeagueFeed: 'getLeagueFeed',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class MockConvexHttpClient {},
}));

vi.mock('@clerk/react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ isSignedIn: true, isLoaded: true }),
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
  Outlet: () => null,
  useRouterState: () => ({ location: { search: {} } }),
}));

vi.mock('lucide-react', () => ({
  Gauge: () => null,
  ArrowLeft: () => null,
  CalendarDays: () => null,
  Check: () => null,
  ChevronDown: () => null,
  Copy: () => null,
  Crown: () => null,
  Globe: () => null,
  Layers: () => null,
  Lock: () => null,
  LogIn: () => null,
  Settings: () => null,
  Shield: () => null,
  Swords: () => null,
  Trophy: () => null,
  Users: () => null,
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock('@/components/TabSwitch', () => ({
  TabSwitch: () => null,
}));

vi.mock('@/lib/userFacingError', () => ({
  toUserFacingMessage: (error: unknown) => String(error),
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
  FeedEmptyState: ({ message }: { message: string }) => <div>{message}</div>,
  FeedItem: ({ event }: { event: { _id: string } }) => <div>{event._id}</div>,
  FeedItemSkeleton: () => <div>loading</div>,
  SessionSeparator: () => null,
}));

vi.mock('../../components/LeagueMembersList', () => ({
  LeagueMembersList: () => null,
  LeagueMembersListSkeleton: () => null,
}));

vi.mock('../../components/PageLoader', () => ({
  PageLoader: () => null,
}));

vi.mock('../../lib/site', () => ({
  canonicalMeta: () => ({ meta: [], links: [] }),
  defaultOgImage: '',
}));

async function renderLeagueFeed(leagueId: Id<'leagues'>) {
  const { LeagueFeed } = await import('./$slug');
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<LeagueFeed leagueId={leagueId} />);
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

describe('LeagueFeed', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('uses nextCursor from the last league page when loading more', async () => {
    const leagueId = 'league_1' as Id<'leagues'>;

    useQueryMock.mockImplementation(
      (_query: unknown, args: unknown) => {
        if (args === 'skip') {
          return undefined;
        }
        if (
          args &&
          (args as { leagueId?: Id<'leagues'>; paginationCursor?: string }).leagueId === leagueId &&
          (args as { paginationCursor?: string }).paginationCursor === undefined
        ) {
          return {
            events: [{ _id: 'league-event-1', type: 'joined_league', createdAt: 10 }],
            sessions: {},
            hasMore: true,
            nextCursor: 'league-cursor-2',
          };
        }
        if (
          args &&
          (args as { leagueId?: Id<'leagues'>; paginationCursor?: string }).leagueId === leagueId &&
          (args as { paginationCursor?: string }).paginationCursor === 'league-cursor-2'
        ) {
          return {
            events: [{ _id: 'league-event-2', type: 'joined_league', createdAt: 9 }],
            sessions: {},
            hasMore: false,
            nextCursor: null,
          };
        }
        return undefined;
      },
    );

    let view:
      | Awaited<ReturnType<typeof renderLeagueFeed>>
      | undefined;

    await act(async () => {
      view = await renderLeagueFeed(leagueId);
    });

    const resolvedView = view!;
    const button = Array.from(resolvedView.container.querySelectorAll('button')).find(
      (candidate) => candidate.textContent === 'Load more',
    );

    expect(button).not.toBeUndefined();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(useQueryMock).toHaveBeenCalledWith('getLeagueFeed', { leagueId });
    expect(useQueryMock).toHaveBeenCalledWith('getLeagueFeed', {
      leagueId,
      paginationCursor: 'league-cursor-2',
    });

    resolvedView.unmount();
  });
});
