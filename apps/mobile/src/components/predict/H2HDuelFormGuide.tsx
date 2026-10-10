import { duelFormGuideRows } from '@grandprixpicks/shared/duelFormGuide';
import type { SessionType } from '@grandprixpicks/shared/sessions';

import { api, type ConvexId } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useTypography } from '../../theme/typography';
import { Text, View } from '../../tw';
import type { H2HDuelMatchup } from './H2HDuelQuestion';

/**
 * The form guide under a duel. Port of web's `H2HDuelFormGuide`, built from
 * the same rows (`duelFormGuideRows`): the pair's head-to-head record this
 * season, then their positions in every session this weekend that has a
 * result. It reports and stops; nothing on it says who to pick.
 *
 * Set as a timing sheet: a label column and two figure columns headed by the
 * driver codes, the better figure in the text colour and the other muted.
 * All three reads are race- or season-wide, so stepping through eleven duels
 * reuses the same subscriptions.
 */
export function H2HDuelFormGuide({
  matchup,
  sessionType,
  raceId,
}: {
  matchup: H2HDuelMatchup;
  /** Undefined when one set of calls covers every open session. */
  sessionType?: SessionType;
  raceId: ConvexId<'races'>;
}) {
  const { numeralFontFamily } = useTypography();
  const battles = useQuery(api.h2h.getTeammateBattles, {});
  const practice = useQuery(api.practiceResults.getPracticeResultsForRace, {
    raceId,
  });
  const sessions = useQuery(api.results.getWeekendSessionPositions, {
    raceId,
  });

  const rows = duelFormGuideRows({
    driver1: matchup.driver1,
    driver2: matchup.driver2,
    sessionType,
    battle: battles?.teams?.find((team) => team.matchupId === matchup._id),
    practice: practice ?? undefined,
    sessions,
  });

  if (rows.length === 0) {
    return null;
  }

  const mono = numeralFontFamily ? { fontFamily: numeralFontFamily } : null;
  const figure = 'w-14 text-right text-sm';

  return (
    <View
      accessibilityLabel={`Form guide, ${matchup.driver1.code} and ${matchup.driver2.code}`}
      className="mt-4 w-full self-center"
      style={{ maxWidth: 320 }}
      testID="h2h-duel-form-guide"
    >
      <View className="flex-row items-center pb-1" aria-hidden>
        <View className="flex-1" />
        <Text className="text-muted w-14 text-right text-xs" style={mono}>
          {matchup.driver1.code}
        </Text>
        <Text className="text-muted w-14 text-right text-xs" style={mono}>
          {matchup.driver2.code}
        </Text>
      </View>
      {rows.map((row) => (
        <View
          key={row.key}
          accessibilityLabel={`${row.label}: ${matchup.driver1.code} ${row.values[0]}, ${matchup.driver2.code} ${row.values[1]}`}
          accessible
          className="flex-row items-center border-t border-border py-1"
        >
          <Text className="text-muted flex-1 pr-3 text-xs" numberOfLines={1}>
            {row.label}
          </Text>
          <Text
            className={`${figure} ${row.edge === 'driver2' ? 'text-muted' : 'text-foreground'}`}
            style={mono}
          >
            {row.values[0]}
          </Text>
          <Text
            className={`${figure} ${row.edge === 'driver1' ? 'text-muted' : 'text-foreground'}`}
            style={mono}
          >
            {row.values[1]}
          </Text>
        </View>
      ))}
    </View>
  );
}
