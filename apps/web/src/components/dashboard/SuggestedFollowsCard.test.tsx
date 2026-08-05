import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from 'convex/react';

import { reasonText, SuggestedFollowsCard } from './SuggestedFollowsCard';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    follows: {
      getSuggestedLeagueMembersToFollow: 'getSuggestedLeagueMembersToFollow',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    params?: unknown;
    search?: unknown;
  }) => {
    const { params: _params, search: _search, ...rest } = props;
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/components/FollowButton', () => ({
  FollowButton: () => <button type="button">Follow</button>,
}));

type Suggestion = Parameters<typeof reasonText>[0];

function mutual(displayName: string) {
  return {
    username: displayName.toLowerCase(),
    displayName,
    avatarUrl: undefined,
  };
}

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    _id: 'user_1',
    username: 'oscarp',
    displayName: 'Oscar Piastri',
    avatarUrl: undefined,
    sharedLeagueCount: 1,
    sharedLeagueNames: ['Monaco Masters'],
    mutualFollowerCount: 0,
    mutualFollowers: [],
    ...overrides,
  } as Suggestion;
}

describe('suggested follow reason', () => {
  it('names a single mutual follower without a count', () => {
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 1,
          mutualFollowers: [mutual('Lando')],
        }),
      ),
    ).toBe('Followed by Lando');
  });

  it('names every mutual when the backend returned them all', () => {
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 3,
          mutualFollowers: [
            mutual('Lando'),
            mutual('George'),
            mutual('Carlos'),
          ],
        }),
      ),
    ).toBe('Followed by Lando, George and Carlos');
  });

  it('counts the unnamed remainder against the real total, not the named list', () => {
    // The backend names at most 3. With 12 mutuals the line has to say 11
    // others, not 2 — getting this wrong under-reports the social proof.
    expect(
      reasonText(
        suggestion({
          mutualFollowerCount: 12,
          mutualFollowers: [
            mutual('Lando'),
            mutual('George'),
            mutual('Carlos'),
          ],
        }),
      ),
    ).toBe('Followed by Lando and 11 others you follow');
  });

  it('falls back to a bare count when no mutual could be named', () => {
    // Incomplete profiles get filtered out server-side, so the count can
    // outlive the names. Without this branch the copy reads "Followed by
    // undefined".
    expect(
      reasonText(suggestion({ mutualFollowerCount: 2, mutualFollowers: [] })),
    ).toBe('Followed by 2 players you follow');
    expect(
      reasonText(suggestion({ mutualFollowerCount: 1, mutualFollowers: [] })),
    ).toBe('Followed by 1 player you follow');
  });

  it('falls back to shared leagues when there are no mutuals', () => {
    expect(reasonText(suggestion())).toBe('In Monaco Masters');
    expect(
      reasonText(
        suggestion({
          sharedLeagueNames: ['Monaco Masters', 'Office GP'],
          sharedLeagueCount: 2,
        }),
      ),
    ).toBe('In Monaco Masters and Office GP');
  });

  it('falls back to a league count when the names are unavailable', () => {
    expect(
      reasonText(suggestion({ sharedLeagueNames: [], sharedLeagueCount: 4 })),
    ).toBe('In 4 leagues with you');
  });
});

describe('suggested follow list stability', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function renderCard() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<SuggestedFollowsCard />));
  }

  function names() {
    return [...(container?.querySelectorAll('li a:not([aria-hidden])') ?? [])]
      .map((el) => el.textContent)
      .filter(Boolean);
  }

  it('keeps the first suggestions after the query swaps in replacements', () => {
    // Following someone removes them from the reactive query's result and a new
    // face slides in behind them. Refilling the card is what causes follow
    // fatigue, so the mount pins whoever it showed first.
    vi.mocked(useQuery).mockReturnValue([
      suggestion({
        _id: 'a' as Suggestion['_id'],
        username: 'oscarp',
        displayName: 'Oscar',
      }),
      suggestion({
        _id: 'b' as Suggestion['_id'],
        username: 'charles',
        displayName: 'Charles',
      }),
    ]);
    renderCard();
    expect(names()).toEqual(['Oscar', 'Charles']);

    vi.mocked(useQuery).mockReturnValue([
      suggestion({
        _id: 'c' as Suggestion['_id'],
        username: 'kimi',
        displayName: 'Kimi',
      }),
    ]);
    act(() => root!.render(<SuggestedFollowsCard />));
    expect(names()).toEqual(['Oscar', 'Charles']);
  });

  it('takes the first non-empty result, so a slow query still fills the card', () => {
    vi.mocked(useQuery).mockReturnValue(undefined);
    renderCard();
    expect(names()).toEqual([]);

    vi.mocked(useQuery).mockReturnValue([
      suggestion({
        _id: 'a' as Suggestion['_id'],
        username: 'oscarp',
        displayName: 'Oscar',
      }),
    ]);
    act(() => root!.render(<SuggestedFollowsCard />));
    expect(names()).toEqual(['Oscar']);
  });
});
