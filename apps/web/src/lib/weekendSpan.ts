/**
 * "19–21 Nov", or "30 Oct–1 Nov" across a month end: first practice to the
 * race, in track time. Read from the race rather than typed beside it, so a
 * rescheduled round cannot keep its old dates in the eyebrow while the schedule
 * card under it shows the new ones.
 */
export function formatWeekendSpan(
  race: { fp1StartAt?: number; raceStartAt: number },
  timeZone: string,
): string {
  function parts(timestamp: number) {
    const formatted = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone,
    }).formatToParts(timestamp);
    return {
      day: formatted.find((part) => part.type === 'day')?.value ?? '',
      month: formatted.find((part) => part.type === 'month')?.value ?? '',
    };
  }
  const end = parts(race.raceStartAt);
  if (race.fp1StartAt === undefined) {
    return `${end.day} ${end.month}`;
  }
  const start = parts(race.fp1StartAt);
  return start.month === end.month
    ? `${start.day}–${end.day} ${end.month}`
    : `${start.day} ${start.month}–${end.day} ${end.month}`;
}
