import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { formatRaceDate } from '../lib/dates';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type {
  HomeStackParamList,
  PicksStackParamList,
} from '../navigation/types';
import { colors } from '../theme/tokens';
import { useTypography } from '../theme/typography';

type HomeProps = NativeStackScreenProps<HomeStackParamList, 'RaceDetail'>;
type PicksProps = NativeStackScreenProps<PicksStackParamList, 'RaceDetail'>;
type Props = HomeProps | PicksProps;

export function RaceDetailScreen({ route }: Props) {
  const { races } = useRaceWeekends();
  const { titleFontFamily } = useTypography();
  const race = races.find((item) => item.slug === route.params.raceSlug);

  if (!race) {
    return (
      <View style={styles.screen}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          Race Not Found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        {race.name}
      </Text>
      <Text style={styles.meta}>{race.country}</Text>
      <Text style={styles.meta}>
        {race.hasSprint ? 'Sprint weekend' : 'Standard weekend'}
      </Text>
      <View style={styles.divider} />
      {race.sessions.map((session) => {
        const time = formatRaceDate(session.startsAt, race.slug);
        return (
          <View key={`${race.slug}-${session.type}`} style={styles.sessionRow}>
            <Text style={styles.sessionType}>{session.type}</Text>
            <Text style={styles.sessionTime}>{time.track}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  sessionRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  sessionTime: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'right',
  },
  sessionType: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    maxWidth: 120,
    textTransform: 'capitalize',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
