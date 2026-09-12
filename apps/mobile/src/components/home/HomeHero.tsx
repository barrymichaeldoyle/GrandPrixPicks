import { useWindowDimensions } from 'react-native';

import { getFeatured } from '../../lib/featuredWeekend';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { useNow } from '../../lib/useNow';
import { useTypography } from '../../theme/typography';
import { Image, Text, View } from '../../tw';
import { HomeWeather } from './HomeWeather';
import { SlantedStripe } from '../ui/SlantedStripe';
import { BigCountdown } from '../ui/BigCountdown';
import { Numeral } from '../ui/Numeral';

const NARROW_WIDTH = 360;

export function HomeHero() {
  const { titleFontFamily } = useTypography();
  const { isLoading, races } = useRaceWeekends();
  const { width } = useWindowDimensions();
  const now = useNow(30_000);
  const isNarrow = width < NARROW_WIDTH;

  const featured = getFeatured(races, now);
  if (isLoading || !featured) {
    return null;
  }
  const { race, round, nextSession } = featured;
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const totalRounds = races.length;

  return (
    <View
      className={`overflow-hidden bg-surface ${isNarrow ? 'mb-5' : 'mb-6'}`}
    >
      <SlantedStripe />
      <View
        className={`items-center px-6 py-5 ${isNarrow ? 'gap-3' : 'gap-3.5'}`}
      >
        <View className="w-full flex-col items-center justify-center gap-2.5">
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
            numberOfLines={2}
            className={`text-foreground text-center font-bold ${
              isNarrow ? 'text-[21px]' : 'text-2xl'
            }`}
            style={
              titleFontFamily ? { fontFamily: titleFontFamily } : undefined
            }
          >
            {race.name}
          </Text>
        </View>

        <View className="flex-row flex-wrap items-center justify-center gap-1">
          <Text className="text-muted text-xs font-bold">Round</Text>
          <Numeral tone="muted" variant="small">
            {round}
          </Numeral>
          {totalRounds > 0 ? (
            <Text className="text-muted text-xs font-bold">
              {` / ${totalRounds}`}
            </Text>
          ) : null}
          {race.hasSprint ? (
            <>
              <Text className="text-xs text-border-strong">·</Text>
              <Text className="text-xs font-bold text-accent-hover">
                Sprint weekend
              </Text>
            </>
          ) : null}
        </View>

        {nextSession ? (
          <>
            <HomeWeather
              raceSlug={race.slug}
              startAt={nextSession.startAt}
              now={now}
            />
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
      </View>
    </View>
  );
}
