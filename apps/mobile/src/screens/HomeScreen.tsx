import { SESSION_LABELS } from "@grandprixpicks/shared/sessions";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatRaceDate } from "../lib/dates";
import type { RaceWeekend } from "../types";

type HomeScreenProps = {
  onOpenRace?: (raceSlug: string) => void;
  races: ReadonlyArray<RaceWeekend>;
};

function getNextRace(
  races: ReadonlyArray<RaceWeekend>,
): RaceWeekend | undefined {
  const now = Date.now();
  return races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    )
    .find((race) => new Date(race.weekendStart).getTime() >= now);
}

export function HomeScreen({ races, onOpenRace }: HomeScreenProps) {
  const nextRace = getNextRace(races);

  if (!nextRace) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.muted}>No upcoming races found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Next Weekend</Text>
      <View style={styles.card}>
        <Text style={styles.raceName}>{nextRace.name}</Text>
        <Text style={styles.raceMeta}>{nextRace.country}</Text>
        <Text style={styles.raceMeta}>
          {nextRace.hasSprint ? "Sprint weekend" : "Standard weekend"}
        </Text>

        <View style={styles.divider} />

        {nextRace.sessions.map((session) => {
          const formatted = formatRaceDate(session.startsAt, nextRace.slug);

          return (
            <View
              key={`${nextRace.slug}-${session.type}`}
              style={styles.sessionRow}
            >
              <Text style={styles.sessionType}>
                {SESSION_LABELS[session.type]}
              </Text>
              <View style={styles.sessionTimes}>
                <Text style={styles.sessionTime}>Local: {formatted.local}</Text>
                <Text style={styles.sessionTrack}>
                  Track: {formatted.track} ({formatted.trackTimeZone})
                </Text>
              </View>
            </View>
          );
        })}

        {onOpenRace ? (
          <Pressable
            onPress={() => onOpenRace(nextRace.slug)}
            style={styles.openButton}
          >
            <Text style={styles.openButtonText}>Open Race Details</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#101930",
    borderColor: "#243355",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  divider: {
    backgroundColor: "#273657",
    height: 1,
    marginVertical: 2,
  },
  muted: {
    color: "#a1acc8",
    fontSize: 15,
  },
  openButton: {
    alignItems: "center",
    backgroundColor: "#28428a",
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 9,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  raceMeta: {
    color: "#9bb0dd",
    fontSize: 14,
  },
  raceName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
  },
  sessionRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sessionTime: {
    color: "#d9e0f2",
    fontSize: 13,
  },
  sessionTimes: {
    alignItems: "flex-end",
  },
  sessionTrack: {
    color: "#8fa0c8",
    fontSize: 12,
  },
  sessionType: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
  },
});
