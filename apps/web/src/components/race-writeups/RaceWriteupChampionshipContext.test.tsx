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
