import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useRaceWeekends } from '../lib/useRaceWeekends';
import type { HomeStackParamList } from '../navigation/types';
import { HomeScreen } from './HomeScreen';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

export function HomeRouteScreen({ navigation }: Props) {
  const { races } = useRaceWeekends();

  return (
    <HomeScreen
      races={races}
      onOpenRace={(raceSlug) => navigation.navigate('RaceDetail', { raceSlug })}
    />
  );
}
