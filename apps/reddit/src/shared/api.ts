import type { Race } from './race';

export type SavedPicks = {
  picks: string[];
  savedAt: string;
  revision: number;
};

export type InitResponse = {
  type: 'init';
  loggedIn: boolean;
  username: string | null;
  serverNow: string;
  race: Race;
  playerCount: number;
  entries: Partial<Record<'quali' | 'race', SavedPicks>>;
};

export type SavePicksRequest = {
  sessionId: 'quali' | 'race';
  picks: string[];
};

export type SavePicksResponse = {
  type: 'saved';
  entry: SavedPicks;
  playerCount: number;
};

export type ApiError = {
  type: 'error';
  code: 'INVALID_PICKS' | 'LOCKED' | 'NOT_AUTHENTICATED' | 'SERVER_ERROR';
  message: string;
};
