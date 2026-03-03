import { SESSION_LABELS } from "@grandprixpicks/shared/sessions";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatRaceDate } from "../lib/dates";
import { colors, radii } from "../theme/tokens";
import { useTypography } from "../theme/typography";
import type { RaceWeekend } from "../types";

type HomeScreenProps = {
  onOpenRace?: (raceSlug: string) => void;
  races: ReadonlyArray<RaceWeekend>;
};

const SLUG_TO_COUNTRY: Record<string, string> = {
  australia: "au",
  bahrain: "bh",
  belgium: "be",
  brazil: "br",
  canada: "ca",
  china: "cn",
  hungary: "hu",
  italy: "it",
  japan: "jp",
  mexico: "mx",
  monaco: "mc",
  netherlands: "nl",
  portugal: "pt",
  qatar: "qa",
  saudi: "sa",
  singapore: "sg",
  spain: "es",
  "united-states": "us",
  usa: "us",
};

function getCountryCodeForRaceSlug(slug: string): string | null {
  const key = slug.replace(/-\d{4}$/, "").toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}

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
  const { titleFontFamily } = useTypography();
  const countryCode = nextRace
    ? getCountryCodeForRaceSlug(nextRace.slug)
    : null;

  if (!nextRace) {
    return (
      <View style={styles.screen}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          Home
        </Text>
        <Text style={styles.muted}>No upcoming races found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Next Weekend
      </Text>
      <View style={styles.card}>
        <View style={styles.raceHeaderRow}>
          {countryCode ? (
            <View style={styles.flagFrame}>
              <Image
                source={{ uri: `https://flagcdn.com/w40/${countryCode}.png` }}
                style={styles.flagImage}
              />
            </View>
          ) : null}
          <Text
            numberOfLines={2}
            style={[
              styles.raceName,
              titleFontFamily ? { fontFamily: titleFontFamily } : null,
            ]}
          >
            {nextRace.name}
          </Text>
        </View>
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
                <Text numberOfLines={2} style={styles.sessionTime}>
                  Local: {formatted.local}
                </Text>
                <Text numberOfLines={2} style={styles.sessionTrack}>
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
    marginVertical: 2,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  openButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    marginTop: 2,
    paddingVertical: 10,
  },
  openButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  raceHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
  },
  raceMeta: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  raceName: {
    color: colors.text,
    flex: 1,
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  flagFrame: {
    borderColor: colors.borderStrong,
    borderRadius: 5,
    borderWidth: 1,
    overflow: "hidden",
  },
  flagImage: {
    height: 20,
    width: 30,
  },
  sessionRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  sessionTime: {
    color: colors.text,
    fontSize: 12,
    flexShrink: 1,
    lineHeight: 16,
    textAlign: "right",
  },
  sessionTimes: {
    alignItems: "flex-end",
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sessionTrack: {
    color: colors.textMuted,
    fontSize: 11,
    flexShrink: 1,
    lineHeight: 15,
    textAlign: "right",
  },
  sessionType: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    maxWidth: 110,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 40,
  },
});
