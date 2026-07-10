import { useUserDateFormat } from '../../lib/dates';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import type { RaceWeekend } from '../../types';
import { useTypography } from '../../theme/typography';
import { Image, Text, View } from '../../tw';

type RaceDetailHeroProps = {
  race: RaceWeekend;
  /** Optional explicit round number to display in the eyebrow. */
  round?: number;
};

/**
 * Cinematic header — blurred country flag bleeds through a dark overlay,
 * type sits on top. Intentionally has no chrome (no border, no shadow,
 * no nested badges) so it reads as a banner, not a card.
 */
export function RaceDetailHero({ race, round }: RaceDetailHeroProps) {
  const { titleFontFamily } = useTypography();
  const { formatLongDate } = useUserDateFormat();
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const weekendDate = formatLongDate(race.weekendStart);

  return (
    <View className="min-h-[132px] overflow-hidden rounded-xl">
      {countryCode ? (
        <Image
          blurRadius={10}
          source={{ uri: `https://flagcdn.com/w640/${countryCode}.png` }}
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
      <View className="absolute inset-0 bg-page/80" />
      <View className="gap-1 px-[18px] py-[18px]">
        <Text className="text-[10px] font-extrabold text-accent-hover">
          {round != null ? `ROUND ${round}` : race.country.toUpperCase()}
          {race.hasSprint ? '  ·  SPRINT' : ''}
        </Text>
        <Text
          numberOfLines={2}
          className="text-foreground mt-0.5 text-[26px] leading-[30px] font-extrabold"
          style={titleFontFamily ? { fontFamily: titleFontFamily } : undefined}
        >
          {race.name}
        </Text>
        <Text className="text-muted mt-1 text-[13px]">{weekendDate}</Text>
      </View>
    </View>
  );
}
