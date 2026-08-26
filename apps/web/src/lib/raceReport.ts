import type { SessionType } from './sessions';

/**
 * The subset of an enriched classification entry the report needs. Matches
 * `results.getResultForRace`'s `enrichedClassification`.
 */
export type RaceReportEntry = {
  position: number;
  displayName: string;
  team?: string | null;
  status?: string | null;
};

export type RaceReportResults = Partial<
  Record<SessionType, { enrichedClassification?: RaceReportEntry[] } | null>
>;

export type RaceReportInput = {
  raceName: string;
  season: number;
  circuitName?: string | null;
  hasSprint?: boolean;
  resultsBySession: RaceReportResults;
};

function classificationFor(
  results: RaceReportResults,
  session: SessionType,
): RaceReportEntry[] {
  return results[session]?.enrichedClassification ?? [];
}

function withTeam(entry: RaceReportEntry | undefined): string | null {
  if (!entry) {
    return null;
  }
  return entry.team
    ? `${entry.displayName} (${entry.team})`
    : entry.displayName;
}

/**
 * A short, factual account of a finished race weekend, built from the
 * published classifications the page already holds.
 *
 * The race page previously carried no prose of its own: every word on it came
 * from the shared circuit guide, which is byte-identical to `/circuits/:slug`.
 * A page titled "<Race> <Year> Results" that contains no unique sentence is
 * thin by any measure, and this app has a low-value-content rejection in its
 * history. These sentences are the page's own content, they render from loader
 * data so a crawler sees them in the SSR HTML, and every one of them is
 * derived rather than written, so none can go stale or be wrong.
 *
 * Returns an empty array when the race itself has not been scored: a
 * half-finished weekend gets no narrative.
 */
export function buildRaceReport({
  raceName,
  season,
  circuitName,
  hasSprint = false,
  resultsBySession,
}: RaceReportInput): string[] {
  const race = classificationFor(resultsBySession, 'race');
  if (race.length === 0) {
    return [];
  }

  const sentences: string[] = [];

  const winner = withTeam(race[0]);
  if (!winner) {
    return [];
  }
  const venue = circuitName ? ` at ${circuitName}` : '';
  const second = race[1]?.displayName;
  const third = race[2]?.displayName;
  const podium =
    second && third
      ? `, ahead of ${second} and ${third}`
      : second
        ? `, ahead of ${second}`
        : '';
  sentences.push(`${winner} won the ${season} ${raceName}${venue}${podium}.`);

  const polesitter = withTeam(classificationFor(resultsBySession, 'quali')[0]);
  const sprintWinner = hasSprint
    ? withTeam(classificationFor(resultsBySession, 'sprint')[0])
    : null;
  if (polesitter && sprintWinner) {
    sentences.push(
      `${polesitter} took pole position, and ${sprintWinner} won the sprint.`,
    );
  } else if (polesitter) {
    sentences.push(`${polesitter} took pole position.`);
  } else if (sprintWinner) {
    sentences.push(`${sprintWinner} won the sprint.`);
  }

  const retirements = race.filter((entry) => entry.status != null).length;
  if (retirements > 0) {
    sentences.push(
      retirements === 1
        ? `1 of the ${race.length} drivers classified did not finish.`
        : `${retirements} of the ${race.length} drivers classified did not finish.`,
    );
  }

  return sentences;
}
