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

  // 111 clear with three races (75 points) left is a title already won, and
  // "leads by 111" undersold it.
  it('says the title is won once the lead exceeds the points left', () => {
    const championship = championshipWith([
      driver(1, 'ANT', 'Kimi Antonelli', 390),
      driver(2, 'VER', 'Max Verstappen', 279),
    ]);
    championship.roundsScored = 20;
    (championship as unknown as { season: number }).season = 2026;
    const races = [21, 22, 23].map((round) => ({
      slug: `round-${round}`,
      name: `Round ${round} Grand Prix`,
      round,
      status: 'upcoming',
      hasSprint: false,
    })) as unknown as Parameters<
      typeof RaceWriteupChampionshipContext
    >[0]['races'];
    const view = document.createElement('div');
    view.innerHTML = renderToStaticMarkup(
      <RaceWriteupChampionshipContext
        championship={championship}
        races={races}
        thisRound={21}
        venueName="Las Vegas"
      />,
    );

    expect(view.querySelector('p')!.textContent).toBe(
      'Kimi Antonelli has won the 2026 drivers\u2019 title: 111 points clear of Max Verstappen after 20 rounds, with 75 left to score.',
    );
  });

  it('keeps the lead wording while the title is still open', () => {
    const championship = championshipWith([
      driver(1, 'ANT', 'Kimi Antonelli', 390),
      driver(2, 'VER', 'Max Verstappen', 330),
    ]);
    championship.roundsScored = 20;
    const races = [21, 22, 23].map((round) => ({
      slug: `round-${round}`,
      name: `Round ${round} Grand Prix`,
      round,
      status: 'upcoming',
      hasSprint: round === 22,
    })) as unknown as Parameters<
      typeof RaceWriteupChampionshipContext
    >[0]['races'];
    const html = renderToStaticMarkup(
      <RaceWriteupChampionshipContext
        championship={championship}
        races={races}
        thisRound={21}
        venueName="Las Vegas"
      />,
    );

    expect(html).toContain('leads the drivers’ table by 60 points');
  });
});
