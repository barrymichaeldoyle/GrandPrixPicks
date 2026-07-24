import { redis } from '@devvit/web/server';
import type { SavedPicks } from '../../shared/api';

const raceKey = 'race:hungary-2026';

function entryKey(userId: string, sessionId: string): string {
  return `${raceKey}:entry:${sessionId}:${userId}`;
}

export async function getEntry(
  userId: string,
  sessionId: string,
): Promise<SavedPicks | undefined> {
  const value = await redis.get(entryKey(userId, sessionId));
  return value ? (JSON.parse(value) as SavedPicks) : undefined;
}

export async function saveEntry(
  userId: string,
  sessionId: string,
  entry: SavedPicks,
): Promise<void> {
  await redis.set(entryKey(userId, sessionId), JSON.stringify(entry));
}

export async function registerPlayer(userId: string): Promise<number> {
  const playerKey = `${raceKey}:player:${userId}`;
  const existing = await redis.get(playerKey);

  if (!existing) {
    await redis.set(playerKey, '1');
    await redis.incrBy(`${raceKey}:player-count`, 1);
  }

  return getPlayerCount();
}

export async function getPlayerCount(): Promise<number> {
  const value = await redis.get(`${raceKey}:player-count`);
  return value ? Number.parseInt(value, 10) : 0;
}

export const canonicalPostKey = `${raceKey}:canonical-post`;
