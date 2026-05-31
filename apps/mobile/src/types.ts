import type { SessionType } from '@grandprixpicks/shared/sessions';

type RaceSession = {
  startsAt: string;
  type: SessionType;
};

export type RaceWeekend = {
  country: string;
  hasSprint: boolean;
  name: string;
  sessions: ReadonlyArray<RaceSession>;
  slug: string;
  weekendStart: string;
};
