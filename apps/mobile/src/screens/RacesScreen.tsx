import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useRef } from 'react';
import { FlatList as NativeFlatList } from 'react-native';

import { FlagImage } from '../components/ui/FlagImage';
import { Ionicons } from '../components/ui/Ionicons';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useUserDateFormat } from '../lib/dates';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import type { MoreStackParamList } from '../navigation/types';
import { colors } from '../theme/tokens';
import type { RaceWeekend } from '../types';
import { Pressable, Text, View } from '../tw';

/**
 * The season calendar, mirroring web's `/races`. Every row opens the race
 * detail screen, which carries the session times and published results.
 */
export function RacesScreen() {
  const navigation = useNavigation<NavigationProp<MoreStackParamList>>();
  const { races, isLoading } = useRaceWeekends();
  const { formatShortDate } = useUserDateFormat();
  const now = useNow(60_000);
  const listRef = useRef<NativeFlatList<RaceWeekend>>(null);
  const scrolledRef = useRef(false);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // The next race is the first whose main race has not started yet.
  const nextIndex = races.findIndex(
    (race) => new Date(race.weekendStart).getTime() > now,
  );
  const nextSlug = races[nextIndex]?.slug;

  return (
    <NativeFlatList
      contentContainerStyle={{
        paddingBottom: 32,
        paddingHorizontal: 16,
        paddingTop: 8,
      }}
      data={races}
      // Open on the next race. Every row is rendered up front (a season is
      // two dozen rows) so the index can be scrolled to without measuring.
      initialNumToRender={races.length}
      onContentSizeChange={() => {
        if (nextIndex > 0 && !scrolledRef.current) {
          scrolledRef.current = true;
          listRef.current?.scrollToIndex({
            animated: false,
            index: nextIndex,
            viewPosition: 0.3,
          });
        }
      }}
      // Rows are measured after the first scroll attempt: jump close by the
      // average height, then retry once they exist.
      onScrollToIndexFailed={(info) => {
        listRef.current?.scrollToOffset({
          animated: false,
          offset: info.averageItemLength * info.index,
        });
        setTimeout(() => {
          listRef.current?.scrollToIndex({
            animated: false,
            index: info.index,
            viewPosition: 0.3,
          });
        }, 50);
      }}
      ref={listRef}
      style={{ backgroundColor: colors.page, flex: 1 }}
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      keyExtractor={(race) => race.slug}
      renderItem={({ item: race }) => {
        const isNext = race.slug === nextSlug;
        const isPast = new Date(race.weekendStart).getTime() <= now;
        return (
          <Pressable
            accessibilityLabel={`Round ${race.round}, ${race.name}${isNext ? ', next race' : ''}`}
            accessibilityRole="button"
            className="flex-row items-center gap-3 py-3 active:opacity-70"
            onPress={() =>
              navigation.navigate('RaceDetail', { raceSlug: race.slug })
            }
          >
            <FlagImage raceSlug={race.slug} />
            <View className="flex-1 gap-0.5">
              <Text className="text-muted text-xs">
                Round {race.round}
                {race.hasSprint ? ' · Sprint weekend' : ''}
              </Text>
              <Text
                className={`text-[15px] font-semibold ${isPast ? 'text-muted' : 'text-foreground'}`}
                numberOfLines={1}
              >
                {race.name}
              </Text>
            </View>
            <View className="items-end gap-0.5">
              {isNext ? (
                <Text className="text-xs font-bold text-accent">Next</Text>
              ) : null}
              <Text className="text-muted text-xs">
                {formatShortDate(race.weekendStart)}
              </Text>
            </View>
            <Ionicons
              color={colors.textMuted}
              name="chevron-forward"
              size={16}
            />
          </Pressable>
        );
      }}
    />
  );
}
