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
import { formatRaceDate } from '../lib/dates';
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

const SESSION_ORDER: SessionType[] = ['sprint_quali', 'sprint', 'quali', 'race'];

export function RaceDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const { races } = useRaceWeekends();
  const now = useNow();
  const rootNav = useNavigation<NavigationProp<RootTabParamList>>();

  const raceIndex = races.findIndex(
    (item) => item.slug === route.params.raceSlug,
  );
  const race = raceIndex >= 0 ? races[raceIndex] : undefined;

  // Convex race doc — gives us _id to fetch results / scores
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

  // Sessions with published results, in canonical order
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

      {/* Results — only shown when at least one session is published */}
      {publishedSessions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Results</Text>
          {publishedSessions.map((sessionType) => {
            const actual = actualTop5BySession?.[sessionType] ?? [];
            const myScore = myScoresBySession?.[sessionType] ?? null;
            return (
              <SessionResultsCard
                actual={actual}
                key={`results-${sessionType}`}
                pickBreakdown={myScore?.enrichedBreakdown}
                session={sessionType}
                totalPoints={myScore?.points}
              />
            );
          })}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sessions</Text>
        {race.sessions.map((session) => {
          const msRemaining = new Date(session.startsAt).getTime() - now;
          const lockStatus = getLockStatusViewModel(msRemaining, now);
          const formatted = formatRaceDate(session.startsAt, race.slug);
          const isPublished = publishedSessions.includes(
            session.type as SessionType,
          );

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
                {isPublished ? (
                  <View style={styles.publishedBadge}>
                    <Ionicons
                      color={colors.accent}
                      name="checkmark-circle"
                      size={11}
                    />
                    <Text style={styles.publishedText}>PUBLISHED</Text>
                  </View>
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
          );
        })}
      </View>

      {hasOpenSession ? (
        <Pressable
          onPress={() => rootNav.navigate('PredictTab')}
          style={styles.cta}
        >
          <Ionicons color={colors.text} name="trophy-outline" size={16} />
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
  notFound: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  publishedBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  publishedText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scroll: {
    backgroundColor: colors.page,
    flex: 1,
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
});
