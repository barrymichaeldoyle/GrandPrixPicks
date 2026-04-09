import type { SessionType } from '@grandprixpicks/shared/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS_SHORT,
} from '@grandprixpicks/shared/sessions';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DraggableTop5 } from '../components/predict/DraggableTop5';
import { H2HMatchupGrid } from '../components/predict/H2HMatchupGrid';
import { LockBadge } from '../components/ui/LockBadge';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { SessionTabBar } from '../components/ui/SessionTabBar';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { formatRaceDate } from '../lib/dates';
import { getLockStatusViewModel } from '../lib/lockTime';
import {
  clearConnectedDraft,
  loadConnectedDraft,
  saveConnectedDraft,
} from '../lib/picksDrafts';
import { useNow } from '../lib/useNow';
import { useRaceWeekends } from '../lib/useRaceWeekends';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import { PicksScreen } from './PicksScreen';

const MAX_TOP5 = 5;

export function PicksConnectedScreen() {
  const { titleFontFamily } = useTypography();
  const { convexEnabled } = useMobileConfig();
  const { races } = useRaceWeekends();

  // Default to the next upcoming race
  const nextRaceSlug = races.find(
    (r) => new Date(r.weekendStart).getTime() >= Date.now(),
  )?.slug ?? races[0]?.slug ?? '';

  const [selectedRaceSlug, setSelectedRaceSlug] = useState<string>(nextRaceSlug);
  const [selectedSession, setSelectedSession] = useState<SessionType>('race');
  const [top5, setTop5] = useState<string[]>([]);
  const [h2hByMatchup, setH2HByMatchup] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isCurrentDraftDirty, setIsCurrentDraftDirty] = useState(false);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const now = useNow();
  const hydratedKeyRef = useRef<string | null>(null);

  const raceFromList = races.find((race) => race.slug === selectedRaceSlug);

  const driversQuery = useQuery(api.drivers.listDrivers, convexEnabled ? {} : 'skip');
  const h2hMatchupsQuery = useQuery(
    api.h2h.getMatchupsForSeason,
    convexEnabled ? { season: 2026 } : 'skip',
  );
  const raceQuery = useQuery(
    api.races.getRaceBySlug,
    convexEnabled && selectedRaceSlug ? { slug: selectedRaceSlug } : 'skip',
  );
  const existingTop5Query = useQuery(
    api.predictions.myPredictionForRace,
    convexEnabled && raceQuery
      ? { raceId: raceQuery._id, sessionType: selectedSession }
      : 'skip',
  );
  const existingH2HQuery = useQuery(
    api.h2h.myH2HPredictionsForRace,
    convexEnabled && raceQuery ? { raceId: raceQuery._id } : 'skip',
  );

  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  const hasSprint = Boolean(raceQuery?.hasSprint ?? raceFromList?.hasSprint);
  const sessionOptions = getSessionsForWeekend(hasSprint);

  const selectedSessionLockAt = !raceQuery
    ? undefined
    : ({
        quali: raceQuery.qualiLockAt,
        sprint_quali: raceQuery.sprintQualiLockAt,
        sprint: raceQuery.sprintLockAt,
        race: raceQuery.predictionLockAt,
      })[selectedSession];

  const selectedSessionLockDisplay =
    typeof selectedSessionLockAt !== 'number'
      ? null
      : (() => {
          const slug = raceQuery?.slug ?? selectedRaceSlug;
          if (!slug) {return null;}
          return formatRaceDate(new Date(selectedSessionLockAt).toISOString(), slug);
        })();

  const selectedSessionRemainingMs =
    typeof selectedSessionLockAt === 'number' ? selectedSessionLockAt - now : null;
  const lockStatus = getLockStatusViewModel(
    selectedSessionRemainingMs ?? Number.POSITIVE_INFINITY,
    now,
  );
  const isSelectedSessionLocked = lockStatus.isLocked;

  const canSave = Boolean(
    h2hMatchupsQuery &&
      !isSelectedSessionLocked &&
      top5.length === MAX_TOP5 &&
      Object.keys(h2hByMatchup).length === h2hMatchupsQuery.length,
  );

  useEffect(() => {
    if (!selectedRaceSlug && races.length > 0) {
      setSelectedRaceSlug(races[0].slug);
    }
  }, [races, selectedRaceSlug]);

  useEffect(() => {
    if (!sessionOptions.includes(selectedSession)) {
      setSelectedSession(sessionOptions[0] ?? 'race');
    }
  }, [selectedSession, sessionOptions]);

  const activeDraftKey = selectedRaceSlug ? `${selectedRaceSlug}:${selectedSession}` : null;

  useEffect(() => {
    if (!raceQuery || !activeDraftKey) {
      setTop5([]);
      setH2HByMatchup({});
      setIsCurrentDraftDirty(false);
      hydratedKeyRef.current = null;
      return;
    }
    if (hydratedKeyRef.current === activeDraftKey) {return;}

    let cancelled = false;
    async function hydrateFromDraftOrServer() {
      const draft = await loadConnectedDraft(selectedRaceSlug, selectedSession);
      if (cancelled) {return;}
      if (draft) {
        setTop5(draft.top5);
        setH2HByMatchup(draft.h2hByMatchup);
        setIsCurrentDraftDirty(true);
        setRestoredDraftAt(draft.updatedAt);
      } else {
        setTop5((existingTop5Query?.picks ?? []) as string[]);
        setH2HByMatchup(existingH2HQuery?.[selectedSession] ?? {});
        setIsCurrentDraftDirty(false);
        setRestoredDraftAt(null);
      }
      hydratedKeyRef.current = activeDraftKey;
    }
    void hydrateFromDraftOrServer();
    return () => { cancelled = true; };
  }, [activeDraftKey, existingH2HQuery, existingTop5Query, raceQuery, selectedRaceSlug, selectedSession]);

  useEffect(() => {
    if (!selectedRaceSlug || !isCurrentDraftDirty || hydratedKeyRef.current !== activeDraftKey) {return;}
    void saveConnectedDraft(selectedRaceSlug, selectedSession, {
      h2hByMatchup,
      top5,
      updatedAt: new Date().toISOString(),
    });
  }, [activeDraftKey, h2hByMatchup, isCurrentDraftDirty, selectedRaceSlug, selectedSession, top5]);

  function setH2HPick(matchupId: string, predictedWinnerId: string) {
    setSaveStatus(null);
    setIsCurrentDraftDirty(true);
    setH2HByMatchup((prev) => ({ ...prev, [matchupId]: predictedWinnerId }));
  }

  function trySwitchSession(nextSession: SessionType) {
    if (nextSession === selectedSession) {return;}
    if (!isCurrentDraftDirty) {
      setSelectedSession(nextSession);
      return;
    }
    Alert.alert('Unsaved changes', 'Switch sessions and discard unsaved changes?', [
      { style: 'cancel', text: 'Keep editing' },
      {
        style: 'destructive',
        text: 'Discard',
        onPress: () => {
          void clearConnectedDraft(selectedRaceSlug, selectedSession);
          setIsCurrentDraftDirty(false);
          hydratedKeyRef.current = null;
          setSelectedSession(nextSession);
        },
      },
    ]);
  }

  function trySwitchRace(nextRaceSlug: string) {
    if (nextRaceSlug === selectedRaceSlug) {return;}
    if (!isCurrentDraftDirty) {
      hydratedKeyRef.current = null;
      setSelectedRaceSlug(nextRaceSlug);
      return;
    }
    Alert.alert('Unsaved changes', 'Switch races and discard unsaved changes?', [
      { style: 'cancel', text: 'Keep editing' },
      {
        style: 'destructive',
        text: 'Discard',
        onPress: () => {
          void clearConnectedDraft(selectedRaceSlug, selectedSession);
          setIsCurrentDraftDirty(false);
          hydratedKeyRef.current = null;
          setSelectedRaceSlug(nextRaceSlug);
        },
      },
    ]);
  }

  async function handleDiscardDraft() {
    if (!selectedRaceSlug) {return;}
    await clearConnectedDraft(selectedRaceSlug, selectedSession);
    setTop5((existingTop5Query?.picks ?? []) as string[]);
    setH2HByMatchup(existingH2HQuery?.[selectedSession] ?? {});
    setIsCurrentDraftDirty(false);
    setRestoredDraftAt(null);
    setSaveStatus(null);
  }

  async function handleSave() {
    if (!canSave || !raceQuery || !h2hMatchupsQuery) {return;}
    try {
      await submitPrediction({
        picks: top5 as ConvexId<'drivers'>[],
        raceId: raceQuery._id,
        sessionType: selectedSession,
      });
      await submitH2H({
        picks: h2hMatchupsQuery.map((matchup) => ({
          matchupId: matchup._id,
          predictedWinnerId: h2hByMatchup[matchup._id] as ConvexId<'drivers'>,
        })),
        raceId: raceQuery._id,
        sessionType: selectedSession,
      });
      await clearConnectedDraft(selectedRaceSlug, selectedSession);
      setIsCurrentDraftDirty(false);
      setRestoredDraftAt(null);
      setSaveStatus(`✓ ${SESSION_LABELS_SHORT[selectedSession]} picks saved`);
    } catch (error) {
      setSaveStatus(error instanceof Error ? error.message : 'Save failed');
    }
  }

  // Offline fallback
  if (!convexEnabled) {
    return <PicksScreen races={races} />;
  }

  if (driversQuery === undefined || h2hMatchupsQuery === undefined || raceQuery === undefined) {
    return <LoadingScreen />;
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      {/* Header */}
      <Text style={[styles.title, titleFontFamily ? { fontFamily: titleFontFamily } : null]}>
        Predict
      </Text>

      {/* Race selector */}
      <ScrollView
        contentContainerStyle={styles.raceChips}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.raceScroll}
      >
        {races.map((race) => {
          const active = race.slug === selectedRaceSlug;
          return (
            <Pressable
              key={race.slug}
              onPress={() => trySwitchRace(race.slug)}
              style={[styles.raceChip, active ? styles.raceChipActive : null]}
            >
              <Text style={[styles.raceChipText, active ? styles.raceChipTextActive : null]}>
                {race.country}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Session + lock row */}
      <View style={styles.sessionRow}>
        <SessionTabBar
          sessions={sessionOptions}
          selected={selectedSession}
          onSelect={trySwitchSession}
        />
        <LockBadge lockStatus={lockStatus} />
      </View>

      {/* Lock details */}
      {selectedSessionLockDisplay ? (
        <Text style={styles.lockMeta}>
          Locks {selectedSessionLockDisplay.local}
        </Text>
      ) : null}

      {/* Draft banner */}
      {restoredDraftAt ? (
        <View style={styles.draftBanner}>
          <Text style={styles.draftBannerText}>
            Draft from{' '}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(restoredDraftAt))}
          </Text>
          <Pressable onPress={() => void handleDiscardDraft()} style={styles.draftDiscard}>
            <Text style={styles.draftDiscardText}>Discard</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Top 5 section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Top 5{' '}
          <Text style={styles.sectionCount}>({top5.length}/5)</Text>
        </Text>
        <DraggableTop5
          disabled={isSelectedSessionLocked}
          drivers={driversQuery}
          onChange={(newPicks) => {
            setSaveStatus(null);
            setIsCurrentDraftDirty(true);
            setTop5(newPicks);
          }}
          picks={top5}
        />
      </View>

      {/* H2H section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Head to Head{' '}
          <Text style={styles.sectionCount}>
            ({Object.keys(h2hByMatchup).length}/{h2hMatchupsQuery.length})
          </Text>
        </Text>
        <H2HMatchupGrid
          matchups={h2hMatchupsQuery}
          mode={isSelectedSessionLocked ? 'readonly' : 'interactive'}
          onSelect={setH2HPick}
          selections={h2hByMatchup}
        />
      </View>

      {/* Submit */}
      <Pressable
        disabled={!canSave}
        onPress={() => void handleSave()}
        style={[styles.submitButton, !canSave ? styles.submitDisabled : null]}
      >
        <Text style={styles.submitText}>
          {isSelectedSessionLocked
            ? 'Session locked'
            : canSave
              ? `Submit ${SESSION_LABELS_SHORT[selectedSession]} picks`
              : 'Complete Top 5 + all H2H to submit'}
        </Text>
      </Pressable>

      {saveStatus ? (
        <Text style={[
          styles.saveStatus,
          saveStatus.startsWith('✓') ? styles.saveStatusSuccess : styles.saveStatusError,
        ]}>
          {saveStatus}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  draftBanner: {
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  draftBannerText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
  },
  draftDiscard: {
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  draftDiscardText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  lockMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -8,
  },
  raceChip: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  raceChipActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  raceChips: {
    flexDirection: 'row',
    gap: 8,
  },
  raceChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  raceChipTextActive: {
    color: colors.accent,
  },
  raceScroll: {
    flexGrow: 0,
  },
  saveStatus: {
    fontSize: 13,
    textAlign: 'center',
  },
  saveStatusError: {
    color: colors.error,
  },
  saveStatusSuccess: {
    color: colors.success,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    gap: 10,
  },
  sectionCount: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  sessionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  submitDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
});
