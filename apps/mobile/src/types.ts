import type { SessionType } from '@grandprixpicks/shared/sessions';

type RaceSession = {
  startsAt: string;
  type: SessionType;
};

export type RaceWeekend = {
  country: string;
  hasSprint: boolean;
  name: string;
  /** The championship round, as the backend records it. Not a list index. */
  round: number;
  sessions: ReadonlyArray<RaceSession>;
  slug: string;
  weekendStart: string;
};
