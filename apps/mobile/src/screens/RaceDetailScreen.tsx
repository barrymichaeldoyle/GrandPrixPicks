import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FlagImage } from '../components/ui/FlagImage';
import { CountdownText } from '../components/ui/CountdownText';
import { LockBadge } from '../components/ui/LockBadge';
import { formatRaceDate } from '../lib/dates';
import { getLockStatusViewModel } from '../lib/lockTime';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type {
  HomeStackParamList,
  RacesStackParamList,
  RootTabParamList,
} from '../navigation/types';
import { colors, radii } from '../theme/tokens';
import { useTypography } from '../theme/typography';

type HomeProps = NativeStackScreenProps<HomeStackParamList, 'RaceDetail'>;
type RacesProps = NativeStackScreenProps<RacesStackParamList, 'RaceDetail'>;
type Props = HomeProps | RacesProps;

export function RaceDetailScreen({ route }: Props) {
  const { races } = useRaceWeekends();
  const { titleFontFamily } = useTypography();
  const now = useNow();
  const rootNav = useNavigation<NavigationProp<RootTabParamList>>();

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

  const weekendDate = new Date(race.weekendStart).toLocaleDateString(
    undefined,
    { month: 'long', day: 'numeric', year: 'numeric' },
  );

  const hasOpenSession = race.sessions.some(
    (s) => new Date(s.startsAt).getTime() - now > 0,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <FlagImage raceSlug={race.slug} />
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              titleFontFamily ? { fontFamily: titleFontFamily } : null,
            ]}
          >
            {race.name}
          </Text>
        </View>
        <Text style={styles.meta}>{weekendDate}</Text>
        {race.hasSprint ? (
          <View style={styles.sprintBadge}>
            <Text style={styles.sprintText}>Sprint Weekend</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Sessions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        {race.sessions.map((session) => {
          const msRemaining = new Date(session.startsAt).getTime() - now;
          const lockStatus = getLockStatusViewModel(msRemaining, now);
          const formatted = formatRaceDate(session.startsAt, race.slug);

          return (
            <View key={session.type} style={styles.sessionRow}>
              <View style={styles.sessionLeft}>
                <Text style={styles.sessionType}>
                  {SESSION_LABELS[session.type]}
                </Text>
                <Text style={styles.sessionTime}>{formatted.local}</Text>
                <Text style={styles.sessionTrack}>
                  {formatted.track} ({formatted.trackTimeZone})
                </Text>
              </View>
              <View style={styles.sessionRight}>
                <LockBadge lockStatus={lockStatus} />
                {!lockStatus.isLocked ? (
                  <CountdownText lockStatus={lockStatus} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>

      {/* Edit Picks CTA */}
      {hasOpenSession ? (
        <Pressable
          onPress={() => rootNav.navigate('PredictTab')}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Edit My Picks</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  ctaText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  header: {
    gap: 6,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  scroll: {
    backgroundColor: colors.page,
    flex: 1,
  },
  screen: {
    alignItems: 'center',
    backgroundColor: colors.page,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sessionLeft: {
    flex: 1,
    gap: 3,
  },
  sessionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessionRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  sessionTime: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sessionTrack: {
    color: colors.textMuted,
    fontSize: 11,
  },
  sessionType: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sprintBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sprintText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 34,
  },
});
