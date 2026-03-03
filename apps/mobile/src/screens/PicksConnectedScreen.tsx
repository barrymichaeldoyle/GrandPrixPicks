import type { SessionType } from "@grandprixpicks/shared/sessions";
import {
  getSessionsForWeekend,
  SESSION_LABELS_SHORT,
} from "@grandprixpicks/shared/sessions";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ConvexId } from "../integrations/convex/api";
import { api } from "../integrations/convex/api";
import { formatRaceDate } from "../lib/dates";
import { formatCountdown, getLockStatusViewModel } from "../lib/lockTime";
import {
  clearConnectedDraft,
  loadConnectedDraft,
  saveConnectedDraft,
} from "../lib/picksDrafts";
import { useNow } from "../lib/useNow";
import { useRaceWeekends } from "../lib/useRaceWeekends";
import type { PicksStackParamList } from "../navigation/types";
import { useMobileConfig } from "../providers/mobile-config";
import { colors, radii } from "../theme/tokens";
import { useTypography } from "../theme/typography";
import { PicksScreen } from "./PicksScreen";

const MAX_TOP5 = 5;

export function PicksConnectedScreen() {
  const { titleFontFamily } = useTypography();
  const navigation =
    useNavigation<NativeStackNavigationProp<PicksStackParamList>>();
  const { convexEnabled } = useMobileConfig();
  const { races } = useRaceWeekends();
  const [selectedRaceSlug, setSelectedRaceSlug] = useState<string>(
    races[0]?.slug ?? "",
  );
  const [selectedSession, setSelectedSession] = useState<SessionType>("race");
  const [top5, setTop5] = useState<Array<string>>([]);
  const [h2hByMatchup, setH2HByMatchup] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isCurrentDraftDirty, setIsCurrentDraftDirty] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const now = useNow();
  const hydratedKeyRef = useRef<string | null>(null);

  const raceFromList = useMemo(
    () => races.find((race) => race.slug === selectedRaceSlug),
    [races, selectedRaceSlug],
  );

  const driversQuery = useQuery(
    api.drivers.listDrivers,
    convexEnabled ? {} : "skip",
  );
  const h2hMatchupsQuery = useQuery(
    api.h2h.getMatchupsForSeason,
    convexEnabled ? { season: 2026 } : "skip",
  );
  const raceQuery = useQuery(
    api.races.getRaceBySlug,
    convexEnabled && selectedRaceSlug ? { slug: selectedRaceSlug } : "skip",
  );
  const existingTop5Query = useQuery(
    api.predictions.myPredictionForRace,
    convexEnabled && raceQuery
      ? { raceId: raceQuery._id, sessionType: selectedSession }
      : "skip",
  );
  const existingH2HQuery = useQuery(
    api.h2h.myH2HPredictionsForRace,
    convexEnabled && raceQuery ? { raceId: raceQuery._id } : "skip",
  );

  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  const sessionOptions = useMemo(() => {
    const hasSprint = Boolean(raceQuery?.hasSprint ?? raceFromList?.hasSprint);
    return getSessionsForWeekend(hasSprint);
  }, [raceFromList?.hasSprint, raceQuery?.hasSprint]);

  const selectedSessionLockAt = useMemo(() => {
    if (!raceQuery) {
      return undefined;
    }
    const lockBySession: Record<SessionType, number | undefined> = {
      quali: raceQuery.qualiLockAt,
      sprint_quali: raceQuery.sprintQualiLockAt,
      sprint: raceQuery.sprintLockAt,
      race: raceQuery.predictionLockAt,
    };
    return lockBySession[selectedSession];
  }, [raceQuery, selectedSession]);

  const selectedSessionLockDisplay = useMemo(() => {
    if (typeof selectedSessionLockAt !== "number") {
      return null;
    }
    const slug = raceQuery?.slug ?? selectedRaceSlug;
    if (!slug) {
      return null;
    }
    return formatRaceDate(new Date(selectedSessionLockAt).toISOString(), slug);
  }, [raceQuery?.slug, selectedRaceSlug, selectedSessionLockAt]);

  useEffect(() => {
    if (!selectedRaceSlug && races.length > 0) {
      setSelectedRaceSlug(races[0].slug);
    }
  }, [races, selectedRaceSlug]);

  useEffect(() => {
    if (!sessionOptions.includes(selectedSession)) {
      setSelectedSession(sessionOptions[0] ?? "race");
    }
  }, [selectedSession, sessionOptions]);

  const activeDraftKey = selectedRaceSlug
    ? `${selectedRaceSlug}:${selectedSession}`
    : null;

  useEffect(() => {
    if (!raceQuery || !activeDraftKey) {
      setTop5([]);
      setH2HByMatchup({});
      setIsCurrentDraftDirty(false);
      hydratedKeyRef.current = null;
      return;
    }

    if (hydratedKeyRef.current === activeDraftKey) {
      return;
    }

    let cancelled = false;

    async function hydrateFromDraftOrServer() {
      const draft = await loadConnectedDraft(selectedRaceSlug, selectedSession);
      if (cancelled) {
        return;
      }

      if (draft) {
        setTop5(draft.top5);
        setH2HByMatchup(draft.h2hByMatchup);
        setIsCurrentDraftDirty(true);
        setRestoredDraftAt(draft.updatedAt);
      } else {
        setTop5((existingTop5Query?.picks ?? []) as Array<string>);
        const h2hForSession = existingH2HQuery?.[selectedSession];
        setH2HByMatchup(h2hForSession ?? {});
        setIsCurrentDraftDirty(false);
        setRestoredDraftAt(null);
      }

      hydratedKeyRef.current = activeDraftKey;
    }

    void hydrateFromDraftOrServer();

    return () => {
      cancelled = true;
    };
  }, [
    activeDraftKey,
    existingH2HQuery,
    existingTop5Query,
    raceQuery,
    selectedRaceSlug,
    selectedSession,
  ]);

  useEffect(() => {
    if (
      !selectedRaceSlug ||
      !isCurrentDraftDirty ||
      hydratedKeyRef.current !== activeDraftKey
    ) {
      return;
    }

    void saveConnectedDraft(selectedRaceSlug, selectedSession, {
      h2hByMatchup,
      top5,
      updatedAt: new Date().toISOString(),
    });
  }, [
    activeDraftKey,
    h2hByMatchup,
    isCurrentDraftDirty,
    selectedRaceSlug,
    selectedSession,
    top5,
  ]);

  const selectedSessionRemainingMs =
    typeof selectedSessionLockAt === "number"
      ? selectedSessionLockAt - now
      : null;
  const lockStatus = getLockStatusViewModel(
    selectedSessionRemainingMs ?? Number.POSITIVE_INFINITY,
    now,
  );
  const isSelectedSessionLocked = lockStatus.isLocked;
  const canSave = useMemo(() => {
    if (!h2hMatchupsQuery) {
      return false;
    }
    return (
      !isSelectedSessionLocked &&
      top5.length === MAX_TOP5 &&
      Object.keys(h2hByMatchup).length === h2hMatchupsQuery.length
    );
  }, [h2hByMatchup, h2hMatchupsQuery, isSelectedSessionLocked, top5.length]);

  function toggleTop5(driverId: string) {
    setSaveStatus(null);
    setIsCurrentDraftDirty(true);
    setTop5((prev) => {
      if (prev.includes(driverId)) {
        return prev.filter((id) => id !== driverId);
      }
      if (prev.length >= MAX_TOP5) {
        return prev;
      }
      return [...prev, driverId];
    });
  }

  function setH2HPick(matchupId: string, predictedWinnerId: string) {
    setSaveStatus(null);
    setIsCurrentDraftDirty(true);
    setH2HByMatchup((prev) => ({ ...prev, [matchupId]: predictedWinnerId }));
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
      "Switch sessions and discard your unsaved changes?",
      [
        { style: "cancel", text: "Keep editing" },
        {
          style: "destructive",
          text: "Discard",
          onPress: () => {
            void clearConnectedDraft(selectedRaceSlug, selectedSession);
            setIsCurrentDraftDirty(false);
            hydratedKeyRef.current = null;
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
      hydratedKeyRef.current = null;
      setSelectedRaceSlug(nextRaceSlug);
      return;
    }
    Alert.alert(
      "Unsaved changes",
      "Switch races and discard your unsaved changes?",
      [
        { style: "cancel", text: "Keep editing" },
        {
          style: "destructive",
          text: "Discard",
          onPress: () => {
            void clearConnectedDraft(selectedRaceSlug, selectedSession);
            setIsCurrentDraftDirty(false);
            hydratedKeyRef.current = null;
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
    await clearConnectedDraft(selectedRaceSlug, selectedSession);
    setTop5((existingTop5Query?.picks ?? []) as Array<string>);
    setH2HByMatchup(existingH2HQuery?.[selectedSession] ?? {});
    setIsCurrentDraftDirty(false);
    setRestoredDraftAt(null);
    setSaveStatus("Draft discarded");
  }

  async function handleSave() {
    if (!canSave || !raceQuery || !h2hMatchupsQuery) {
      return;
    }

    try {
      await submitPrediction({
        picks: top5 as Array<ConvexId<"drivers">>,
        raceId: raceQuery._id,
        sessionType: selectedSession,
      });
      await submitH2H({
        picks: h2hMatchupsQuery.map((matchup) => ({
          matchupId: matchup._id,
          predictedWinnerId: h2hByMatchup[matchup._id] as ConvexId<"drivers">,
        })),
        raceId: raceQuery._id,
        sessionType: selectedSession,
      });
      await clearConnectedDraft(selectedRaceSlug, selectedSession);
      setIsCurrentDraftDirty(false);
      setRestoredDraftAt(null);
      setSaveStatus(`Saved ${SESSION_LABELS_SHORT[selectedSession]} picks`);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : "Save failed");
    }
  }

  if (!convexEnabled) {
    return (
      <PicksScreen
        onOpenRace={(raceSlug) =>
          navigation.navigate("RaceDetail", { raceSlug })
        }
        races={races}
      />
    );
  }

  if (
    driversQuery === undefined ||
    h2hMatchupsQuery === undefined ||
    raceQuery === undefined
  ) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading picks data...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Text
        style={[
          styles.title,
          titleFontFamily ? { fontFamily: titleFontFamily } : null,
        ]}
      >
        Picks (Connected)
      </Text>
      <Text style={styles.subtitle}>
        Submits session-specific picks to Convex.
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
        <Text style={styles.cardTitle}>Race</Text>
        <View style={styles.rowWrap}>
          {races.map((race) => {
            const active = race.slug === selectedRaceSlug;
            return (
              <Pressable
                key={race.slug}
                onPress={() => trySwitchRace(race.slug)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={styles.chipText}>{race.country}</Text>
              </Pressable>
            );
          })}
        </View>
        {selectedRaceSlug ? (
          <Pressable
            onPress={() =>
              navigation.navigate("RaceDetail", { raceSlug: selectedRaceSlug })
            }
            style={styles.openRaceButton}
          >
            <Text style={styles.saveButtonText}>Open Race Details</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session</Text>
        <View style={styles.rowWrap}>
          {sessionOptions.map((sessionType) => {
            const active = selectedSession === sessionType;
            return (
              <Pressable
                key={sessionType}
                onPress={() => trySwitchSession(sessionType)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text style={styles.chipText}>
                  {SESSION_LABELS_SHORT[sessionType]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {isSelectedSessionLocked ? (
          <Text style={styles.lockedText}>
            This session is locked. Viewing only.
          </Text>
        ) : (
          <Text style={styles.unlockedText}>
            This session is open for edits.
          </Text>
        )}
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
        <Text style={styles.cardTitle}>Top 5 ({top5.length}/5)</Text>
        <View style={styles.rowWrap}>
          {driversQuery.map((driver) => {
            const selected = top5.includes(driver._id);
            const disabled =
              isSelectedSessionLocked || (!selected && top5.length >= MAX_TOP5);
            return (
              <Pressable
                key={driver._id}
                disabled={disabled}
                onPress={() => toggleTop5(driver._id)}
                style={[
                  styles.chip,
                  selected ? styles.chipActive : null,
                  disabled ? styles.disabled : null,
                ]}
              >
                <Text style={styles.chipText}>{driver.code}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>H2H</Text>
        {h2hMatchupsQuery.map((matchup) => {
          const selected = h2hByMatchup[matchup._id];
          return (
            <View key={matchup._id} style={styles.matchup}>
              <Text style={styles.matchupLabel}>{matchup.team}</Text>
              <View style={styles.matchupRow}>
                <Pressable
                  disabled={isSelectedSessionLocked}
                  onPress={() => setH2HPick(matchup._id, matchup.driver1._id)}
                  style={[
                    styles.chip,
                    selected === matchup.driver1._id ? styles.chipActive : null,
                    isSelectedSessionLocked ? styles.disabled : null,
                  ]}
                >
                  <Text style={styles.chipText}>{matchup.driver1.code}</Text>
                </Pressable>
                <Pressable
                  disabled={isSelectedSessionLocked}
                  onPress={() => setH2HPick(matchup._id, matchup.driver2._id)}
                  style={[
                    styles.chip,
                    selected === matchup.driver2._id ? styles.chipActive : null,
                    isSelectedSessionLocked ? styles.disabled : null,
                  ]}
                >
                  <Text style={styles.chipText}>{matchup.driver2.code}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable
        disabled={!canSave}
        onPress={handleSave}
        style={[styles.saveButton, !canSave ? styles.disabled : null]}
      >
        <Text style={styles.saveButtonText}>
          {canSave
            ? `Save ${SESSION_LABELS_SHORT[selectedSession]}`
            : "Complete Top 5 + H2H for this session"}
        </Text>
      </Pressable>

      {saveStatus ? <Text style={styles.status}>{saveStatus}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 10,
    padding: 12,
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
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    gap: 14,
    paddingBottom: 24,
    paddingTop: 4,
  },
  disabled: {
    opacity: 0.45,
  },
  loading: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
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
  lockedText: {
    color: colors.error,
    fontSize: 12,
    lineHeight: 16,
  },
  matchup: {
    gap: 6,
  },
  matchupLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  matchupRow: {
    flexDirection: "row",
    gap: 8,
  },
  openRaceButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 10,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
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
    paddingHorizontal: 16,
  },
  status: {
    color: colors.success,
    fontSize: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.2,
    lineHeight: 38,
  },
  unlockedText: {
    color: colors.success,
    fontSize: 12,
    lineHeight: 16,
  },
});
