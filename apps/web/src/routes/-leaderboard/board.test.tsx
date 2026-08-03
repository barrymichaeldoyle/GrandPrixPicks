import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { LeaderboardBoard } from './board';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children?: ReactNode }) => <a>{children}</a>,
}));

describe('LeaderboardBoard', () => {
  it('shows one combined points total without mode breakdown columns', () => {
    const html = renderToStaticMarkup(
      <LeaderboardBoard
        entries={[
          {
            rank: 1,
            userId: 'user-1',
            username: 'pole-sitter',
            displayName: 'Pole Sitter',
            points: 317,
          },
          {
            rank: 2,
            userId: 'user-2',
            username: 'late-braker',
            displayName: 'Late Braker',
            points: 282,
          },
          {
            rank: 3,
            userId: 'user-3',
            username: 'apex-hunter',
            displayName: 'Apex Hunter',
            points: 275,
          },
          {
            rank: 4,
            userId: 'user-4',
            username: 'tyre-whisperer',
            displayName: 'Tyre Whisperer',
            points: 272,
          },
        ]}
      />,
    );

    expect(html).toContain('Rank');
    expect(html).toContain('Player');
    expect(html).toContain('Points');
    expect(html).toContain('317');
    expect(html).not.toContain('Top 5');
    expect(html).not.toContain('H2H');
    expect(html).not.toContain('Accuracy');
  });
});
