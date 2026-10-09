import { PRACTICE_SESSION_LABELS } from '@grandprixpicks/shared/practice';
import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';
import type { SessionType } from '@grandprixpicks/shared/sessions';
import { Ionicons } from '../components/ui/Ionicons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

import { useQuery } from '../integrations/convex/query';

import { CompactPracticeRow } from '../components/races/CompactPracticeRow';
import { RaceDetailHero } from '../components/races/RaceDetailHero';
import { SessionResultsCard } from '../components/races/SessionResultsCard';
import { CountdownText } from '../components/ui/CountdownText';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { LockBadge } from '../components/ui/LockBadge';
import { PageHeader } from '../components/ui/PageHeader';
import { api } from '../integrations/convex/api';
import { useUserDateFormat } from '../lib/dates';
import { getLockStatusViewModel } from '../lib/lockTime';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type { RootTabParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';
import { Pressable, ScrollView, Text, View } from '../tw';

// Registered in the Home and More stacks. Only the slug matters,
// so it is typed independently of any one stack.
type Props = {
  route: { params: { raceSlug: string } };
};

const PRACTICE_PREVIEW_ROWS = 5;

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
  const [expandedPractice, setExpandedPractice] = useState<string[]>([]);

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
  const practiceResults = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    convexEnabled && raceDoc ? { raceId: raceDoc._id } : 'skip',
  );

  if (racesLoading) {
    return <LoadingScreen />;
  }

  if (!race) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
        <PageHeader title="Race not found" />
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
      <RaceDetailHero race={race} round={race.round} />

      {publishedSessions.length > 0 ? (
        <View className="gap-2">
          <Text className="text-muted pb-0.5 text-xs font-medium">Results</Text>
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

      {(practiceResults?.length ?? 0) > 0 ? (
        <View className="gap-2">
          <Text className="text-muted pb-0.5 text-xs font-medium">
            Practice
          </Text>
          <View className="overflow-hidden rounded-lg border border-border">
            {practiceResults?.map((result) => (
              <View key={result.sessionType}>
                <Text className="bg-surface px-3 py-2 text-xs font-extrabold text-accent">
                  {result.sessionType in PRACTICE_SESSION_LABELS
                    ? PRACTICE_SESSION_LABELS[
                        result.sessionType as keyof typeof PRACTICE_SESSION_LABELS
                      ]
                    : result.sessionType}
                </Text>
                <View className="px-3">
                  {(expandedPractice.includes(result.sessionType)
                    ? result.entries
                    : result.entries.slice(0, PRACTICE_PREVIEW_ROWS)
                  ).map((entry, index) => (
                    <View key={entry.driverNumber}>
                      {index > 0 ? <View className="h-px bg-border" /> : null}
                      <CompactPracticeRow entry={entry} fill="elevated" />
                    </View>
                  ))}
                </View>
                {result.entries.length > PRACTICE_PREVIEW_ROWS ? (
                  <Pressable
                    accessibilityRole="button"
                    className="border-t border-border px-3 py-2.5 active:opacity-70"
                    onPress={() =>
                      setExpandedPractice((open) =>
                        open.includes(result.sessionType)
                          ? open.filter((s) => s !== result.sessionType)
                          : [...open, result.sessionType],
                      )
                    }
                  >
                    <Text className="text-xs font-semibold text-accent">
                      {expandedPractice.includes(result.sessionType)
                        ? 'Show top 5'
                        : `Show all ${result.entries.length}`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-2">
        <Text className="text-muted pb-0.5 text-xs font-medium">Sessions</Text>
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
                    <Text className="text-muted text-xs">
                      {formatted.track} ({formatted.trackTimeZone})
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    {isPublished ? (
                      <Text className="text-xs font-extrabold text-accent">
                        Finished
                      </Text>
                    ) : (
                      <>
                        <LockBadge lockStatus={lockStatus} />
                        {!lockStatus.isLocked ? (
                          <CountdownText
                            lockStatus={lockStatus}
                            msRemaining={msRemaining}
                          />
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
          accessibilityRole="button"
          className="flex-row items-center justify-center gap-2 rounded-lg bg-button-accent py-3.5 active:bg-button-accent-hover"
          onPress={() => rootNav.navigate('HomeTab', { screen: 'HomeMain' })}
        >
          <Ionicons
            color={colors.textOnAccent}
            name="trophy-outline"
            size={16}
          />
          <Text className="text-[15px] font-bold text-text-on-accent">
            Make your picks
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
