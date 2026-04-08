import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { RaceCalendarCard } from '../../components/races/RaceCalendarCard';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import type { RacesStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type Props = NativeStackScreenProps<RacesStackParamList, 'RaceCalendar'>;

export function RaceCalendarScreen({ navigation }: Props) {
  const { titleFontFamily } = useTypography();
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
    return <LoadingScreen />;
  }

  return (
    <View style={styles.screen}>
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Races
      </Text>
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.listContent}
        data={races}
        keyExtractor={(item) => item.slug}
        onScrollToIndexFailed={({ index }) => {
          // Retry after a short delay if layout not ready
          setTimeout(() => {
            listRef.current?.scrollToIndex({
              index,
              animated: false,
              viewOffset: 16,
            });
          }, 200);
        }}
        renderItem={({ item }) => (
          <RaceCalendarCard
            race={item}
            onPress={() =>
              navigation.navigate('RaceDetail', { raceSlug: item.slug })
            }
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 10,
    paddingBottom: 24,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
