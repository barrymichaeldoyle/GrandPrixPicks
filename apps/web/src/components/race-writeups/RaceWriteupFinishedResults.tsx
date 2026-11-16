import { RaceWriteupOfficialResult } from '@/components/race-writeups/RaceWriteupOfficialResult';
import { SessionConsensusSections } from '@/components/SessionConsensus';
import type { RaceWriteupData } from '@/lib/raceWriteupLoader';
import { getSessionsForWeekend } from '@/lib/sessions';

/**
 * What a finished write-up is an archive of: the official Top 5 of each scored
 * session, then how players picked it.
 *
 * Until November 2026 the write-ups built on `loadRaceWriteup` said "results
 * are on the race page" and stopped. That page is noindexed and canonicalised
 * to the write-up, so the result and the player consensus, the one thing here
 * no other site can print, were on no page search could see. Loader data, so
 * both are in the SSR HTML. Each renders nothing until it has a session.
 */
export function RaceWriteupFinishedResults({
  data,
  venueName,
}: {
  data: Pick<RaceWriteupData, 'race' | 'top5' | 'consensus'>;
  venueName: string;
}) {
  const { race, top5, consensus } = data;
  const sessions = getSessionsForWeekend(race.hasSprint ?? false).map(
    (session) => ({ session, classification: top5[session] ?? [] }),
  );
  const consensusSessions = sessions.flatMap(({ session, classification }) => {
    const sessionConsensus = consensus[session];
    return sessionConsensus
      ? [{ session, classification, consensus: sessionConsensus }]
      : [];
  });

  return (
    <>
      <RaceWriteupOfficialResult sessions={sessions} venueName={venueName} />
      <SessionConsensusSections sessions={consensusSessions} />
    </>
  );
}

/**
 * "X won ahead of Y and Z." for a finished hero, or `undefined` before the
 * race result is published, so the hero falls back to its generic line.
 */
export function finishedRaceSummary(
  top5: RaceWriteupData['top5'],
): string | undefined {
  const podium = top5.race?.slice(0, 3) ?? [];
  if (podium.length < 3) {
    return undefined;
  }
  return `${podium[0]!.displayName} won ahead of ${podium[1]!.displayName} and ${podium[2]!.displayName}. Compare the official Top 5 with how players picked.`;
}
