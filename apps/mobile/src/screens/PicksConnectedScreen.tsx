import { Ionicons } from '@expo/vector-icons';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
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
import { EmptyState } from '../components/ui/EmptyState';
import { FlagImage } from '../components/ui/FlagImage';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import type { ConvexDoc, ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useUserDateFormat } from '../lib/dates';
import { getTeamColor } from '../lib/teamColors';
import { formatCountdown, getLockStatusViewModel } from '../lib/lockTime';
import { loadConnectedDraft, patchConnectedDraft } from '../lib/picksDrafts';
import { useNow } from '../lib/useNow';
import { useMobileConfig } from '../providers/mobile-config';
import { useToast } from '../providers/ToastProvider';
import { colors, radii } from '../theme/tokens';

const MAX_TOP5 = 5;
const CASCADE_DRAFT_SESSION: SessionType = 'race';

type RaceDoc = ConvexDoc<'races'>;
type DriverId = ConvexId<'drivers'>;
type DriverDoc = ConvexDoc<'drivers'>;

function getSessionLockAt(
  race: RaceDoc,
  session: SessionType,
): number | undefined {
  return {
    quali: race.qualiLockAt,
    sprint_quali: race.sprintQualiLockAt,
    sprint: race.sprintLockAt,
    race: race.predictionLockAt,
  }[session];
}

export function PicksConnectedScreen() {
  const { convexEnabled } = useMobileConfig();
  const quickPickRace = useQuery(
    api.races.getQuickPickRace,
    convexEnabled ? {} : 'skip',
  );

  if (!convexEnabled) {
    return <NotAvailableState />;
  }

  if (quickPickRace === undefined) {
    return <LoadingScreen />;
  }

  if (quickPickRace === null) {
    return <NoUpcomingRaceState />;
  }

  return <PredictForRace race={quickPickRace} />;
}

function PredictForRace({ race }: { race: RaceDoc }) {
  const now = useNow();
  const { showToast } = useToast();
  const driversQuery = useQuery(api.drivers.listDrivers, {});
  const matchupsQuery = useQuery(api.h2h.getMatchupsForSeason, {
    season: 2026,
  });
  const weekendPredictions = useQuery(api.predictions.myWeekendPredictions, {
    raceId: race._id,
  });
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });

  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const randomizePredictions = useMutation(
    api.predictions.randomizePredictions,
  );

  const weekendSessions = getSessionsForWeekend(Boolean(race.hasSprint));

  const sessionLockState = weekendSessions.map((session) => {
    const lockAt = getSessionLockAt(race, session);
    const remaining =
      typeof lockAt === 'number' ? lockAt - now : Number.POSITIVE_INFINITY;
    const status = getLockStatusViewModel(remaining, now);
    return { session, lockAt, isLocked: status.isLocked };
  });

  const nextOpenSession =
    sessionLockState.find((s) => !s.isLocked)?.session ??
    weekendSessions[weekendSessions.length - 1];

  const [selectedSession, setSelectedSession] =
    useState<SessionType>(nextOpenSession);

  useEffect(() => {
    if (!weekendSessions.includes(selectedSession)) {
      setSelectedSession(nextOpenSession);
    }
  }, [nextOpenSession, selectedSession, weekendSessions]);

  if (
    driversQuery === undefined ||
    matchupsQuery === undefined ||
    weekendPredictions === undefined ||
    h2hPredictions === undefined
  ) {
    return <LoadingScreen />;
  }

  const drivers = driversQuery;
  const matchups = matchupsQuery;
  const predictionsBySession = weekendPredictions?.predictions ?? {
    quali: null,
    sprint_quali: null,
    sprint: null,
    race: null,
  };
  const hasAnyTop5 = Object.values(predictionsBySession).some(
    (p) => p !== null,
  );
  const hasAnyH2H = Object.values(h2hPredictions ?? {}).some((s) => s !== null);

  const selectedLockAt = getSessionLockAt(race, selectedSession);
  const selectedSessionIsLocked = Boolean(
    sessionLockState.find((s) => s.session === selectedSession)?.isLocked,
  );

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader race={race} selectedSession={selectedSession} now={now} />

      {hasAnyTop5 && weekendSessions.length > 1 ? (
        <SessionTabs
          sessions={weekendSessions}
          selected={selectedSession}
          lockState={sessionLockState}
          predictionsBySession={predictionsBySession}
          onSelect={(s) => {
            void Haptics.selectionAsync();
            setSelectedSession(s);
          }}
        />
      ) : null}

      {!hasAnyTop5 || !hasAnyH2H ? (
        <CascadeBanner
          hasSprint={Boolean(race.hasSprint)}
          showBanner={!hasAnyTop5}
          onRandomize={async () => {
            try {
              if (!hasAnyTop5) {
                await randomizePredictions({ raceId: race._id });
              }
              if (!hasAnyH2H && matchups.length > 0) {
                await submitH2H({
                  raceId: race._id,
                  picks: matchups.map((m) => ({
                    matchupId: m._id,
                    predictedWinnerId:
                      Math.random() < 0.5
                        ? (m.driver1._id as DriverId)
                        : (m.driver2._id as DriverId),
                  })),
                });
              }
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              showToast('Random picks saved for the weekend', 'success');
            } catch (err) {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error,
              );
              showToast(
                err instanceof Error ? err.message : 'Randomize failed',
                'error',
              );
            }
          }}
          mode={!hasAnyTop5 ? 'all' : 'h2h'}
        />
      ) : null}

      <Top5Section
        race={race}
        drivers={drivers}
        selectedSession={selectedSession}
        selectedLockAt={selectedLockAt}
        cascadeMode={!hasAnyTop5}
        existingPicks={predictionsBySession[selectedSession] ?? []}
        sessionIsLocked={selectedSessionIsLocked}
        onSubmit={async (picks, sessionType) => {
          await submitPrediction({
            raceId: race._id,
            picks: picks as DriverId[],
            sessionType,
          });
        }}
      />

      {hasAnyTop5 || matchups.length === 0 ? (
        matchups.length === 0 ? null : (
          <H2HSection
            cascadeMode={!hasAnyH2H}
            existingPicks={h2hPredictions?.[selectedSession] ?? {}}
            matchups={matchups}
            race={race}
            selectedSession={selectedSession}
            sessionIsLocked={selectedSessionIsLocked}
            onSubmit={async (picks, sessionType) => {
              await submitH2H({
                raceId: race._id,
                picks: matchups.map((m) => ({
                  matchupId: m._id,
                  predictedWinnerId: picks[m._id] as DriverId,
                })),
                sessionType,
              });
            }}
          />
        )
      ) : (
        <Text style={styles.h2hLockedNote}>
          Save your Top 5 first to unlock H2H picks.
        </Text>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page header — flat, no card
// ─────────────────────────────────────────────────────────────────────────

function PageHeader({
  race,
  selectedSession,
  now,
}: {
  race: RaceDoc;
  selectedSession: SessionType;
  now: number;
}) {
  const { formatRaceDate } = useUserDateFormat();
  const lockAt = getSessionLockAt(race, selectedSession);
  const remaining =
    typeof lockAt === 'number' ? lockAt - now : Number.POSITIVE_INFINITY;
  const lockStatus = getLockStatusViewModel(remaining, now);
  const lockDisplay =
    typeof lockAt === 'number'
      ? formatRaceDate(new Date(lockAt).toISOString(), race.slug)
      : null;

  const countdownLabel = (() => {
    if (typeof lockAt !== 'number') {
      return null;
    }
    if (lockStatus.isLocked) {
      return `${SESSION_LABELS[selectedSession]} locked`;
    }
    return `${SESSION_LABELS[selectedSession]} locks in ${formatCountdown(remaining)}`;
  })();

  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>
        Round {race.round} · {race.season}
      </Text>
      <View style={styles.headerTitleRow}>
        <FlagImage raceSlug={race.slug} />
        <Text numberOfLines={2} style={styles.headerTitle}>
          {race.name}
        </Text>
      </View>
      {countdownLabel ? (
        <Text style={styles.headerMeta}>
          <Text
            style={lockStatus.isLocked ? styles.metaMuted : styles.metaAccent}
          >
            {countdownLabel}
          </Text>
          {lockDisplay ? (
            <Text style={styles.metaMuted}> · {lockDisplay.local}</Text>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}

function CascadeBanner({
  hasSprint,
  showBanner,
  onRandomize,
  mode,
}: {
  hasSprint: boolean;
  /** When false, suppress the cascade copy (Top 5 is already saved) — keep only the action row. */
  showBanner: boolean;
  onRandomize: () => Promise<void>;
  mode: 'all' | 'h2h';
}) {
  function confirmRandomize() {
    Alert.alert(
      mode === 'all' ? 'Randomize all picks?' : 'Randomize H2H picks?',
      mode === 'all'
        ? `Generates a random Top 5 and Head-to-Head for ${
            hasSprint
              ? 'Sprint Quali, Sprint, Quali, and Race'
              : 'Qualifying and Race'
          }. You can still edit any session before it starts.`
        : 'Generates random Head-to-Head picks for the whole weekend. You can still edit any session before it starts.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          text: 'Randomize',
          onPress: () => {
            void onRandomize();
          },
        },
      ],
    );
  }

  return (
    <View style={styles.cascadeBlock}>
      {showBanner ? (
        <View style={styles.cascadeRow}>
          <Ionicons color={colors.accent} name="flash" size={14} />
          <Text style={styles.cascadeText}>
            First save covers{' '}
            {hasSprint
              ? 'Sprint Quali, Sprint, Quali, and Race'
              : 'Qualifying and Race'}
            . You can fine-tune any session before it starts.
          </Text>
        </View>
      ) : null}
      <Pressable
        hitSlop={6}
        onPress={confirmRandomize}
        style={styles.randomizeRow}
      >
        <Ionicons color={colors.accent} name="dice" size={13} />
        <Text style={styles.randomizeText}>
          {mode === 'all' ? 'Randomize all picks' : 'Randomize H2H picks'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session tabs (underline, no borders)
// ─────────────────────────────────────────────────────────────────────────

type SessionLockEntry = {
  session: SessionType;
  lockAt: number | undefined;
  isLocked: boolean;
};

function SessionTabs({
  sessions,
  selected,
  lockState,
  predictionsBySession,
  onSelect,
}: {
  sessions: ReadonlyArray<SessionType>;
  selected: SessionType;
  lockState: ReadonlyArray<SessionLockEntry>;
  predictionsBySession: Record<SessionType, ReadonlyArray<string> | null>;
  onSelect: (session: SessionType) => void;
}) {
  return (
    <View style={styles.tabRow}>
      {sessions.map((session) => {
        const lock = lockState.find((s) => s.session === session);
        const active = session === selected;
        const isLocked = lock?.isLocked ?? false;
        const hasPicks = predictionsBySession[session] !== null;
        return (
          <Pressable
            key={session}
            onPress={() => onSelect(session)}
            style={styles.tab}
          >
            <View style={styles.tabLabelRow}>
              <Text
                style={[styles.tabLabel, active ? styles.tabLabelActive : null]}
              >
                {SESSION_LABELS_SHORT[session]}
              </Text>
              {isLocked ? (
                <Ionicons
                  color={colors.textMuted}
                  name="lock-closed"
                  size={10}
                />
              ) : (
                <View
                  style={[
                    styles.tabDot,
                    {
                      backgroundColor: hasPicks
                        ? colors.success
                        : colors.warning,
                    },
                  ]}
                />
              )}
            </View>
            <View
              style={[
                styles.tabUnderline,
                active ? styles.tabUnderlineActive : null,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section eyebrow row (caps title + optional action)
// ─────────────────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>{title}</Text>
      {action ?? null}
    </View>
  );
}

function EditToggle({
  editing,
  onToggle,
}: {
  editing: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable hitSlop={8} onPress={onToggle} style={styles.editToggle}>
      <Ionicons
        color={colors.accent}
        name={editing ? 'close' : 'pencil'}
        size={12}
      />
      <Text style={styles.editToggleText}>{editing ? 'Cancel' : 'Edit'}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Top 5 section
// ─────────────────────────────────────────────────────────────────────────

function Top5Section({
  race,
  drivers,
  selectedSession,
  selectedLockAt,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onSubmit,
}: {
  race: RaceDoc;
  drivers: Array<DriverDoc>;
  selectedSession: SessionType;
  selectedLockAt: number | undefined;
  cascadeMode: boolean;
  existingPicks: ReadonlyArray<string>;
  sessionIsLocked: boolean;
  onSubmit: (
    picks: string[],
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(cascadeMode);

  useEffect(() => {
    setEditing(cascadeMode);
  }, [cascadeMode, selectedSession]);

  const showEditToggle = !cascadeMode && !sessionIsLocked;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Top 5"
        action={
          showEditToggle ? (
            <EditToggle
              editing={editing}
              onToggle={() => setEditing((v) => !v)}
            />
          ) : null
        }
      />
      {editing ? (
        <Top5Editor
          race={race}
          drivers={drivers}
          selectedSession={selectedSession}
          selectedLockAt={selectedLockAt}
          cascadeMode={cascadeMode}
          existingPicks={existingPicks}
          sessionIsLocked={sessionIsLocked}
          onCancel={() => setEditing(false)}
          onSubmit={onSubmit}
        />
      ) : (
        <Top5Readonly
          drivers={drivers}
          picks={existingPicks}
          sessionLocked={sessionIsLocked}
        />
      )}
    </View>
  );
}

function Top5Editor({
  race,
  drivers,
  selectedSession,
  selectedLockAt,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onCancel,
  onSubmit,
}: {
  race: RaceDoc;
  drivers: Array<DriverDoc>;
  selectedSession: SessionType;
  selectedLockAt: number | undefined;
  cascadeMode: boolean;
  existingPicks: ReadonlyArray<string>;
  sessionIsLocked: boolean;
  onCancel: () => void;
  onSubmit: (
    picks: string[],
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const { showToast } = useToast();
  const { formatDateTime } = useUserDateFormat();
  const draftSession = cascadeMode ? CASCADE_DRAFT_SESSION : selectedSession;
  const [picks, setPicks] = useState<string[]>([...existingPicks]);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${race.slug}:${draftSession}`;
    if (hydratedRef.current === key) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const draft = await loadConnectedDraft(race.slug, draftSession);
      if (cancelled) {
        return;
      }
      if (draft && draft.top5.length > 0) {
        setPicks(draft.top5);
        setIsDirty(true);
        setRestoredDraftAt(draft.updatedAt);
      } else {
        setPicks([...existingPicks]);
        setIsDirty(false);
        setRestoredDraftAt(null);
      }
      hydratedRef.current = key;
    })();
    return () => {
      cancelled = true;
    };
  }, [draftSession, existingPicks, race.slug]);

  useEffect(() => {
    const key = `${race.slug}:${draftSession}`;
    if (!isDirty || hydratedRef.current !== key) {
      return;
    }
    void patchConnectedDraft(race.slug, draftSession, { top5: picks });
  }, [draftSession, isDirty, picks, race.slug]);

  function updatePicks(next: string[]) {
    setIsDirty(true);
    setPicks(next);
  }

  async function handleSave() {
    if (picks.length !== MAX_TOP5 || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(picks, cascadeMode ? undefined : selectedSession);
      // Only clear the Top 5 portion of the draft — preserve any in-progress H2H.
      await patchConnectedDraft(race.slug, draftSession, { top5: [] });
      setIsDirty(false);
      setRestoredDraftAt(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        cascadeMode
          ? '🏁 Locked in for the weekend'
          : `Saved ${SESSION_LABELS[selectedSession]} picks`,
        'success',
      );
      if (!cascadeMode) {
        onCancel();
      }
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        error instanceof Error ? error.message : 'Save failed',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDiscardDraft() {
    await patchConnectedDraft(race.slug, draftSession, { top5: [] });
    setPicks([...existingPicks]);
    setIsDirty(false);
    setRestoredDraftAt(null);
  }

  // Soft warn if the session lock is < 30 min away when editing
  const lockSoon =
    typeof selectedLockAt === 'number' &&
    !sessionIsLocked &&
    selectedLockAt - Date.now() < 30 * 60 * 1000;

  const canSave = picks.length === MAX_TOP5 && !sessionIsLocked && isDirty;
  const ctaLabel = cascadeMode
    ? 'Save weekend picks'
    : `Save ${SESSION_LABELS_SHORT[selectedSession]} picks`;

  return (
    <View style={styles.editorBody}>
      {restoredDraftAt ? (
        <View style={styles.draftRow}>
          <Text style={styles.draftText}>
            Draft from {formatDateTime(restoredDraftAt)}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => {
              void handleDiscardDraft();
            }}
          >
            <Text style={styles.draftDiscard}>Discard</Text>
          </Pressable>
        </View>
      ) : null}

      {lockSoon ? (
        <Text style={styles.warnText}>
          Heads up: locks soon. Save before the session starts.
        </Text>
      ) : null}

      <DraggableTop5
        disabled={sessionIsLocked}
        drivers={drivers}
        onChange={updatePicks}
        picks={picks}
      />

      <Pressable
        disabled={!canSave || isSubmitting}
        onPress={() => {
          void handleSave();
        }}
        style={[styles.cta, !canSave ? styles.ctaDisabled : null]}
      >
        <Text style={styles.ctaText}>
          {isSubmitting
            ? 'Saving…'
            : sessionIsLocked
              ? 'Session locked'
              : picks.length !== MAX_TOP5
                ? `Pick ${MAX_TOP5 - picks.length} more`
                : ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function Top5Readonly({
  drivers,
  picks,
  sessionLocked,
}: {
  drivers: Array<DriverDoc>;
  picks: ReadonlyArray<string>;
  sessionLocked: boolean;
}) {
  const driverById = new Map(drivers.map((d) => [d._id as string, d]));

  if (picks.length === 0) {
    return (
      <Text style={styles.flatEmpty}>No picks saved for this session yet.</Text>
    );
  }

  return (
    <View>
      {picks.map((id, index) => {
        const driver = driverById.get(id);
        return (
          <View key={`${id}-${index}`}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.flatRow}>
              <View
                style={[
                  styles.accentStripe,
                  { backgroundColor: getTeamColor(driver?.team) },
                ]}
              />
              <Numeral style={styles.positionLabel} variant="large">
                {`P${index + 1}`}
              </Numeral>
              <View style={styles.flatRowBody}>
                <Text style={styles.driverCode}>{driver?.code ?? '???'}</Text>
                <Text numberOfLines={1} style={styles.driverName}>
                  {driver?.displayName ?? 'Unknown driver'}
                </Text>
              </View>
              {sessionLocked ? (
                <Ionicons
                  color={colors.textMuted}
                  name="lock-closed-outline"
                  size={12}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// H2H section
// ─────────────────────────────────────────────────────────────────────────

type Matchup = {
  _id: string;
  team: string;
  driver1: { _id: string; code: string };
  driver2: { _id: string; code: string };
};

function H2HSection({
  race,
  matchups,
  selectedSession,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onSubmit,
}: {
  race: RaceDoc;
  matchups: ReadonlyArray<Matchup>;
  selectedSession: SessionType;
  cascadeMode: boolean;
  existingPicks: Record<string, string>;
  sessionIsLocked: boolean;
  onSubmit: (
    picks: Record<string, string>,
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const [editing, setEditing] = useState(cascadeMode);

  useEffect(() => {
    setEditing(cascadeMode);
  }, [cascadeMode, selectedSession]);

  const showEditToggle = !cascadeMode && !sessionIsLocked;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Head to Head"
        action={
          showEditToggle ? (
            <EditToggle
              editing={editing}
              onToggle={() => setEditing((v) => !v)}
            />
          ) : null
        }
      />
      {editing ? (
        <H2HEditor
          cascadeMode={cascadeMode}
          existingPicks={existingPicks}
          matchups={matchups}
          onCancel={() => setEditing(false)}
          onSubmit={onSubmit}
          race={race}
          selectedSession={selectedSession}
          sessionIsLocked={sessionIsLocked}
        />
      ) : (
        <H2HReadonly
          matchups={matchups}
          selections={existingPicks}
          sessionLocked={sessionIsLocked}
        />
      )}
    </View>
  );
}

function H2HEditor({
  race,
  matchups,
  selectedSession,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onCancel,
  onSubmit,
}: {
  race: RaceDoc;
  matchups: ReadonlyArray<Matchup>;
  selectedSession: SessionType;
  cascadeMode: boolean;
  existingPicks: Record<string, string>;
  sessionIsLocked: boolean;
  onCancel: () => void;
  onSubmit: (
    picks: Record<string, string>,
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const { showToast } = useToast();
  const { formatDateTime } = useUserDateFormat();
  const draftSession = cascadeMode ? CASCADE_DRAFT_SESSION : selectedSession;
  const [selections, setSelections] = useState<Record<string, string>>({
    ...existingPicks,
  });
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    const key = `${race.slug}:${draftSession}`;
    if (hydratedRef.current === key) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const draft = await loadConnectedDraft(race.slug, draftSession);
      if (cancelled) {
        return;
      }
      if (draft && Object.keys(draft.h2hByMatchup).length > 0) {
        setSelections(draft.h2hByMatchup);
        setIsDirty(true);
        setRestoredDraftAt(draft.updatedAt);
      } else {
        setSelections({ ...existingPicks });
        setIsDirty(false);
        setRestoredDraftAt(null);
      }
      hydratedRef.current = key;
    })();
    return () => {
      cancelled = true;
    };
  }, [draftSession, existingPicks, race.slug]);

  useEffect(() => {
    const key = `${race.slug}:${draftSession}`;
    if (!isDirty || hydratedRef.current !== key) {
      return;
    }
    void patchConnectedDraft(race.slug, draftSession, {
      h2hByMatchup: selections,
    });
  }, [draftSession, isDirty, race.slug, selections]);

  const isComplete = Object.keys(selections).length === matchups.length;
  const canSave = isComplete && !sessionIsLocked;

  async function handleSave() {
    if (!canSave || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(selections, cascadeMode ? undefined : selectedSession);
      // Only clear the H2H portion of the draft — preserve any in-progress Top 5.
      await patchConnectedDraft(race.slug, draftSession, { h2hByMatchup: {} });
      setIsDirty(false);
      setRestoredDraftAt(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        cascadeMode
          ? '🏁 H2H locked in for the weekend'
          : `Saved ${SESSION_LABELS[selectedSession]} H2H`,
        'success',
      );
      if (!cascadeMode) {
        onCancel();
      }
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        error instanceof Error ? error.message : 'Save failed',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDiscardDraft() {
    await patchConnectedDraft(race.slug, draftSession, { h2hByMatchup: {} });
    setSelections({ ...existingPicks });
    setIsDirty(false);
    setRestoredDraftAt(null);
  }

  return (
    <View style={styles.editorBody}>
      {restoredDraftAt ? (
        <View style={styles.draftRow}>
          <Text style={styles.draftText}>
            H2H draft from {formatDateTime(restoredDraftAt)}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => {
              void handleDiscardDraft();
            }}
          >
            <Text style={styles.draftDiscard}>Discard</Text>
          </Pressable>
        </View>
      ) : null}

      <H2HMatchupGrid
        matchups={matchups as Array<Matchup>}
        mode={sessionIsLocked ? 'readonly' : 'interactive'}
        onSelect={(matchupId, driverId) => {
          setIsDirty(true);
          setSelections((prev) => ({ ...prev, [matchupId]: driverId }));
        }}
        selections={selections}
      />

      <Pressable
        disabled={!canSave || isSubmitting}
        onPress={() => {
          void handleSave();
        }}
        style={[styles.cta, !canSave ? styles.ctaDisabled : null]}
      >
        <Text style={styles.ctaText}>
          {isSubmitting
            ? 'Saving…'
            : sessionIsLocked
              ? 'Session locked'
              : !isComplete
                ? `Pick ${matchups.length - Object.keys(selections).length} more`
                : cascadeMode
                  ? 'Save weekend H2H'
                  : `Save ${SESSION_LABELS_SHORT[selectedSession]} H2H`}
        </Text>
      </Pressable>
    </View>
  );
}

function H2HReadonly({
  matchups,
  selections,
  sessionLocked,
}: {
  matchups: ReadonlyArray<Matchup>;
  selections: Record<string, string>;
  sessionLocked: boolean;
}) {
  if (matchups.length === 0) {
    return null;
  }
  const hasAny = Object.keys(selections).length > 0;
  if (!hasAny) {
    return (
      <Text style={styles.flatEmpty}>No H2H picks saved for this session.</Text>
    );
  }
  return (
    <View>
      {matchups.map((matchup, index) => {
        const teamColor = getTeamColor(matchup.team);
        const winnerId = selections[matchup._id];
        const winner =
          winnerId === matchup.driver1._id
            ? matchup.driver1
            : winnerId === matchup.driver2._id
              ? matchup.driver2
              : null;
        const loser = winner
          ? winner._id === matchup.driver1._id
            ? matchup.driver2
            : matchup.driver1
          : null;
        return (
          <View key={matchup._id}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.flatRow}>
              <View
                style={[styles.accentStripe, { backgroundColor: teamColor }]}
              />
              <Text style={styles.h2hTeam}>{matchup.team}</Text>
              <View style={styles.h2hPick}>
                {winner ? (
                  <>
                    <Text style={styles.h2hWinner}>{winner.code}</Text>
                    <Text style={styles.h2hOver}>over</Text>
                    <Text style={styles.h2hLoser}>{loser?.code ?? '—'}</Text>
                  </>
                ) : (
                  <Text style={styles.h2hMissing}>Not picked</Text>
                )}
              </View>
              {sessionLocked ? (
                <Ionicons
                  color={colors.textMuted}
                  name="lock-closed-outline"
                  size={12}
                />
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Empty / fallback states
// ─────────────────────────────────────────────────────────────────────────

function NoUpcomingRaceState() {
  return (
    <View style={styles.fallbackWrap}>
      <EmptyState
        body="There's no race open for predictions right now. Check back when the next round's picks unlock."
        icon="flag-outline"
        title="No race to predict"
      />
    </View>
  );
}

function NotAvailableState() {
  return (
    <View style={styles.fallbackWrap}>
      <EmptyState
        body="Predictions need a live connection to the league. Please reconnect to make picks."
        icon="cloud-offline-outline"
        title="Predictions unavailable"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const HAIRLINE = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  accentStripe: {
    alignSelf: 'stretch',
    borderRadius: 2,
    width: 3,
  },
  cascadeBlock: {
    gap: 8,
  },
  cascadeRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  cascadeText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  randomizeRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  randomizeText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  cta: {
    alignItems: 'center',
    backgroundColor: colors.buttonAccent,
    borderRadius: radii.lg,
    paddingVertical: 14,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 7, // align past the accent stripe
  },
  draftDiscard: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  draftRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  draftText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
  },
  driverCode: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  driverName: {
    color: colors.textMuted,
    fontSize: 11,
  },
  editorBody: {
    gap: 14,
    marginTop: 4,
  },
  editToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  editToggleText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  fallbackWrap: {
    backgroundColor: colors.page,
    flex: 1,
    paddingVertical: 48,
  },
  flatEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    paddingVertical: 8,
  },
  flatRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  flatRowBody: {
    flex: 1,
    gap: 2,
  },
  h2hLockedNote: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    paddingTop: 4,
  },
  h2hLoser: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  h2hMissing: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  h2hOver: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  h2hPick: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  h2hTeam: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  h2hWinner: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  header: {
    gap: 4,
  },
  headerMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  metaAccent: {
    color: colors.accentHover,
    fontWeight: '700',
  },
  metaMuted: {
    color: colors.textMuted,
  },
  positionLabel: {
    minWidth: 30,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  section: {
    gap: 8,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  statusError: {
    color: colors.error,
  },
  statusSuccess: {
    color: colors.success,
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  tabDot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.text,
  },
  tabLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  tabRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: HAIRLINE,
    flexDirection: 'row',
    gap: 4,
  },
  tabUnderline: {
    backgroundColor: 'transparent',
    height: 2,
    width: '60%',
  },
  tabUnderlineActive: {
    backgroundColor: colors.accent,
  },
  warnText: {
    color: colors.warning,
    fontSize: 12,
  },
});
