const SUFFIX = ' | Grand Prix Picks';
const MAX_TITLE = 60;

/**
 * The `<title>` of a race page: `Australian Grand Prix 2026 Results | Grand
 * Prix Picks`.
 *
 * Google truncates past about 60 characters, and the longest race name on the
 * calendar ("Barcelona-Catalunya Grand Prix") takes the title to 62. A title
 * that would run over says "GP" instead, which keeps the venue whole: cutting
 * the brand suffix would lose less text, but every other page carries it.
 */
export function racePageTitle(
  raceName: string,
  season: number,
  kind: 'Results' | 'Predictions',
): string {
  const title = `${raceName} ${season} ${kind}${SUFFIX}`;
  if (title.length <= MAX_TITLE) {
    return title;
  }
  return `${raceName.replace(/Grand Prix$/, 'GP')} ${season} ${kind}${SUFFIX}`;
}
