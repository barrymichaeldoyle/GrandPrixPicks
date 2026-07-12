import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';

import { RaceDetailHero } from '../components/races/RaceDetailHero';
import { SessionResultsCard } from '../components/races/SessionResultsCard';
import { CountdownText } from '../components/ui/CountdownText';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { LockBadge } from '../components/ui/LockBadge';
import { PageHero } from '../components/ui/PageHero';
import { api } from '../integrations/convex/api';
import { useUserDateFormat } from '../lib/dates';
import { getLockStatusViewModel } from '../lib/lockTime';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type {
  HomeStackParamList,
  PicksStackParamList,
  RootTabParamList,
} from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';
import { Pressable, ScrollView, Text, View } from '../tw';

type PicksProps = NativeStackScreenProps<PicksStackParamList, 'RaceDetail'>;
type FeedProps = NativeStackScreenProps<HomeStackParamList, 'RaceDetail'>;
type Props = PicksProps | FeedProps;

const SESSION_ORDER: SessionType[] = [
  'sprint_quali',
  'sprint',
  'quali',
  'race',
];
export function RaceDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const { races, isLoading: racesLoading } = useRaceWeekends();
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

  if (racesLoading) {
    return <LoadingScreen />;
  }

  if (!race) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
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
      className="flex-1 bg-page"
      contentContainerClassName="gap-[22px] px-4 pb-8 pt-3"
      showsVerticalScrollIndicator={false}
    >
      <RaceDetailHero race={race} round={raceIndex + 1} />

      {publishedSessions.length > 0 ? (
        <View className="gap-2">
          <Text className="text-muted pb-0.5 text-[10px] font-extrabold uppercase">
            Results
          </Text>
          <View className="gap-1">
            {publishedSessions.map((sessionType, i) => {
              const actual = actualTop5BySession?.[sessionType] ?? [];
              const myScore = myScoresBySession?.[sessionType] ?? null;
              return (
                <View key={`results-${sessionType}`}>
                  {i > 0 ? <View className="my-3 h-px bg-border" /> : null}
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

      <View className="gap-2">
        <Text className="text-muted pb-0.5 text-[10px] font-extrabold uppercase">
          Sessions
        </Text>
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
                {i > 0 ? <View className="h-px bg-border" /> : null}
                <View className="flex-row items-start justify-between gap-3 py-3">
                  <View className="flex-1 gap-[3px]">
                    <Text className="text-foreground text-sm font-bold">
                      {SESSION_LABELS[session.type]}
                    </Text>
                    <Text className="text-muted text-xs">
                      {formatted.local}
                    </Text>
                    <Text className="text-muted text-[11px]">
                      {formatted.track} ({formatted.trackTimeZone})
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    {isPublished ? (
                      <Text className="text-[10px] font-extrabold text-accent">
                        PUBLISHED
                      </Text>
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
          className="flex-row items-center justify-center gap-2 rounded-lg bg-button-accent py-3.5 active:bg-button-accent-hover"
          onPress={() => rootNav.navigate('PicksTab')}
        >
          <Ionicons color={colors.text} name="trophy-outline" size={16} />
          <Text className="text-foreground text-[15px] font-bold">
            Make My Picks
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
