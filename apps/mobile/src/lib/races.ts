import { getSessionsForWeekend } from "@grandprixpicks/shared/sessions";

import type { ConvexDoc } from "../integrations/convex/api";
import type { RaceWeekend } from "../types";

function toIso(value: number | undefined): string | null {
  if (typeof value !== "number") {
    return null;
  }
  return new Date(value).toISOString();
}

export function mapConvexRaceToWeekend(
  race: ConvexDoc<"races">,
): RaceWeekend | null {
  const raceStartIso = toIso(race.raceStartAt);
  const predictionLockIso = toIso(race.predictionLockAt);
  if (!raceStartIso || !predictionLockIso) {
    return null;
  }

  const hasSprint = Boolean(race.hasSprint);
  const sessionStartsByType = {
    quali:
      toIso(race.qualiStartAt) ?? toIso(race.qualiLockAt) ?? predictionLockIso,
    sprint_quali:
      toIso(race.sprintQualiStartAt) ??
      toIso(race.sprintQualiLockAt) ??
      predictionLockIso,
    sprint:
      toIso(race.sprintStartAt) ??
      toIso(race.sprintLockAt) ??
      predictionLockIso,
    race: raceStartIso,
  } as const;

  return {
    country: race.name.split(" ")[0] ?? race.name,
    hasSprint,
    name: race.name,
    sessions: getSessionsForWeekend(hasSprint).map((sessionType) => ({
      startsAt: sessionStartsByType[sessionType],
      type: sessionType,
    })),
    slug: race.slug,
    weekendStart: raceStartIso,
  };
}
