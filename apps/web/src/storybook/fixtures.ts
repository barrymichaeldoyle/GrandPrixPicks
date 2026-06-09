/**
 * Shared mock data for Storybook stories.
 *
 * Author stories against these fixtures rather than re-defining drivers,
 * races, users, etc. inline. New stories should add to this file when they
 * need a new shape — keeping fixtures here makes stories cheaper to write
 * and visually consistent across the codebase.
 *
 * Convex IDs are branded strings; use `fakeId<'tableName'>(value)` to cast.
 */
import type { Id, TableNames } from '@convex-generated/dataModel';

/** Brand a string as a Convex Id of the given table. Stories only. */
export function fakeId<T extends TableNames>(value: string) {
  return value as Id<T>;
}

// ── Time helpers ───────────────────────────────────────────────────────────

export const NOW = Date.now();
export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

// ── Drivers (2026 grid) ────────────────────────────────────────────────────

export type MockDriver = {
  _id: Id<'drivers'>;
  code: string;
  displayName: string;
  team: string;
  number: number;
  nationality: string;
};

function buildDriver(
  id: string,
  code: string,
  displayName: string,
  team: string,
  number: number,
  nationality: string,
): MockDriver {
  return {
    _id: fakeId<'drivers'>(id),
    code,
    displayName,
    team,
    number,
    nationality,
  };
}

export const mockDrivers = {
  VER: buildDriver(
    'drv-ver',
    'VER',
    'Max Verstappen',
    'Red Bull Racing',
    1,
    'NL',
  ),
  HAM: buildDriver('drv-ham', 'HAM', 'Lewis Hamilton', 'Ferrari', 44, 'GB'),
  LEC: buildDriver('drv-lec', 'LEC', 'Charles Leclerc', 'Ferrari', 16, 'MC'),
  RUS: buildDriver('drv-rus', 'RUS', 'George Russell', 'Mercedes', 63, 'GB'),
  ANT: buildDriver('drv-ant', 'ANT', 'Kimi Antonelli', 'Mercedes', 12, 'IT'),
  NOR: buildDriver('drv-nor', 'NOR', 'Lando Norris', 'McLaren', 4, 'GB'),
  PIA: buildDriver('drv-pia', 'PIA', 'Oscar Piastri', 'McLaren', 81, 'AU'),
  ALO: buildDriver(
    'drv-alo',
    'ALO',
    'Fernando Alonso',
    'Aston Martin',
    14,
    'ES',
  ),
  STR: buildDriver('drv-str', 'STR', 'Lance Stroll', 'Aston Martin', 18, 'CA'),
  GAS: buildDriver('drv-gas', 'GAS', 'Pierre Gasly', 'Alpine', 10, 'FR'),
  DOO: buildDriver('drv-doo', 'DOO', 'Jack Doohan', 'Alpine', 7, 'AU'),
  HUL: buildDriver(
    'drv-hul',
    'HUL',
    'Nico Hulkenberg',
    'Kick Sauber',
    27,
    'DE',
  ),
  BOR: buildDriver(
    'drv-bor',
    'BOR',
    'Gabriel Bortoleto',
    'Kick Sauber',
    5,
    'BR',
  ),
  TSU: buildDriver(
    'drv-tsu',
    'TSU',
    'Yuki Tsunoda',
    'Red Bull Racing',
    22,
    'JP',
  ),
  HAD: buildDriver('drv-had', 'HAD', 'Isack Hadjar', 'Racing Bulls', 6, 'FR'),
  LAW: buildDriver('drv-law', 'LAW', 'Liam Lawson', 'Racing Bulls', 30, 'NZ'),
  OCO: buildDriver('drv-oco', 'OCO', 'Esteban Ocon', 'Haas', 31, 'FR'),
  BEA: buildDriver('drv-bea', 'BEA', 'Oliver Bearman', 'Haas', 87, 'GB'),
  ALB: buildDriver('drv-alb', 'ALB', 'Alex Albon', 'Williams', 23, 'TH'),
  SAI: buildDriver('drv-sai', 'SAI', 'Carlos Sainz', 'Williams', 55, 'ES'),
} as const;

// ── Users ──────────────────────────────────────────────────────────────────

export type MockUser = {
  _id: Id<'users'>;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

export const mockViewer: MockUser = {
  _id: fakeId<'users'>('user-viewer'),
  username: 'barry',
  displayName: 'Barry',
  avatarUrl: 'https://i.pravatar.cc/80?img=13',
};

export const mockOtherUsers: ReadonlyArray<MockUser> = [
  {
    _id: fakeId<'users'>('user-nina'),
    username: 'nina',
    displayName: 'Nina Costa',
    avatarUrl: 'https://i.pravatar.cc/80?img=5',
  },
  {
    _id: fakeId<'users'>('user-sam'),
    username: 'sam',
    displayName: 'Sam Reid',
    avatarUrl: 'https://i.pravatar.cc/80?img=12',
  },
  {
    _id: fakeId<'users'>('user-lee'),
    username: 'lee',
    displayName: 'Lee Harper',
    avatarUrl: 'https://i.pravatar.cc/80?img=15',
  },
  {
    _id: fakeId<'users'>('user-mia'),
    username: 'mia',
    displayName: 'Mia Park',
    avatarUrl: 'https://i.pravatar.cc/80?img=24',
  },
];
