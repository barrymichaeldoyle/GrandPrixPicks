import { context, reddit } from '@devvit/web/server';
import { Hono } from 'hono';
import type {
  ApiError,
  InitResponse,
  SavePicksRequest,
  SavePicksResponse,
} from '../../shared/api';
import { getSession, prototypeRace } from '../../shared/race';
import {
  getEntry,
  getPlayerCount,
  registerPlayer,
  saveEntry,
} from '../core/storage';

export const api = new Hono();

api.get('/init', async (c) => {
  const { userId } = context;
  const [playerCount, username, qualiEntry, raceEntry] = await Promise.all([
    getPlayerCount(),
    userId ? reddit.getCurrentUsername() : Promise.resolve(undefined),
    userId ? getEntry(userId, 'quali') : Promise.resolve(undefined),
    userId ? getEntry(userId, 'race') : Promise.resolve(undefined),
  ]);

  return c.json<InitResponse>({
    type: 'init',
    loggedIn: Boolean(userId),
    username: username ?? null,
    serverNow: new Date().toISOString(),
    race: prototypeRace,
    playerCount,
    entries: {
      ...(qualiEntry ? { quali: qualiEntry } : {}),
      ...(raceEntry ? { race: raceEntry } : {}),
    },
  });
});

api.post('/picks', async (c) => {
  const { userId } = context;
  if (!userId) {
    return c.json<ApiError>(
      {
        type: 'error',
        code: 'NOT_AUTHENTICATED',
        message: 'Log in to Reddit to save your picks.',
      },
      401,
    );
  }

  const body = await c.req.json<SavePicksRequest>();
  const session = getSession(body.sessionId);
  const validDriverIds = new Set(
    prototypeRace.drivers.map((driver) => driver.id),
  );
  const uniquePicks = new Set(body.picks);

  if (
    !session ||
    body.picks.length !== 5 ||
    uniquePicks.size !== 5 ||
    body.picks.some((driverId) => !validDriverIds.has(driverId))
  ) {
    return c.json<ApiError>(
      {
        type: 'error',
        code: 'INVALID_PICKS',
        message: 'Choose five different drivers before saving.',
      },
      400,
    );
  }

  if (Date.now() >= Date.parse(session.lockAt)) {
    return c.json<ApiError>(
      {
        type: 'error',
        code: 'LOCKED',
        message: `${session.label} has locked. These picks were not saved.`,
      },
      409,
    );
  }

  const existing = await getEntry(userId, body.sessionId);
  const entry = {
    picks: body.picks,
    savedAt: new Date().toISOString(),
    revision: (existing?.revision ?? 0) + 1,
  };

  await saveEntry(userId, body.sessionId, entry);
  const playerCount = await registerPlayer(userId);

  return c.json<SavePicksResponse>({ type: 'saved', entry, playerCount });
});
