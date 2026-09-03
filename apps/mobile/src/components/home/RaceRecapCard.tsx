import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';
import { promotedRaceRecap } from '@grandprixpicks/shared/raceRecap';
import { useIsBefore } from '../../lib/useNow';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useMobileConfig } from '../../providers/mobile-config';
import { useTypography } from '../../theme/typography';
import { Pressable, Text, View } from '../../tw';
import { Avatar } from '../ui/Avatar';
import { FlagImage } from '../ui/FlagImage';
import { Numeral } from '../ui/Numeral';

/** Both stacks this card can appear in expose a race detail screen. */
type RecapNavigation = NavigationProp<{
  RaceDetail: { raceSlug: string };
}>;

/**
 * The Grand Prix that just ran, above the picker for the next one.
 *
 * The same eight-hour window the web dashboard uses, and the same decision
 * function behind it (`promotedRaceRecap`), so the two apps cannot disagree
 * about whether a weekend is still the thing to show. The backend query carries
 * the window's end; the boundary is read here, because a Convex query re-runs
 * on data change and never because time passed.
 *
 * Renders nothing outside the window, which is most of the calendar.
 */
export function RaceRecapCard({
  /** Spacing below the card, which differs per screen. Applied to the card
   *  itself so nothing is reserved on the screens where it renders nothing. */
  className = '',
}: {
  className?: string;
} = {}) {
  const { convexEnabled } = useMobileConfig();
  const { titleFontFamily } = useTypography();
  const recap = useQuery(api.home.getRaceRecap, convexEnabled ? {} : 'skip');
  const weekend = useQuery(
    api.races.getCurrentWeekend,
    convexEnabled ? {} : 'skip',
  );
  const navigation = useNavigation<RecapNavigation>();
  const withinWindow = useIsBefore(recap?.windowEndsAt);

  const promoted = promotedRaceRecap(
    recap,
    weekend?.race._id,
    // A weekend query that has not answered yet is not proof the picker below
    // is showing a different race, so hold the card until it has.
    withinWindow && weekend !== undefined,
  );
  if (!promoted) {
    return null;
  }

  const viewer = promoted.viewer;

  return (
    <Pressable
      accessibilityRole="button"
      className={`gap-3 rounded-xl border border-border bg-surface p-4 active:opacity-80 ${className}`}
      onPress={() =>
        navigation.navigate('RaceDetail', { raceSlug: promoted.race.slug })
      }
    >
      <View className="flex-row items-center gap-3">
        <FlagImage raceSlug={promoted.race.slug} />
        <View className="flex-1">
          <Text className="text-muted text-[10px] font-bold uppercase">
            {`Round ${promoted.race.round} · Result`}
          </Text>
          <Text
            className="text-foreground mt-0.5 text-lg font-bold"
            numberOfLines={1}
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            {promoted.race.name}
          </Text>
        </View>
      </View>

      {promoted.status === 'pending' ? (
        <Text className="text-muted text-[13px]">Results pending.</Text>
      ) : viewer ? (
        <View className="flex-row items-end justify-between gap-3">
          <View className="flex-row items-baseline gap-1">
            <Numeral tone="accent" variant="large">
              {viewer.points}
            </Numeral>
            <Text className="text-muted text-[11px] font-bold">pts</Text>
          </View>
          <View className="items-end gap-0.5">
            <Numeral variant="body">
              {`P${viewer.rank} of ${viewer.fieldSize}`}
            </Numeral>
            {viewer.seasonRank == null ? null : (
              <View className="flex-row items-center gap-1.5">
                <Text className="text-muted text-[11px]">
                  {`Season P${viewer.seasonRank}`}
                </Text>
                <SeasonMove delta={viewer.seasonRankDelta} />
              </View>
            )}
          </View>
        </View>
      ) : (
        <Text className="text-muted text-[13px]">
          You had no picks for this race.
        </Text>
      )}

      {promoted.friends.length > 1 ? (
        <View className="gap-1 border-t border-border pt-3">
          <Text className="text-muted mb-1 text-[10px] font-bold uppercase">
            Players you follow
          </Text>
          {promoted.friends.map((player) => (
            <View
              className="flex-row items-center gap-2.5 py-1"
              key={player.userId}
            >
              <View className="w-9">
                <Numeral tone="muted" variant="small">
                  {`P${player.rank}`}
                </Numeral>
              </View>
              <Avatar
                imageUrl={player.avatarUrl}
                name={resolveDisplayName(player)}
                size="sm"
              />
              <Text
                className={`flex-1 text-[13px] ${
                  player.isViewer
                    ? 'text-foreground font-bold'
                    : 'text-foreground'
                }`}
                numberOfLines={1}
              >
                {resolveDisplayName(player)}
              </Text>
              <Numeral variant="small">{`${player.points} pts`}</Numeral>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Season position change. `null` is a player with no previous standing to
 * compare against, which is not the same statement as "did not move".
 */
function SeasonMove({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <Text className="text-muted text-[10px] font-bold uppercase">New</Text>
    );
  }
  if (delta === 0) {
    return <Text className="text-muted text-[11px]">—</Text>;
  }

  const up = delta > 0;
  return (
    <Numeral tone={up ? 'gain' : 'loss'} variant="small">
      {`${up ? '▲' : '▼'} ${Math.abs(delta)}`}
    </Numeral>
  );
}
