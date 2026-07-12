import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';

import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { useTypography } from '../../theme/typography';
import { Image, Text, View } from '../../tw';
import type { RaceWeekend } from '../../types';
import type {
  HomeStackParamList,
  RootTabParamList,
} from '../../navigation/types';
import { BigCountdown } from '../ui/BigCountdown';
import { Numeral } from '../ui/Numeral';
import { PrimaryButton } from '../ui/PrimaryButton';

const NARROW_WIDTH = 360;

type NextSession = {
  type: string;
  label: string;
  startAt: number;
};

const SESSION_LABEL: Record<string, string> = {
  quali: 'Qualifying',
  sprint_quali: 'Sprint Qualifying',
  sprint: 'Sprint',
  race: 'Race',
};

function getFeatured(
  races: ReadonlyArray<RaceWeekend>,
  now: number,
): {
  race: RaceWeekend;
  round: number;
  nextSession: NextSession | null;
} | null {
  const sorted = races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    );
  const upcomingIndex = sorted.findIndex(
    (r) =>
      r.sessions.length === 0 ||
      new Date(r.sessions[r.sessions.length - 1].startsAt).getTime() > now,
  );
  if (upcomingIndex === -1) {
    return null;
  }
  const race = sorted[upcomingIndex];
  const round = upcomingIndex + 1;
  let nextSession: NextSession | null = null;
  for (const session of race.sessions) {
    const startAt = new Date(session.startsAt).getTime();
    if (startAt > now) {
      nextSession = {
        type: session.type,
        label: SESSION_LABEL[session.type] ?? session.type,
        startAt,
      };
      break;
    }
  }
  return { race, round, nextSession };
}

export function HomeHero() {
  const { titleFontFamily } = useTypography();
  const { races } = useRaceWeekends();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { width } = useWindowDimensions();
  const isNarrow = width < NARROW_WIDTH;

  const featured = getFeatured(races, Date.now());
  if (!featured) {
    return null;
  }
  const { race, round, nextSession } = featured;
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const totalRounds = races.length;

  return (
    <View
      className={`items-center ${isNarrow ? 'mb-5 gap-3' : 'mb-6 gap-3.5'}`}
    >
      <View className="flex-col items-center justify-center gap-2.5">
        {countryCode ? (
          <View className="h-[30px] w-11 overflow-hidden rounded-md border border-white/20">
            <Image
              source={{
                uri: `https://flagcdn.com/w160/${countryCode}.png`,
              }}
              className="h-full w-full"
              resizeMode="cover"
            />
          </View>
        ) : null}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={2}
          className={`text-foreground text-center font-bold ${
            isNarrow ? 'text-[21px]' : 'text-2xl'
          }`}
          style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
        >
          {race.name}
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center justify-center gap-1">
        <Text className="text-muted text-[10px] font-bold">ROUND</Text>
        <Numeral tone="muted" variant="small">
          {round}
        </Numeral>
        {totalRounds > 0 ? (
          <Text className="text-muted text-[10px] font-bold">
            {` / ${totalRounds}`}
          </Text>
        ) : null}
        {race.hasSprint ? (
          <>
            <Text className="text-[10px] text-border-strong">·</Text>
            <Text className="text-[10px] font-bold text-accent-hover">
              SPRINT WEEKEND
            </Text>
          </>
        ) : null}
      </View>

      {nextSession ? (
        <>
          <View className="mt-0.5 self-stretch">
            <BigCountdown targetAt={nextSession.startAt} />
          </View>
          <Text className="text-muted text-center text-[13px]">
            until{' '}
            <Text className="text-foreground font-bold">
              {nextSession.label}
            </Text>
          </Text>
        </>
      ) : (
        <Text className="text-center text-sm font-bold text-accent-hover">
          Weekend complete
        </Text>
      )}

      <View className="mt-1.5 self-stretch">
        <PrimaryButton
          label="Make predictions"
          onPress={() =>
            navigation
              .getParent<NavigationProp<RootTabParamList>>()
              ?.navigate('PicksTab')
          }
        />
      </View>
    </View>
  );
}
