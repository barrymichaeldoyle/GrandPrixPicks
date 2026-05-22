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
import type { TableNames } from '@convex-generated/dataModel';
import type { Doc, Id } from '@convex-generated/dataModel';

/** Brand a string as a Convex Id of the given table. Stories only. */
export function fakeId<T extends TableNames>(value: string) {
  return value as Id<T>;
}

// ── Time helpers ───────────────────────────────────────────────────────────

export const NOW = Date.now();
export const MINUTE = 60 * 1000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

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
  VER: buildDriver('drv-ver', 'VER', 'Max Verstappen', 'Red Bull Racing', 1, 'NL'),
  HAM: buildDriver('drv-ham', 'HAM', 'Lewis Hamilton', 'Ferrari', 44, 'GB'),
  LEC: buildDriver('drv-lec', 'LEC', 'Charles Leclerc', 'Ferrari', 16, 'MC'),
  RUS: buildDriver('drv-rus', 'RUS', 'George Russell', 'Mercedes', 63, 'GB'),
  ANT: buildDriver('drv-ant', 'ANT', 'Kimi Antonelli', 'Mercedes', 12, 'IT'),
  NOR: buildDriver('drv-nor', 'NOR', 'Lando Norris', 'McLaren', 4, 'GB'),
  PIA: buildDriver('drv-pia', 'PIA', 'Oscar Piastri', 'McLaren', 81, 'AU'),
  ALO: buildDriver('drv-alo', 'ALO', 'Fernando Alonso', 'Aston Martin', 14, 'ES'),
  STR: buildDriver('drv-str', 'STR', 'Lance Stroll', 'Aston Martin', 18, 'CA'),
  GAS: buildDriver('drv-gas', 'GAS', 'Pierre Gasly', 'Alpine', 10, 'FR'),
  DOO: buildDriver('drv-doo', 'DOO', 'Jack Doohan', 'Alpine', 7, 'AU'),
  HUL: buildDriver('drv-hul', 'HUL', 'Nico Hulkenberg', 'Kick Sauber', 27, 'DE'),
  BOR: buildDriver('drv-bor', 'BOR', 'Gabriel Bortoleto', 'Kick Sauber', 5, 'BR'),
  TSU: buildDriver('drv-tsu', 'TSU', 'Yuki Tsunoda', 'Red Bull Racing', 22, 'JP'),
  HAD: buildDriver('drv-had', 'HAD', 'Isack Hadjar', 'Racing Bulls', 6, 'FR'),
  LAW: buildDriver('drv-law', 'LAW', 'Liam Lawson', 'Racing Bulls', 30, 'NZ'),
  OCO: buildDriver('drv-oco', 'OCO', 'Esteban Ocon', 'Haas', 31, 'FR'),
  BEA: buildDriver('drv-bea', 'BEA', 'Oliver Bearman', 'Haas', 87, 'GB'),
  ALB: buildDriver('drv-alb', 'ALB', 'Alex Albon', 'Williams', 23, 'TH'),
  SAI: buildDriver('drv-sai', 'SAI', 'Carlos Sainz', 'Williams', 55, 'ES'),
} as const;

export const mockDriverList = Object.values(mockDrivers);

/** Convenience: 5 drivers, in a sensible top-5 podium order. */
export const mockTopFivePicks: ReadonlyArray<Id<'drivers'>> = [
  mockDrivers.NOR._id,
  mockDrivers.VER._id,
  mockDrivers.LEC._id,
  mockDrivers.PIA._id,
  mockDrivers.HAM._id,
];

// ── Races ──────────────────────────────────────────────────────────────────

type MockRace = Doc<'races'>;

function buildRace(overrides: Partial<MockRace> & Pick<MockRace, 'name' | 'slug' | 'round'>): MockRace {
  const raceStartAt = overrides.raceStartAt ?? NOW + 2 * DAY;
  const base: MockRace = {
    _id: fakeId<'races'>(`race-${overrides.slug}`),
    _creationTime: NOW - 30 * DAY,
    season: 2026,
    round: overrides.round,
    name: overrides.name,
    slug: overrides.slug,
    timeZone: 'Europe/London',
    qualiStartAt: raceStartAt - DAY,
    qualiLockAt: raceStartAt - DAY,
    hasSprint: false,
    raceStartAt,
    predictionLockAt: raceStartAt,
    status: 'upcoming',
    createdAt: NOW - 30 * DAY,
    updatedAt: NOW - 30 * DAY,
  };
  return { ...base, ...overrides };
}

/** Regular (non-sprint) weekend, upcoming. */
export const mockRace: MockRace = buildRace({
  name: 'Monaco Grand Prix',
  slug: 'monaco-2026',
  round: 8,
});

/** Sprint weekend, upcoming. */
export const mockSprintRace: MockRace = buildRace({
  name: 'Canadian Grand Prix',
  slug: 'canada-2026',
  round: 5,
  hasSprint: true,
  sprintQualiStartAt: NOW + 1 * DAY,
  sprintQualiLockAt: NOW + 1 * DAY,
  sprintStartAt: NOW + 1 * DAY + 12 * HOUR,
  sprintLockAt: NOW + 1 * DAY + 12 * HOUR,
});

/** Race weekend in progress (quali published, race not yet run). */
export const mockLockedRace: MockRace = buildRace({
  name: 'British Grand Prix',
  slug: 'britain-2026',
  round: 12,
  raceStartAt: NOW + 2 * HOUR,
  predictionLockAt: NOW - MINUTE,
  status: 'locked',
});

/** Finished race. */
export const mockFinishedRace: MockRace = buildRace({
  name: 'Bahrain Grand Prix',
  slug: 'bahrain-2026',
  round: 1,
  raceStartAt: NOW - 30 * DAY,
  predictionLockAt: NOW - 30 * DAY,
  status: 'finished',
});

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

// ── Leaderboard entries ────────────────────────────────────────────────────

export type MockLeaderboardEntry = {
  rank: number;
  userId: Id<'users'>;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  top5Points: number;
  h2hPoints: number;
  raceCount: number;
  isViewer: boolean;
};

/** Top-10 leaderboard with a realistic point spread (no ties). */
export const mockLeaderboardTop10: ReadonlyArray<MockLeaderboardEntry> = [
  { rank: 1, points: 412, top5Points: 350, h2hPoints: 62, raceCount: 5, userId: fakeId<'users'>('lb-1'), username: 'pole_setter', displayName: 'Pole Setter', avatarUrl: 'https://i.pravatar.cc/80?img=1', isViewer: false },
  { rank: 2, points: 388, top5Points: 320, h2hPoints: 68, raceCount: 5, userId: fakeId<'users'>('lb-2'), username: 'apex_anna', displayName: 'Apex Anna', avatarUrl: 'https://i.pravatar.cc/80?img=2', isViewer: false },
  { rank: 3, points: 365, top5Points: 305, h2hPoints: 60, raceCount: 5, userId: fakeId<'users'>('lb-3'), username: 'triple_apex', displayName: 'Triple Apex', avatarUrl: 'https://i.pravatar.cc/80?img=3', isViewer: false },
  { rank: 4, points: 342, top5Points: 290, h2hPoints: 52, raceCount: 5, userId: fakeId<'users'>('lb-4'), username: 'grid_guru', displayName: 'Grid Guru', avatarUrl: 'https://i.pravatar.cc/80?img=4', isViewer: false },
  { rank: 5, points: 318, top5Points: 270, h2hPoints: 48, raceCount: 5, userId: mockViewer._id, username: mockViewer.username, displayName: mockViewer.displayName, avatarUrl: mockViewer.avatarUrl, isViewer: true },
  { rank: 6, points: 295, top5Points: 245, h2hPoints: 50, raceCount: 5, userId: fakeId<'users'>('lb-6'), username: 'double_dip', displayName: 'Double Dip', avatarUrl: 'https://i.pravatar.cc/80?img=6', isViewer: false },
  { rank: 7, points: 271, top5Points: 230, h2hPoints: 41, raceCount: 5, userId: fakeId<'users'>('lb-7'), username: 'box_box_box', displayName: 'Box Box Box', avatarUrl: 'https://i.pravatar.cc/80?img=7', isViewer: false },
  { rank: 8, points: 244, top5Points: 200, h2hPoints: 44, raceCount: 4, userId: fakeId<'users'>('lb-8'), username: 'pitlane_pete', displayName: 'Pitlane Pete', avatarUrl: 'https://i.pravatar.cc/80?img=8', isViewer: false },
  { rank: 9, points: 218, top5Points: 180, h2hPoints: 38, raceCount: 4, userId: fakeId<'users'>('lb-9'), username: 'safety_car', displayName: 'Safety Car', avatarUrl: 'https://i.pravatar.cc/80?img=9', isViewer: false },
  { rank: 10, points: 195, top5Points: 165, h2hPoints: 30, raceCount: 4, userId: fakeId<'users'>('lb-10'), username: 'backmarker_bea', displayName: 'Backmarker Bea', avatarUrl: 'https://i.pravatar.cc/80?img=10', isViewer: false },
];

/** Top-3 podium. */
export const mockLeaderboardTop3 = mockLeaderboardTop10.slice(0, 3);

/** Leaderboard with a 3-way tie at the top (useful for verifying competition-rank rendering). */
export const mockLeaderboardTied: ReadonlyArray<MockLeaderboardEntry> = [
  { ...mockLeaderboardTop10[0]!, rank: 1, points: 312 },
  { ...mockLeaderboardTop10[1]!, rank: 1, points: 312 },
  { ...mockLeaderboardTop10[2]!, rank: 1, points: 312 },
  { ...mockLeaderboardTop10[3]!, rank: 4, points: 285 },
  { ...mockLeaderboardTop10[4]!, rank: 4, points: 285 },
];
