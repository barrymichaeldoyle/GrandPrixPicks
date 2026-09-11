import type { RaceWeekend } from '../types';

type FeaturedNextSession = {
  type: string;
  label: string;
  startAt: number;
};

const SESSION_LABEL: Record<string, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

/**
 * The weekend the home hero names: the next one that still has a session
 * ahead, or an empty session list (a weekend that has not been timed yet).
 */
export function getFeatured(
  races: ReadonlyArray<RaceWeekend>,
  now: number,
): {
  race: RaceWeekend;
  round: number;
  nextSession: FeaturedNextSession | null;
} | null {
  const sorted = races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    );
  const upcomingIndex = sorted.findIndex(
    (r) =>
      r.sessions.length === 0 ||
      new Date(r.sessions[r.sessions.length - 1].startsAt).getTime() > now,
  );
  if (upcomingIndex === -1) {
    return null;
  }
  const race = sorted[upcomingIndex];
  // The round is the backend's, not this list's. Deriving it from the sorted
  // index assumed the list was always a complete season numbered from one, so
  // any gap, filter or extra entry shifted every round number on the hero: dev
  // renders 25 races and showed the round 12 Dutch GP as "ROUND 14".
  const round = race.round;
  let nextSession: FeaturedNextSession | null = null;
  for (const session of race.sessions) {
    const startAt = new Date(session.startsAt).getTime();
    if (startAt > now) {
      nextSession = {
        type: session.type,
        label: SESSION_LABEL[session.type] ?? session.type,
        startAt,
      };
      break;
    }
  }
  return { race, round, nextSession };
}
