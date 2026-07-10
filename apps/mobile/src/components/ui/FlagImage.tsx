import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { Image, View } from '../../tw';

type FlagImageProps = {
  raceSlug: string;
};

export function FlagImage({ raceSlug }: FlagImageProps) {
  const countryCode = getCountryCodeForRaceSlug(raceSlug);

  if (!countryCode) {
    return null;
  }

  return (
    <View className="overflow-hidden rounded border border-border-strong">
      <Image
        source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
        className="h-5 w-[30px]"
      />
    </View>
  );
}
