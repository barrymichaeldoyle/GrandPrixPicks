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
    <View className="h-5 w-[30px] shrink-0 overflow-hidden rounded border border-border-strong">
      <Image
        source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
        className="h-full w-full"
        resizeMode="cover"
      />
    </View>
  );
}

/** 4:3 nationality flag, same box the web picker uses at `xs`. */
export function NationalityFlag({ code }: { code: string }) {
  return (
    <View className="h-3 w-4 shrink-0 overflow-hidden rounded-[1px] border border-border">
      <Image
        source={{ uri: `https://flagcdn.com/w40/${code.toLowerCase()}.png` }}
        className="h-full w-full"
        resizeMode="cover"
      />
    </View>
  );
}
