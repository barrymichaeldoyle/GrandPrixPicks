import { Image, StyleSheet, Text, View } from 'react-native';

import { getCountryCodeForRaceSlug } from '../../lib/raceFlags';
import type { RaceWeekend } from '../../types';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';
import { Badge } from '../ui/Badge';

type RaceDetailHeroProps = {
  race: RaceWeekend;
  /** Optional explicit round number to display in the eyebrow. */
  round?: number;
};

const HERO_HEIGHT = 130;

export function RaceDetailHero({ race, round }: RaceDetailHeroProps) {
  const { titleFontFamily } = useTypography();
  const countryCode = getCountryCodeForRaceSlug(race.slug);
  const weekendDate = new Date(race.weekendStart).toLocaleDateString(
    undefined,
    { month: 'long', day: 'numeric', year: 'numeric' },
  );

  return (
    <View style={styles.container}>
      <View style={styles.flagLayer}>
        {countryCode ? (
          <Image
            blurRadius={8}
            source={{ uri: `https://flagcdn.com/w640/${countryCode}.png` }}
            style={styles.flagImage}
          />
        ) : null}
        <View style={styles.flagOverlay} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          {countryCode ? (
            <View style={styles.flagBadge}>
              <Image
                source={{ uri: `https://flagcdn.com/w160/${countryCode}.png` }}
                style={styles.flagBadgeImage}
              />
            </View>
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>
              {round != null ? `ROUND ${round}` : race.country.toUpperCase()}
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
        {race.hasSprint ? (
          <View style={styles.badges}>
            <Badge variant="sprint">SPRINT WEEKEND</Badge>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  container: {
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 3,
    overflow: 'hidden',
    minHeight: HERO_HEIGHT,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  flagBadge: {
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 52,
    overflow: 'hidden',
    width: 74,
  },
  flagBadgeImage: {
    height: '100%',
    width: '100%',
  },
  flagImage: {
    height: '100%',
    width: '100%',
  },
  flagLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  flagOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 26,
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
  },
  weekend: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
