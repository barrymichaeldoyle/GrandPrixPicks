import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RaceDetailHero } from '../components/races/RaceDetailHero';
import { SessionResultsCard } from '../components/races/SessionResultsCard';
import { CountdownText } from '../components/ui/CountdownText';
import { LockBadge } from '../components/ui/LockBadge';
import { PageHero } from '../components/ui/PageHero';
import { api } from '../integrations/convex/api';
import { useUserDateFormat } from '../lib/dates';
import { getLockStatusViewModel } from '../lib/lockTime';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type {
  HomeStackParamList,
  RacesStackParamList,
  RootTabParamList,
} from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

type HomeProps = NativeStackScreenProps<HomeStackParamList, 'RaceDetail'>;
type RacesProps = NativeStackScreenProps<RacesStackParamList, 'RaceDetail'>;
type Props = HomeProps | RacesProps;

const SESSION_ORDER: SessionType[] = [
  'sprint_quali',
  'sprint',
  'quali',
  'race',
];
const HAIRLINE = StyleSheet.hairlineWidth;

export function RaceDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const { races } = useRaceWeekends();
  const now = useNow();
  const { formatRaceDate } = useUserDateFormat();
  const rootNav = useNavigation<NavigationProp<RootTabParamList>>();

  const raceIndex = races.findIndex(
    (item) => item.slug === route.params.raceSlug,
  );
  const race = raceIndex >= 0 ? races[raceIndex] : undefined;

  const raceDoc = useQuery(
    api.races.getRaceBySlug,
    convexEnabled && race ? { slug: race.slug } : 'skip',
  );

  const actualTop5BySession = useQuery(
    api.results.getEnrichedTop5BySession,
    convexEnabled && raceDoc ? { raceId: raceDoc._id } : 'skip',
  );
  const myScoresBySession = useQuery(
    api.results.getMyScoresForRace,
    convexEnabled && raceDoc ? { raceId: raceDoc._id } : 'skip',
  );

  if (!race) {
    return (
      <View style={styles.notFound}>
        <PageHero title="Race not found" />
      </View>
    );
  }

  const hasOpenSession = race.sessions.some(
    (s) => new Date(s.startsAt).getTime() - now > 0,
  );

  const publishedSessions: SessionType[] = SESSION_ORDER.filter(
    (type) =>
      Array.isArray(actualTop5BySession?.[type]) &&
      (actualTop5BySession?.[type]?.length ?? 0) > 0,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
    >
      <RaceDetailHero race={race} round={raceIndex + 1} />

      {publishedSessions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.eyebrow}>Results</Text>
          <View style={styles.resultsList}>
            {publishedSessions.map((sessionType, i) => {
              const actual = actualTop5BySession?.[sessionType] ?? [];
              const myScore = myScoresBySession?.[sessionType] ?? null;
              return (
                <View key={`results-${sessionType}`}>
                  {i > 0 ? <View style={styles.thickDivider} /> : null}
                  <SessionResultsCard
                    actual={actual}
                    pickBreakdown={myScore?.enrichedBreakdown}
                    session={sessionType}
                    totalPoints={myScore?.points}
                  />
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.eyebrow}>Sessions</Text>
        <View>
          {race.sessions.map((session, i) => {
            const msRemaining = new Date(session.startsAt).getTime() - now;
            const lockStatus = getLockStatusViewModel(msRemaining, now);
            const formatted = formatRaceDate(session.startsAt, race.slug);
            const isPublished = publishedSessions.includes(
              session.type as SessionType,
            );

            return (
              <View key={session.type}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.sessionRow}>
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
                    {isPublished ? (
                      <Text style={styles.publishedText}>PUBLISHED</Text>
                    ) : (
                      <>
                        <LockBadge lockStatus={lockStatus} />
                        {!lockStatus.isLocked ? (
                          <CountdownText lockStatus={lockStatus} />
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {hasOpenSession ? (
        <Pressable
          onPress={() => rootNav.navigate('PredictTab')}
          style={styles.cta}
        >
          <Ionicons color={colors.text} name="trophy-outline" size={16} />
          <Text style={styles.ctaText}>Make My Picks</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    paddingBottom: 2,
    textTransform: 'uppercase',
  },
  notFound: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  publishedText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  resultsList: {
    gap: 4,
  },
  scroll: {
    backgroundColor: colors.page,
    flex: 1,
  },
  section: {
    gap: 8,
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
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    fontWeight: '700',
  },
  thickDivider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginVertical: 12,
  },
});
