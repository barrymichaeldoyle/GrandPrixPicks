import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SessionConsensusData } from './SessionConsensus';
import { SessionConsensusSections } from './SessionConsensus';

// The name beside the badge is the driver's display name, which the fixtures
// set to the code, so the badge itself adds nothing a row assertion needs.
vi.mock('@/components/DriverBadge', () => ({ DriverBadge: () => null }));

function driver(
  code: string,
  team: string,
  slots: number[],
): SessionConsensusData['drivers'][number] {
  const picks = slots.reduce((total, count) => total + count, 0);
  return {
    driverId: code.toLowerCase(),
    code,
    displayName: code,
    team,
    number: null,
    nationality: null,
    slots,
    picks,
    pickRate: Math.round((picks / 12) * 1000) / 10,
    consensusPosition: 0,
  };
}

// Madrid 2026 qualifying: nobody put the pole-sitter in P1.
const consensus: SessionConsensusData = {
  entrants: 12,
  lockAt: 0,
  sampled: false,
  drivers: [
    driver('ANT', 'Mercedes', [9, 3, 0, 0, 0]),
    driver('LEC', 'Ferrari', [1, 6, 4, 1, 0]),
    driver('VER', 'Red Bull Racing', [1, 0, 1, 1, 1]),
    driver('NOR', 'McLaren', [0, 1, 2, 4, 2]),
  ].map((row, index) => ({ ...row, consensusPosition: index + 1 })),
};

function render() {
  const html = renderToString(
    <SessionConsensusSections
      sessions={[
        {
          session: 'quali',
          consensus,
          classification: [
            { driverId: 'nor', code: 'NOR', displayName: 'NOR', team: null },
          ],
        },
      ]}
    />,
  );
  const container = document.createElement('div');
  container.innerHTML = html;
  const [p1, top5] = container.querySelectorAll<HTMLElement>(
    '[role="tabpanel"] > div',
  );
  return { p1, top5 };
}

function rows(panel: HTMLElement) {
  return [...panel.querySelectorAll('tbody tr')].map((row) =>
    row.textContent?.replaceAll(/\s+/g, ' ').trim(),
  );
}

describe('SessionConsensusSections', () => {
  it('counts P1 picks, most first, and keeps a pole-sitter nobody picked', () => {
    const { p1 } = render();

    expect(rows(p1)).toEqual(['ANT9', 'LEC1', 'VER1', 'NORPole0']);
  });

  it('server-renders both views, showing P1 picks first', () => {
    const { p1, top5 } = render();

    expect(p1.hidden).toBe(false);
    expect(top5.hidden).toBe(true);
    expect(rows(top5)[0]).toBe('P1ANT100%');
  });
});
