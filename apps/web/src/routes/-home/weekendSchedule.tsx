import { getWeekendSessionStarts } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';

export type SessionEntry = {
  type: SessionType;
  label: string;
  startAt: number;
};

export function buildSessions(
  race: Parameters<typeof getWeekendSessionStarts>[0],
): SessionEntry[] {
  return getWeekendSessionStarts(race).map((entry) => ({
    ...entry,
    label: SESSION_LABELS[entry.type],
  }));
}

export type SessionStatus = 'finished' | 'in_progress' | 'upcoming';

export function getSessionStatus(
  session: SessionEntry,
  publishedSessions: SessionType[],
  now: number,
): SessionStatus {
  if (publishedSessions.includes(session.type)) {
    return 'finished';
  }
  if (session.startAt <= now) {
    return 'in_progress';
  }
  return 'upcoming';
}
