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

import { DraggableTop5 } from '../components/predict/DraggableTop5';
import { H2HMatchupGrid } from '../components/predict/H2HMatchupGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { FlagImage } from '../components/ui/FlagImage';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import { useAutoSaveOnFirstComplete } from '../hooks/useAutoSaveOnFirstComplete';
import { useOfferPushAfterFirstSave } from '../hooks/useOfferPushAfterFirstSave';
import type { ConvexDoc, ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useUserDateFormat } from '../lib/dates';
import { getTeamColor } from '../lib/teamColors';
import { formatCountdown, getLockStatusViewModel } from '../lib/lockTime';
import { loadConnectedDraft, patchConnectedDraft } from '../lib/picksDrafts';
import { useNow } from '../lib/useNow';
import { useMobileConfig } from '../providers/mobile-config';
import { useToast } from '../providers/ToastProvider';
import { colors } from '../theme/tokens';
import { Pressable, ScrollView, Text, View } from '../tw';

const MAX_TOP5 = 5;
const CASCADE_DRAFT_SESSION: SessionType = 'race';
/**
 * Grace period after the picks first become complete before auto-saving.
 * Top 5 gets longer because pick order matters — reordering resets the timer.
 */
const TOP5_AUTO_SAVE_DELAY_MS = 2500;
const H2H_AUTO_SAVE_DELAY_MS = 1200;

type RaceDoc = ConvexDoc<'races'>;
type DriverId = ConvexId<'drivers'>;
type DriverDoc = ConvexDoc<'drivers'>;

/** Server-derived per-session capability from races.getCurrentWeekend. */
type SessionCapability = {
  sessionType: SessionType;
  lockAt: number | null;
  isLocked: boolean;
  hasResult: boolean;
  hasTop5: boolean;
  hasH2H: boolean;
  canCreate: boolean;
  canEdit: boolean;
  denialReason: 'sign_in' | 'session_locked' | 'race_not_submittable' | null;
};

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
  const weekend = useQuery(
    api.races.getCurrentWeekend,
    convexEnabled ? {} : 'skip',
  );

  if (!convexEnabled) {
    return <NotAvailableState />;
  }

  if (weekend === undefined) {
    return <LoadingScreen />;
  }

  if (weekend === null) {
    return <NoUpcomingRaceState />;
  }

  return (
    <PredictForRace
      capabilities={weekend.sessions as SessionCapability[]}
      race={weekend.race}
    />
  );
}

function PredictForRace({
  race,
  capabilities,
}: {
  race: RaceDoc;
  capabilities: SessionCapability[];
}) {
  const now = useNow();
  const maybeOfferPush = useOfferPushAfterFirstSave();
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

  const weekendSessions = getSessionsForWeekend(Boolean(race.hasSprint));

  // Server capabilities are the authority on writability; the device clock
  // only advances the locked state between query refreshes (a Convex query
  // re-runs on data changes, not on the passage of time).
  const sessionLockState = weekendSessions.map((session) => {
    const cap = capabilities.find((c) => c.sessionType === session);
    const lockAt = cap?.lockAt ?? getSessionLockAt(race, session);
    const remaining =
      typeof lockAt === 'number' ? lockAt - now : Number.POSITIVE_INFINITY;
    const status = getLockStatusViewModel(remaining, now);
    const isLocked = status.isLocked || cap?.canEdit === false;
    return { session, lockAt, isLocked, hasResult: cap?.hasResult ?? false };
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
      className="flex-1 bg-page"
      contentContainerClassName="gap-[18px] px-4 pt-3 pb-10"
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

      {!hasAnyTop5 ? (
        <CascadeBanner hasSprint={Boolean(race.hasSprint)} />
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
          const isFirstSave = !hasAnyTop5;
          await submitPrediction({
            raceId: race._id,
            picks: picks as DriverId[],
            sessionType,
          });
          if (isFirstSave) {
            void maybeOfferPush();
          }
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
        <Text className="text-muted pt-1 text-xs italic">
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
    if (lockStatus.urgency === 'closing_soon') {
      return `Closing soon — ${SESSION_LABELS[selectedSession]} locks in ${formatCountdown(remaining)}`;
    }
    return `${SESSION_LABELS[selectedSession]} locks in ${formatCountdown(remaining)}`;
  })();

  return (
    <View className="gap-1">
      <Text className="text-[10px] font-extrabold text-accent uppercase">
        Round {race.round} · {race.season}
      </Text>
      <View className="flex-row items-center gap-2.5">
        <FlagImage raceSlug={race.slug} />
        <Text
          className="text-foreground flex-1 text-[22px] leading-[26px] font-extrabold"
          numberOfLines={2}
        >
          {race.name}
        </Text>
      </View>
      {countdownLabel ? (
        <Text className="mt-0.5 text-xs">
          <Text
            className={
              lockStatus.isLocked
                ? 'text-muted'
                : lockStatus.urgency === 'closing_soon'
                  ? 'font-bold text-warning'
                  : 'font-bold text-accent-hover'
            }
          >
            {countdownLabel}
          </Text>
          {lockDisplay ? (
            <Text className="text-muted"> · {lockDisplay.local}</Text>
          ) : null}
        </Text>
      ) : null}
    </View>
  );
}

function CascadeBanner({ hasSprint }: { hasSprint: boolean }) {
  return (
    <View className="flex-row items-start gap-2 py-0.5">
      <Ionicons color={colors.accent} name="flash" size={14} />
      <Text className="text-muted flex-1 text-xs leading-[17px]">
        First save covers{' '}
        {hasSprint
          ? 'Sprint Quali, Sprint, Quali, and Race'
          : 'Qualifying and Race'}
        . You can fine-tune any session before it starts.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Session tabs (underline, no borders)
// ─────────────────────────────────────────────────────────────────────────

type SessionLockEntry = {
  session: SessionType;
  lockAt: number | undefined | null;
  isLocked: boolean;
  hasResult: boolean;
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
    <View className="flex-row gap-1 border-b border-border">
      {sessions.map((session) => {
        const lock = lockState.find((s) => s.session === session);
        const active = session === selected;
        const isLocked = lock?.isLocked ?? false;
        const hasResult = lock?.hasResult ?? false;
        const hasPicks = predictionsBySession[session] !== null;
        return (
          <Pressable
            className="flex-1 items-center gap-1.5"
            key={session}
            onPress={() => onSelect(session)}
          >
            <View className="flex-row items-center gap-1.5 py-1">
              <Text
                className={`text-[13px] font-bold ${
                  active ? 'text-foreground' : 'text-muted'
                }`}
              >
                {SESSION_LABELS_SHORT[session]}
              </Text>
              {hasResult ? (
                <Ionicons color={colors.success} name="flag" size={10} />
              ) : isLocked ? (
                <Ionicons
                  color={colors.textMuted}
                  name="lock-closed"
                  size={10}
                />
              ) : (
                <View
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: hasPicks ? colors.success : colors.warning,
                  }}
                />
              )}
            </View>
            <View
              className={`h-0.5 w-[60%] ${
                active ? 'bg-accent' : 'bg-transparent'
              }`}
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
    <View className="flex-row items-center justify-between pb-0.5">
      <Text className="text-muted text-[10px] font-extrabold uppercase">
        {title}
      </Text>
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
    <Pressable
      className="flex-row items-center gap-1 active:opacity-70"
      hitSlop={8}
      onPress={onToggle}
    >
      <Ionicons
        color={colors.accent}
        name={editing ? 'close' : 'pencil'}
        size={12}
      />
      <Text className="text-xs font-bold text-accent">
        {editing ? 'Cancel' : 'Edit'}
      </Text>
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
    <View className="gap-2">
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

  // First-time picks save themselves shortly after the 5th driver lands —
  // users kept filling the list and forgetting the Save button. The delay
  // leaves room to reorder (any change re-arms it); edits stay manual.
  const { markInteraction } = useAutoSaveOnFirstComplete({
    enabled: existingPicks.length === 0 && !sessionIsLocked && !isSubmitting,
    complete: picks.length === MAX_TOP5,
    picksSignature: picks.join(','),
    delayMs: TOP5_AUTO_SAVE_DELAY_MS,
    save: () => void handleSave(),
  });

  function updatePicks(next: string[]) {
    markInteraction();
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
    <View className="mt-1 gap-3.5">
      {restoredDraftAt ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-muted flex-1 text-xs">
            Draft from {formatDateTime(restoredDraftAt)}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => {
              void handleDiscardDraft();
            }}
          >
            <Text className="text-xs font-bold text-accent">Discard</Text>
          </Pressable>
        </View>
      ) : null}

      {lockSoon ? (
        <Text className="text-xs text-warning">
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
        className={`items-center rounded-lg bg-button-accent py-3.5 ${
          !canSave ? 'opacity-40' : ''
        }`}
        disabled={!canSave || isSubmitting}
        onPress={() => {
          void handleSave();
        }}
      >
        <Text className="text-foreground text-sm font-bold">
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
      <Text className="text-muted py-2 text-xs">
        No picks saved for this session yet.
      </Text>
    );
  }

  return (
    <View>
      {picks.map((id, index) => {
        const driver = driverById.get(id);
        return (
          <View key={`${id}-${index}`}>
            {index > 0 ? <View className="ml-[7px] h-px bg-border" /> : null}
            <View className="flex-row items-center gap-2.5 py-2.5">
              <View
                className="w-[3px] self-stretch rounded-sm"
                style={{ backgroundColor: getTeamColor(driver?.team) }}
              />
              <Numeral style={{ minWidth: 30 }} variant="large">
                {`P${index + 1}`}
              </Numeral>
              <View className="flex-1 gap-0.5">
                <Text className="text-foreground text-[13px] font-extrabold">
                  {driver?.code ?? '???'}
                </Text>
                <Text className="text-muted text-[11px]" numberOfLines={1}>
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
    <View className="gap-2">
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

  // First-time picks save themselves as the last matchup is tapped — users
  // kept completing the grid and forgetting the Save button. Edits stay manual.
  const { markInteraction } = useAutoSaveOnFirstComplete({
    enabled:
      Object.keys(existingPicks).length === 0 &&
      matchups.length > 0 &&
      !sessionIsLocked &&
      !isSubmitting,
    complete: isComplete,
    picksSignature: JSON.stringify(selections),
    delayMs: H2H_AUTO_SAVE_DELAY_MS,
    save: () => void handleSave(),
  });

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
    <View className="mt-1 gap-3.5">
      {restoredDraftAt ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-muted flex-1 text-xs">
            H2H draft from {formatDateTime(restoredDraftAt)}
          </Text>
          <Pressable
            hitSlop={6}
            onPress={() => {
              void handleDiscardDraft();
            }}
          >
            <Text className="text-xs font-bold text-accent">Discard</Text>
          </Pressable>
        </View>
      ) : null}

      <H2HMatchupGrid
        matchups={matchups as Array<Matchup>}
        mode={sessionIsLocked ? 'readonly' : 'interactive'}
        onSelect={(matchupId, driverId) => {
          markInteraction();
          setIsDirty(true);
          setSelections((prev) => ({ ...prev, [matchupId]: driverId }));
        }}
        selections={selections}
      />

      <Pressable
        className={`items-center rounded-lg bg-button-accent py-3.5 ${
          !canSave ? 'opacity-40' : ''
        }`}
        disabled={!canSave || isSubmitting}
        onPress={() => {
          void handleSave();
        }}
      >
        <Text className="text-foreground text-sm font-bold">
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
      <Text className="text-muted py-2 text-xs">
        No H2H picks saved for this session.
      </Text>
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
            {index > 0 ? <View className="ml-[7px] h-px bg-border" /> : null}
            <View className="flex-row items-center gap-2.5 py-2.5">
              <View
                className="w-[3px] self-stretch rounded-sm"
                style={{ backgroundColor: teamColor }}
              />
              <Text className="text-foreground flex-1 text-xs font-semibold">
                {matchup.team}
              </Text>
              <View className="flex-row items-center gap-1.5">
                {winner ? (
                  <>
                    <Text className="text-foreground text-[13px] font-extrabold">
                      {winner.code}
                    </Text>
                    <Text className="text-muted text-[10px] uppercase">
                      over
                    </Text>
                    <Text className="text-muted text-xs font-bold">
                      {loser?.code ?? '—'}
                    </Text>
                  </>
                ) : (
                  <Text className="text-[11px] font-semibold text-warning">
                    Not picked
                  </Text>
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
    <View className="flex-1 bg-page py-12">
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
    <View className="flex-1 bg-page py-12">
      <EmptyState
        body="Predictions need a live connection to the league. Please reconnect to make picks."
        icon="cloud-offline-outline"
        title="Predictions unavailable"
      />
    </View>
  );
}
