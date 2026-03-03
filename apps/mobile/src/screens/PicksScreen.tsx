import type { SessionType } from "@grandprixpicks/shared/sessions";
import {
  getSessionsForWeekend,
  SESSION_LABELS_SHORT,
} from "@grandprixpicks/shared/sessions";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { mockDrivers } from "../data/mockDrivers";
import { mockH2HMatchups } from "../data/mockH2H";
import { formatRaceDate } from "../lib/dates";
import { formatCountdown, getLockStatusViewModel } from "../lib/lockTime";
import {
  clearLocalRaceDraft,
  loadLocalRaceDraft,
  saveLocalRaceDraft,
} from "../lib/picksDrafts";
import { useNow } from "../lib/useNow";
import { colors, radii } from "../theme/tokens";
import { useTypography } from "../theme/typography";
import type { RaceWeekend } from "../types";

type PicksScreenProps = {
  onOpenRace?: (raceSlug: string) => void;
  races: ReadonlyArray<RaceWeekend>;
};

const MAX_TOP5 = 5;

type Top5BySession = Record<SessionType, Array<string>>;
type H2HBySession = Record<SessionType, Record<string, string>>;

function getNextRaceSlug(
  races: ReadonlyArray<RaceWeekend>,
): string | undefined {
  const now = Date.now();
  return races
    .slice()
    .sort(
      (a, b) =>
        new Date(a.weekendStart).getTime() - new Date(b.weekendStart).getTime(),
    )
    .find((race) => new Date(race.weekendStart).getTime() >= now)?.slug;
}

function getEmptyTop5BySession(): Top5BySession {
  return {
    quali: [],
    sprint_quali: [],
    sprint: [],
    race: [],
  };
}

function getEmptyH2HBySession(): H2HBySession {
  return {
    quali: {},
    sprint_quali: {},
    sprint: {},
    race: {},
  };
}

export function PicksScreen({ races, onOpenRace }: PicksScreenProps) {
  const { titleFontFamily } = useTypography();
  const initialRaceSlug =
    getNextRaceSlug(races) ?? (races.length > 0 ? races[0].slug : "");
  const [selectedRaceSlug, setSelectedRaceSlug] = useState(
    () => initialRaceSlug,
  );
  const [selectedSession, setSelectedSession] = useState<SessionType>("race");
  const [top5BySession, setTop5BySession] = useState<Top5BySession>(
    getEmptyTop5BySession,
  );
  const [h2hBySession, setH2HBySession] =
    useState<H2HBySession>(getEmptyH2HBySession);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isCurrentDraftDirty, setIsCurrentDraftDirty] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const now = useNow();

  const race = useMemo(
    () => races.find((item) => item.slug === selectedRaceSlug),
    [races, selectedRaceSlug],
  );

  const sessionOptions = useMemo(
    () => getSessionsForWeekend(Boolean(race?.hasSprint)),
    [race?.hasSprint],
  );

  const top5 = top5BySession[selectedSession];
  const h2hByMatchup = h2hBySession[selectedSession];
  const selectedSessionLockAt = useMemo(() => {
    const session = race?.sessions.find(
      (item) => item.type === selectedSession,
    );
    if (!session) {
      return undefined;
    }
    const ms = new Date(session.startsAt).getTime();
    return Number.isNaN(ms) ? undefined : ms;
  }, [race?.sessions, selectedSession]);
  const selectedSessionLockDisplay = useMemo(() => {
    if (typeof selectedSessionLockAt !== "number" || !race?.slug) {
      return null;
    }
    return formatRaceDate(
      new Date(selectedSessionLockAt).toISOString(),
      race.slug,
    );
  }, [race?.slug, selectedSessionLockAt]);

  const driverById = useMemo(() => {
    return new Map(mockDrivers.map((driver) => [driver.id, driver]));
  }, []);

  const top5Complete = top5.length === MAX_TOP5;
  const h2hComplete =
    Object.keys(h2hByMatchup).length === mockH2HMatchups.length;
  const canSave = top5Complete && h2hComplete;
  const selectedSessionRemainingMs =
    typeof selectedSessionLockAt === "number"
      ? selectedSessionLockAt - now
      : null;
  const lockStatus = getLockStatusViewModel(
    selectedSessionRemainingMs ?? Number.POSITIVE_INFINITY,
    now,
  );

  useEffect(() => {
    if (!sessionOptions.includes(selectedSession)) {
      setSelectedSession(sessionOptions[0] ?? "race");
    }
  }, [selectedSession, sessionOptions]);

  useEffect(() => {
    if (!selectedRaceSlug) {
      return;
    }

    let cancelled = false;

    async function hydrateRaceDraft() {
      const draft = await loadLocalRaceDraft(selectedRaceSlug);
      if (cancelled) {
        return;
      }
      if (!draft) {
        setTop5BySession(getEmptyTop5BySession());
        setH2HBySession(getEmptyH2HBySession());
        setIsCurrentDraftDirty(false);
        setRestoredDraftAt(null);
        return;
      }
      setTop5BySession(draft.top5BySession);
      setH2HBySession(draft.h2hBySession);
      setIsCurrentDraftDirty(true);
      setRestoredDraftAt(draft.updatedAt);
    }

    void hydrateRaceDraft();
    return () => {
      cancelled = true;
    };
  }, [selectedRaceSlug]);

  useEffect(() => {
    if (!selectedRaceSlug) {
      return;
    }
    void saveLocalRaceDraft(selectedRaceSlug, {
      h2hBySession,
      top5BySession,
      updatedAt: new Date().toISOString(),
    });
  }, [h2hBySession, selectedRaceSlug, top5BySession]);

  function setTop5ForSelected(updater: (prev: Array<string>) => Array<string>) {
    setTop5BySession((prev) => ({
      ...prev,
      [selectedSession]: updater(prev[selectedSession]),
    }));
  }

  function toggleTop5Driver(driverId: string) {
    setSavedAt(null);
    setIsCurrentDraftDirty(true);
    setTop5ForSelected((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      }
      if (prev.length >= MAX_TOP5) {
        return prev;
      }
      return [...prev, driverId];
    });
  }

  function movePick(index: number, direction: "up" | "down") {
    setSavedAt(null);
    setIsCurrentDraftDirty(true);
    setTop5ForSelected((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const current = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = current;
      return next;
    });
  }

  function selectH2H(matchupId: string, driverId: string) {
    setSavedAt(null);
    setIsCurrentDraftDirty(true);
    setH2HBySession((prev) => ({
      ...prev,
      [selectedSession]: {
        ...prev[selectedSession],
        [matchupId]: driverId,
      },
    }));
  }

  function handleSave() {
    if (!canSave) {
      return;
    }
    setSavedAt(new Date().toISOString());
    setIsCurrentDraftDirty(false);
  }

  function trySwitchSession(nextSession: SessionType) {
    if (nextSession === selectedSession) {
      return;
    }
    if (!isCurrentDraftDirty) {
      setSelectedSession(nextSession);
      return;
    }
    Alert.alert(
      "Unsaved changes",
      "Switch sessions and continue with unsaved changes stored as a draft?",
      [
        { style: "cancel", text: "Keep editing" },
        {
          text: "Switch",
          onPress: () => {
            setSelectedSession(nextSession);
          },
        },
      ],
    );
  }

  function trySwitchRace(nextRaceSlug: string) {
    if (nextRaceSlug === selectedRaceSlug) {
      return;
    }
    if (!isCurrentDraftDirty) {
      setSelectedRaceSlug(nextRaceSlug);
      return;
    }
    Alert.alert(
      "Unsaved changes",
      "Switch races and continue with unsaved changes stored as a draft?",
      [
        { style: "cancel", text: "Keep editing" },
        {
          text: "Switch",
          onPress: () => {
            setSelectedRaceSlug(nextRaceSlug);
          },
        },
      ],
    );
  }

  async function handleDiscardDraft() {
    if (!selectedRaceSlug) {
      return;
    }
    await clearLocalRaceDraft(selectedRaceSlug);
    setTop5BySession(getEmptyTop5BySession());
    setH2HBySession(getEmptyH2HBySession());
    setIsCurrentDraftDirty(false);
    setRestoredDraftAt(null);
    setSavedAt(null);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      style={styles.screen}
    >
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Picks
      </Text>
      <Text style={styles.body}>
        Select your Top 5 and H2H picks for each race session.
      </Text>
      {restoredDraftAt ? (
        <View style={styles.restoredBannerContainer}>
          <Text style={styles.restoredBannerText}>
            Draft restored:{" "}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(restoredDraftAt))}
          </Text>
          <Pressable
            onPress={() => {
              void handleDiscardDraft();
            }}
            style={styles.restoredBannerAction}
          >
            <Text style={styles.restoredBannerActionText}>Discard Draft</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Race Weekend</Text>
        <View style={styles.chipWrap}>
          {races.map((item) => {
            const active = item.slug === selectedRaceSlug;
            return (
              <Pressable
                key={item.slug}
                onPress={() => trySwitchRace(item.slug)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}
                >
                  {item.country}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.helperText}>
          {race ? race.name : "No race selected"}
        </Text>
        {onOpenRace && selectedRaceSlug ? (
          <Pressable
            onPress={() => onOpenRace(selectedRaceSlug)}
            style={styles.openRaceButton}
          >
            <Text style={styles.openRaceButtonText}>Open Race Details</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session</Text>
        <View style={styles.chipWrap}>
          {sessionOptions.map((sessionType) => {
            const active = sessionType === selectedSession;
            return (
              <Pressable
                key={sessionType}
                onPress={() => trySwitchSession(sessionType)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active ? styles.chipTextActive : null,
                  ]}
                >
                  {SESSION_LABELS_SHORT[sessionType]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.lockMeta}>
          Your time: {selectedSessionLockDisplay?.local ?? "Unavailable"}
        </Text>
        <Text style={styles.lockMeta}>
          Track time:{" "}
          {selectedSessionLockDisplay
            ? `${selectedSessionLockDisplay.track} (${selectedSessionLockDisplay.trackTimeZone})`
            : "Unavailable"}
        </Text>
        <Text style={styles.lockMeta}>
          Countdown:{" "}
          {typeof selectedSessionLockAt === "number"
            ? formatCountdown(selectedSessionLockAt - now)
            : "Unavailable"}
        </Text>
        <View
          style={[
            styles.lockBadge,
            lockStatus.badgeTone === "success"
              ? styles.lockBadgeOpen
              : styles.lockBadgeSoon,
            lockStatus.shouldPulse ? styles.lockBadgePulse : null,
          ]}
        >
          <Text style={styles.lockBadgeText}>{lockStatus.label}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Top 5</Text>
        <Text style={styles.helperText}>
          {MAX_TOP5 - top5.length} pick{MAX_TOP5 - top5.length === 1 ? "" : "s"}{" "}
          remaining
        </Text>

        <View style={styles.rankList}>
          {Array.from({ length: MAX_TOP5 }).map((_, index) => {
            const driver = driverById.get(top5[index] ?? "");
            return (
              <View key={`top5-${index}`} style={styles.rankRow}>
                <Text style={styles.rankLabel}>#{index + 1}</Text>
                <Text style={styles.rankDriver}>
                  {driver
                    ? `${driver.fullName} (${driver.code})`
                    : "Select a driver"}
                </Text>
                <View style={styles.rankActions}>
                  <Pressable
                    onPress={() => movePick(index, "up")}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Up</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => movePick(index, "down")}
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Down</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.driverPool}>
          {mockDrivers.map((driver) => {
            const selected = top5.includes(driver.id);
            const disabled = !selected && top5.length >= MAX_TOP5;
            return (
              <Pressable
                key={driver.id}
                disabled={disabled}
                onPress={() => toggleTop5Driver(driver.id)}
                style={[
                  styles.driverChip,
                  selected ? styles.driverChipActive : null,
                  disabled ? styles.driverChipDisabled : null,
                ]}
              >
                <Text style={styles.driverCode}>{driver.code}</Text>
                <Text style={styles.driverName}>{driver.fullName}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>H2H Matchups</Text>
        <Text style={styles.helperText}>Pick one driver per pairing.</Text>

        {mockH2HMatchups.map((matchup) => {
          const driverA = driverById.get(matchup.driverAId);
          const driverB = driverById.get(matchup.driverBId);
          if (!driverA || !driverB) {
            return null;
          }

          const selectedId = h2hByMatchup[matchup.id];
          return (
            <View key={matchup.id} style={styles.matchupCard}>
              <Text style={styles.matchupTeam}>{matchup.team}</Text>
              <View style={styles.matchupOptions}>
                <Pressable
                  onPress={() => selectH2H(matchup.id, driverA.id)}
                  style={[
                    styles.matchupOption,
                    selectedId === driverA.id
                      ? styles.matchupOptionActive
                      : null,
                  ]}
                >
                  <Text style={styles.matchupOptionText}>{driverA.code}</Text>
                </Pressable>
                <Pressable
                  onPress={() => selectH2H(matchup.id, driverB.id)}
                  style={[
                    styles.matchupOption,
                    selectedId === driverB.id
                      ? styles.matchupOptionActive
                      : null,
                  ]}
                >
                  <Text style={styles.matchupOptionText}>{driverB.code}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={!canSave}
        onPress={handleSave}
        style={[styles.saveButton, canSave ? null : styles.saveButtonDisabled]}
      >
        <Text style={styles.saveButtonText}>
          {canSave
            ? `Save ${SESSION_LABELS_SHORT[selectedSession]} Picks`
            : "Complete Top 5 and H2H to save"}
        </Text>
      </Pressable>

      {savedAt ? (
        <Text style={styles.savedText}>
          Saved {SESSION_LABELS_SHORT[selectedSession]} locally at{" "}
          {new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(savedAt))}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.text,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  driverChip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "48%",
  },
  driverChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  driverChipDisabled: {
    opacity: 0.45,
  },
  driverCode: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  driverName: {
    color: colors.textMuted,
    fontSize: 12,
  },
  driverPool: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  lockMeta: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  lockBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  lockBadgeLocked: {
    backgroundColor: colors.warningMuted,
  },
  lockBadgeOpen: {
    backgroundColor: colors.successMuted,
  },
  lockBadgeSoon: {
    backgroundColor: colors.warningMuted,
  },
  lockBadgeText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  lockBadgePulse: {
    opacity: 0.72,
  },
  matchupCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  matchupOption: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  matchupOptionActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  matchupOptionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  matchupOptions: {
    flexDirection: "row",
    gap: 8,
  },
  matchupTeam: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  openRaceButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    marginTop: 2,
    paddingVertical: 10,
  },
  openRaceButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rankActions: {
    flexDirection: "row",
    gap: 6,
  },
  rankDriver: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  rankLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    width: 26,
  },
  rankList: {
    gap: 8,
  },
  rankRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    marginTop: 4,
    paddingVertical: 12,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  savedText: {
    color: colors.success,
    fontSize: 12,
    marginTop: 2,
  },
  restoredBannerAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  restoredBannerActionText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  restoredBannerContainer: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  restoredBannerText: {
    color: colors.text,
    flex: 1,
    fontSize: 11,
    paddingRight: 8,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
    paddingTop: 4,
  },
  smallButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
