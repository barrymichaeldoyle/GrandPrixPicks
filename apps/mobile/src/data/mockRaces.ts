import { getSessionsForWeekend } from "@grandprixpicks/shared/sessions";

import type { RaceWeekend } from "../types";

function buildSessions(weekendStart: string, hasSprint: boolean) {
  const start = new Date(weekendStart);

  return getSessionsForWeekend(hasSprint).map((sessionType, index) => {
    const sessionDate = new Date(start);
    sessionDate.setUTCHours(10 + index * 5, 0, 0, 0);

    return {
      startsAt: sessionDate.toISOString(),
      type: sessionType,
    };
  });
}

export const mockRaceWeekends: ReadonlyArray<RaceWeekend> = [
  {
    country: "Australia",
    hasSprint: false,
    name: "Australian Grand Prix",
    sessions: buildSessions("2026-03-13T00:00:00.000Z", false),
    slug: "australia-2026",
    weekendStart: "2026-03-13T00:00:00.000Z",
  },
  {
    country: "China",
    hasSprint: true,
    name: "Chinese Grand Prix",
    sessions: buildSessions("2026-03-20T00:00:00.000Z", true),
    slug: "china-2026",
    weekendStart: "2026-03-20T00:00:00.000Z",
  },
  {
    country: "Japan",
    hasSprint: false,
    name: "Japanese Grand Prix",
    sessions: buildSessions("2026-04-03T00:00:00.000Z", false),
    slug: "japan-2026",
    weekendStart: "2026-04-03T00:00:00.000Z",
  },
];
