import type { SessionType } from '@grandprixpicks/shared/sessions';

export type RaceSession = {
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

export type Driver = {
  code: string;
  fullName: string;
  id: string;
  team: string;
};

export type H2HMatchup = {
  driverAId: string;
  driverBId: string;
  id: string;
  team: string;
};
