import { Image, StyleSheet, Text, View } from 'react-native';

import { useUserDateFormat } from '../../lib/dates';
import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import type { RaceWeekend } from '../../types';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type RaceDetailHeroProps = {
  race: RaceWeekend;
  /** Optional explicit round number to display in the eyebrow. */
  round?: number;
};

const HERO_HEIGHT = 132;

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
    <View style={styles.container}>
      {countryCode ? (
        <Image
          blurRadius={10}
          source={{ uri: `https://flagcdn.com/w640/${countryCode}.png` }}
          style={styles.flag}
        />
      ) : null}
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>
          {round != null ? `ROUND ${round}` : race.country.toUpperCase()}
          {race.hasSprint ? '  ·  SPRINT' : ''}
        </Text>
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          {race.name}
        </Text>
        <Text style={styles.weekend}>{weekendDate}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    minHeight: HERO_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  eyebrow: {
    color: colors.accentHover,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  flag: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 30,
    marginTop: 2,
  },
  weekend: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
