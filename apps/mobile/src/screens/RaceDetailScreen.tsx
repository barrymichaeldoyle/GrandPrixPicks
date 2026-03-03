import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";

import { formatRaceDate } from "../lib/dates";
import { useRaceWeekends } from "../lib/useRaceWeekends";
import type {
  HomeStackParamList,
  PicksStackParamList,
} from "../navigation/types";

type HomeProps = NativeStackScreenProps<HomeStackParamList, "RaceDetail">;
type PicksProps = NativeStackScreenProps<PicksStackParamList, "RaceDetail">;
type Props = HomeProps | PicksProps;

export function RaceDetailScreen({ route }: Props) {
  const { races } = useRaceWeekends();
  const race = races.find((item) => item.slug === route.params.raceSlug);

  if (!race) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Race Not Found</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{race.name}</Text>
      <Text style={styles.meta}>{race.country}</Text>
      <Text style={styles.meta}>
        {race.hasSprint ? "Sprint weekend" : "Standard weekend"}
      </Text>
      <View style={styles.divider} />
      {race.sessions.map((session) => {
        const time = formatRaceDate(session.startsAt, race.slug);
        return (
          <View key={`${race.slug}-${session.type}`} style={styles.sessionRow}>
            <Text style={styles.sessionType}>{session.type}</Text>
            <Text style={styles.sessionTime}>{time.track}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: "#273657",
    height: 1,
    marginVertical: 6,
  },
  meta: {
    color: "#9bb0dd",
    fontSize: 14,
  },
  screen: {
    flex: 1,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  sessionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionTime: {
    color: "#dce5ff",
    fontSize: 13,
  },
  sessionType: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
});
