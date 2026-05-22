import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { RaceCard } from '../../components/races/RaceCard';
import { RaceCardSkeleton } from '../../components/races/RaceCardSkeleton';
import { PageHero } from '../../components/ui/PageHero';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import type { RacesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';

type Props = NativeStackScreenProps<RacesStackParamList, 'RaceCalendar'>;

export function RaceCalendarScreen({ navigation }: Props) {
  const { races, isLoading } = useRaceWeekends();
  const listRef = useRef<FlatList>(null);

  const nextRaceIndex = races.findIndex(
    (race) => new Date(race.weekendStart).getTime() >= Date.now(),
  );

  useEffect(() => {
    if (!isLoading && nextRaceIndex > 0 && listRef.current) {
      listRef.current.scrollToIndex({
        index: nextRaceIndex,
        animated: false,
        viewOffset: 16,
      });
    }
  }, [isLoading, nextRaceIndex]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <PageHero title="Races" subtitle="The 2026 F1 calendar." />
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
      <PageHero title="Races" subtitle="The 2026 F1 calendar." />
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.listContent}
        data={races}
        keyExtractor={(item) => item.slug}
        onScrollToIndexFailed={({ index }) => {
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index,
              animated: false,
              viewOffset: 16,
            });
          }, 200);
        }}
        renderItem={({ item, index }) => (
          <RaceCard
            isNext={index === nextRaceIndex}
            onPress={() =>
              navigation.navigate('RaceDetail', { raceSlug: item.slug })
            }
            race={item}
            round={index + 1}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  skeletonList: {
    gap: 12,
  },
});
