import { getRaceTimeZoneFromSlug } from "@grandprixpicks/shared/raceTimezones";

export function formatRaceDate(isoDate: string, raceSlug: string) {
  const date = new Date(isoDate);
  const raceTimeZone = getRaceTimeZoneFromSlug(raceSlug);

  return {
    local: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date),
    track: new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: raceTimeZone ?? "UTC",
    }).format(date),
    trackTimeZone: raceTimeZone ?? "UTC",
  };
}
