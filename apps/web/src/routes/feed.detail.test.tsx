import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  ref: 'j970sgdd1kgk2c0134x5tmsk3h8fggr6',
  isLoaded: true,
  isSignedIn: true,
}));
const useQuery = vi.hoisted(() => vi.fn(() => null));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: object) => ({
    ...options,
    useParams: () => ({ feedEventId: state.ref }),
  }),
  Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@convex-generated/api', () => ({
  api: {
    users: { me: 'users:me' },
    feed: { getFeedEventByRef: 'feed:getFeedEventByRef' },
  },
}));
vi.mock('@/integrations/convex/query', () => ({ useQuery }));
vi.mock('@/integrations/clerk/useViewerSession', () => ({
  useViewerSession: () => state,
}));
vi.mock('@/components/FeedItem/FeedItem', () => ({ FeedItem: () => null }));
vi.mock('@/components/FeedItem/SessionGroup', () => ({
  SessionGroup: () => null,
}));
vi.mock('@/components/SignInPrompt', () => ({
  SignInPrompt: () => <div>Sign in to view it</div>,
}));

const { Route } = await import('./feed.$feedEventId');
const FeedEventPage = (Route as unknown as { component: () => React.ReactNode })
  .component;

describe('feed detail links', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    state.isLoaded = true;
    state.isSignedIn = true;
    useQuery.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('passes the URL to the reference lookup and renders not found', () => {
    act(() => root.render(<FeedEventPage />));

    expect(useQuery).toHaveBeenCalledWith('feed:getFeedEventByRef', {
      ref: state.ref,
    });
    expect(container.textContent).toContain('Prediction not found');
  });

  it('waits for the viewer session before starting the detail lookup', () => {
    state.isLoaded = false;
    act(() => root.render(<FeedEventPage />));

    expect(useQuery).toHaveBeenCalledWith('feed:getFeedEventByRef', 'skip');
    expect(container.textContent).not.toContain('Prediction not found');
  });

  it('preserves the sign-in prompt when a signed-out lookup returns null', () => {
    state.isSignedIn = false;
    act(() => root.render(<FeedEventPage />));

    expect(useQuery).toHaveBeenCalledWith('feed:getFeedEventByRef', {
      ref: state.ref,
    });
    expect(container.textContent).toContain('Sign in to view it');
  });
});
