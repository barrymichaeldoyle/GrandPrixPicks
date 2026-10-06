import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const { RaceWriteupChampionshipContext } =
  await import('./RaceWriteupChampionshipContext');

function driver(
  position: number,
  code: string,
  displayName: string,
  points: number,
) {
  return {
    driverId: code,
    position,
    code,
    displayName,
    team: 'Mercedes',
    number: position,
    nationality: 'GB',
    points,
    wins: 0,
    podiums: 0,
  };
}

function championshipWith(
  drivers: ReturnType<typeof driver>[],
): Parameters<typeof RaceWriteupChampionshipContext>[0]['championship'] {
  return {
    roundsScored: 12,
    drivers,
    constructors: [],
  } as unknown as Parameters<
    typeof RaceWriteupChampionshipContext
  >[0]['championship'];
}

describe('RaceWriteupChampionshipContext', () => {
  it('keeps a long pending-round list in an accessible disclosure with its links intact', () => {
    const championship = championshipWith([
      driver(1, 'ANT', 'Kimi Antonelli', 25),
      driver(2, 'RUS', 'George Russell', 18),
    ]);
    championship.roundsScored = 1;
    const races = Array.from({ length: 5 }, (_, index) => ({
      slug: `round-${index + 2}`,
      name: `Round ${index + 2} Grand Prix`,
      round: index + 2,
      status: index === 4 ? 'cancelled' : 'upcoming',
    })) as unknown as Parameters<
      typeof RaceWriteupChampionshipContext
    >[0]['races'];
    const html = renderToStaticMarkup(
      <RaceWriteupChampionshipContext
        championship={championship}
        races={races}
        thisRound={7}
        venueName="Singapore"
      />,
    );
    const view = document.createElement('div');
    view.innerHTML = html;
    expect(view.querySelector('p')!.textContent).toContain('After 1 round,');
    expect(view.querySelector('p')!.textContent).toContain(
      '4 rounds still have to be scored',
    );
    expect(view.querySelector('p')!.querySelector('a')).toBeNull();
    const details = view.querySelector('details')!;
    expect(details.hasAttribute('open')).toBe(false);
    expect(details.querySelectorAll('a')).toHaveLength(4);
    expect(details.querySelector('a[href="/races/round-6"]')).toBeNull();
  });

  it('names one chaser when second place is clear', () => {
    const html = renderToStaticMarkup(
      <RaceWriteupChampionshipContext
        championship={championshipWith([
          driver(1, 'ANT', 'Kimi Antonelli', 242),
          driver(2, 'RUS', 'George Russell', 183),
          driver(3, 'NOR', 'Lando Norris', 170),
        ])}
        venueName="Monza"
      />,
    );

    expect(html).toContain('by 59 points from George Russell.');
    expect(html).not.toContain('level on');
  });

  // Second place can be settled on countback — Russell over Hamilton on wins —
  // and naming only the driver the tiebreak favoured hides a second driver the
  // same distance from the lead.
  it('names everyone level with second, and says they are level', () => {
    const html = renderToStaticMarkup(
      <RaceWriteupChampionshipContext
        championship={championshipWith([
          driver(1, 'ANT', 'Kimi Antonelli', 242),
          driver(2, 'RUS', 'George Russell', 183),
          driver(3, 'HAM', 'Lewis Hamilton', 183),
          driver(4, 'NOR', 'Lando Norris', 170),
        ])}
        venueName="Monza"
      />,
    );

    expect(html).toContain(
      'by 59 points from George Russell and Lewis Hamilton, level on 183.',
    );
  });
});
