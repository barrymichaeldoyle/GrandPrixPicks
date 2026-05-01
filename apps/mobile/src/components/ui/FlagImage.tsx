import { Image, StyleSheet, View } from 'react-native';

import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import { colors } from '../../theme/tokens';

type FlagImageProps = {
  raceSlug: string;
};

export function FlagImage({ raceSlug }: FlagImageProps) {
  const countryCode = getCountryCodeForRaceSlug(raceSlug);

  if (!countryCode) {
    return null;
  }

  return (
    <View style={styles.frame}>
      <Image
        source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderColor: colors.borderStrong,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    height: 20,
    width: 30,
  },
});
