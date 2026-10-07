import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';

import { useQuery } from '@/integrations/convex/query';
import { duelFormGuideRows } from '@/lib/duelFormGuide';
import type { SessionType } from '@/lib/sessions';

import type { H2HMatchup } from './H2HMatchupGrid';

/**
 * The form guide under a duel: the pair's head-to-head record this season and
 * their practice positions this weekend, one line each, in the duel's order.
 *
 * A duel used to be two names and a question. A fan deciding it has the
 * season's record and Friday's times in their head anyway, or opens another
 * tab for them; this puts the same facts under the two panels so the decision
 * is made here. It reports and stops: nothing on it says who to pick (see
 * `duelFormGuideRows`).
 *
 * Set as a timing sheet, which is what it is: a label column and two mono
 * figure columns headed by the driver codes, the better figure in the text
 * colour and the other muted. The table is the only chrome; a card around a
 * four-line table in a takeover that already is a card was a frame in a frame.
 *
 * Both reads are cached and shared: the season record is the same query the
 * team-mate battles page runs, and practice is the same payload the dashboard
 * card subscribes to, so stepping through eleven duels costs nothing more.
 */
export function H2HDuelFormGuide({
  matchup,
  sessionType,
  raceId,
  season,
}: {
  matchup: H2HMatchup;
  /** Undefined when one set of calls covers every open session. */
  sessionType?: SessionType;
  raceId: Id<'races'>;
  /** Omit for the current season. */
  season?: number;
}) {
  const battles = useQuery(
    api.h2h.getTeammateBattles,
    season === undefined ? {} : { season },
  );
  const practice = useQuery(api.practiceResults.getPracticeResultsForRace, {
    raceId,
  });

  const rows = duelFormGuideRows({
    driver1: matchup.driver1,
    driver2: matchup.driver2,
    sessionType,
    battle: battles?.teams?.find((team) => team.matchupId === matchup._id),
    practice: practice ?? undefined,
  });

  if (rows.length === 0) {
    return null;
  }

  return (
    <table
      className="mx-auto w-full max-w-xs border-collapse text-sm"
      data-testid="h2h-duel-form-guide"
    >
      <caption className="sr-only">
        Form guide, {matchup.driver1.displayName} and{' '}
        {matchup.driver2.displayName}
      </caption>
      <thead>
        <tr className="text-xs text-text-muted">
          <th scope="col" className="sr-only">
            Measure
          </th>
          <th
            scope="col"
            className="gpp-mono w-14 pb-1 text-right font-medium uppercase"
          >
            {matchup.driver1.code}
          </th>
          <th
            scope="col"
            className="gpp-mono w-14 pb-1 text-right font-medium uppercase"
          >
            {matchup.driver2.code}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-border">
            <th
              scope="row"
              className="py-1 pr-3 text-left text-xs font-normal text-text-muted"
            >
              {row.label}
            </th>
            <td
              className={`gpp-mono py-1 text-right tabular-nums ${
                row.edge === 'driver2' ? 'text-text-muted' : 'text-text'
              }`}
            >
              {row.values[0]}
            </td>
            <td
              className={`gpp-mono py-1 text-right tabular-nums ${
                row.edge === 'driver1' ? 'text-text-muted' : 'text-text'
              }`}
            >
              {row.values[1]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
