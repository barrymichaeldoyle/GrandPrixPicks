import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { RaceCard } from '../../components/races/RaceCard';
import { RaceCardSkeleton } from '../../components/races/RaceCardSkeleton';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { useRefreshSpinner } from '../../lib/useRefreshSpinner';
import type { RacesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import type { RaceWeekend } from '../../types';

type Props = NativeStackScreenProps<RacesStackParamList, 'RaceCalendar'>;

type TabValue = 'past' | 'upcoming';

const TAB_OPTIONS: ReadonlyArray<{ value: TabValue; label: string }> = [
  { value: 'past', label: 'Past' },
  { value: 'upcoming', label: 'Upcoming' },
];

function isWeekendFullyPast(race: RaceWeekend, now: number) {
  return (
    race.sessions.length > 0 &&
    race.sessions.every((s) => new Date(s.startsAt).getTime() <= now)
  );
}

export function RaceCalendarScreen({ navigation }: Props) {
  const { races, isLoading } = useRaceWeekends();
  const { refreshing, onRefresh } = useRefreshSpinner();
  const [tab, setTab] = useState<TabValue>('upcoming');
  const now = Date.now();

  const indexed = races.map((race, index) => ({ race, round: index + 1 }));

  const filtered =
    tab === 'past'
      ? indexed.filter(({ race }) => isWeekendFullyPast(race, now)).reverse()
      : indexed.filter(({ race }) => !isWeekendFullyPast(race, now));

  const nextRaceSlug = indexed.find(
    ({ race }) => !isWeekendFullyPast(race, now),
  )?.race.slug;

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <Header />
        <View style={styles.tabs}>
          <SegmentedTabs onChange={setTab} options={TAB_OPTIONS} value={tab} />
        </View>
        <View style={styles.skeletonList}>
          {[0, 1, 2].map((i) => (
            <RaceCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header />
      <View style={styles.tabs}>
        <SegmentedTabs onChange={setTab} options={TAB_OPTIONS} value={tab} />
      </View>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={(item) => item.race.slug}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {tab === 'past'
              ? 'No races have finished yet this season.'
              : 'No upcoming races. See you next season.'}
          </Text>
        }
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <RaceCard
            isNext={tab === 'upcoming' && item.race.slug === nextRaceSlug}
            onPress={() =>
              navigation.navigate('RaceDetail', { raceSlug: item.race.slug })
            }
            race={item.race}
            round={item.round}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>2026 SEASON</Text>
      <Text style={styles.title}>Calendar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 32,
    textAlign: 'center',
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  header: {
    gap: 4,
    marginBottom: 14,
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletonList: {
    gap: 10,
    marginTop: 12,
  },
  tabs: {
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
