export type Driver = {
  id: string;
  code: string;
  name: string;
  team: string;
  color: string;
};

export type RaceSession = {
  id: 'quali' | 'race';
  label: string;
  lockAt: string;
};

export type Race = {
  season: number;
  round: number;
  slug: string;
  name: string;
  countryCode: string;
  sessions: RaceSession[];
  drivers: Driver[];
};

const teams = [
  [
    'McLaren',
    '#ff8700',
    [
      ['NOR', 'Lando Norris'],
      ['PIA', 'Oscar Piastri'],
    ],
  ],
  [
    'Ferrari',
    '#e8002d',
    [
      ['LEC', 'Charles Leclerc'],
      ['HAM', 'Lewis Hamilton'],
    ],
  ],
  [
    'Red Bull Racing',
    '#3671c6',
    [
      ['VER', 'Max Verstappen'],
      ['HAD', 'Isack Hadjar'],
    ],
  ],
  [
    'Mercedes',
    '#27f4d2',
    [
      ['RUS', 'George Russell'],
      ['ANT', 'Kimi Antonelli'],
    ],
  ],
  [
    'Aston Martin',
    '#229971',
    [
      ['ALO', 'Fernando Alonso'],
      ['STR', 'Lance Stroll'],
    ],
  ],
  [
    'Alpine',
    '#ff87bc',
    [
      ['GAS', 'Pierre Gasly'],
      ['COL', 'Franco Colapinto'],
    ],
  ],
  [
    'Williams',
    '#64c4ff',
    [
      ['ALB', 'Alex Albon'],
      ['SAI', 'Carlos Sainz'],
    ],
  ],
  [
    'Racing Bulls',
    '#6692ff',
    [
      ['LAW', 'Liam Lawson'],
      ['LIN', 'Arvid Lindblad'],
    ],
  ],
  [
    'Audi',
    '#f50537',
    [
      ['HUL', 'Nico Hülkenberg'],
      ['BOR', 'Gabriel Bortoleto'],
    ],
  ],
  [
    'Haas',
    '#b6babd',
    [
      ['OCO', 'Esteban Ocon'],
      ['BEA', 'Oliver Bearman'],
    ],
  ],
  [
    'Cadillac',
    '#c7c7c7',
    [
      ['BOT', 'Valtteri Bottas'],
      ['PER', 'Sergio Pérez'],
    ],
  ],
] as const;

const drivers: Driver[] = teams.flatMap(([team, color, teammates]) =>
  teammates.map(([code, name]) => ({
    id: code.toLowerCase(),
    code,
    name,
    team,
    color,
  })),
);

export const prototypeRace: Race = {
  season: 2026,
  round: 11,
  slug: 'hungary-2026',
  name: 'Hungarian Grand Prix',
  countryCode: 'HU',
  sessions: [
    { id: 'quali', label: 'Qualifying', lockAt: '2026-07-25T14:00:00Z' },
    { id: 'race', label: 'Race', lockAt: '2026-07-26T13:00:00Z' },
  ],
  drivers,
};

export function getSession(sessionId: string): RaceSession | undefined {
  return prototypeRace.sessions.find((session) => session.id === sessionId);
}
