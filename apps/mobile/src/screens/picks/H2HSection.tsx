import { Ionicons } from '@expo/vector-icons';
import {
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import { inferH2HPicks } from '@grandprixpicks/shared/h2hInference';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { H2HDuelPicker } from '../../components/predict/H2HDuelPicker';
import {
  DUEL_CONFIRM_HOLD_MS,
  H2HDuelQuestion,
  type H2HDuelMatchup,
} from '../../components/predict/H2HDuelQuestion';
import { H2HMatchupGrid } from '../../components/predict/H2HMatchupGrid';
import { Numeral } from '../../components/ui/Numeral';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import { useAutoSaveOnFirstComplete } from '../../hooks/useAutoSaveOnFirstComplete';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useUserDateFormat } from '../../lib/dates';
import { loadConnectedDraft, patchConnectedDraft } from '../../lib/picksDrafts';
import { displayTeamName, getTeamColor } from '../../lib/teamColors';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import { useToast } from '../../providers/ToastProvider';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { SectionHeader, EditToggle } from './PicksChrome';
import { PickEditorModal } from './PicksStates';
import {
  CASCADE_DRAFT_SESSION,
  H2H_AUTO_SAVE_DELAY_MS,
  type RaceDoc,
} from './picksShared';

/* The team-mate duels section: editor, read-only view and the section that switches between them. */

export type Matchup = H2HDuelMatchup;

/** Top 5 slot (1-5) per driver, so a duel can show what you already called. */
export function toTopFivePositions(
  picks: ReadonlyArray<string>,
): Record<string, number> {
  return Object.fromEntries(picks.map((id, index) => [id, index + 1]));
}

/** The editor's title: the team for a single battle, as web's takeover does. */
export function h2hEditorTitle(
  matchups: ReadonlyArray<Matchup>,
  visibleMatchupId: string | undefined,
  session: SessionType,
): { title: string; subtitle?: string } {
  const matchup = visibleMatchupId
    ? matchups.find((m) => m._id === visibleMatchupId)
    : undefined;
  return matchup
    ? {
        title: displayTeamName(matchup.team),
        subtitle: `${SESSION_LABELS[session]} only`,
      }
    : { title: 'Team-mate picks' };
}

export function H2HSection({
  race,
  matchups,
  selectedSession,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  topFivePositions,
  onSubmit,
}: {
  race: RaceDoc;
  matchups: ReadonlyArray<Matchup>;
  selectedSession: SessionType;
  cascadeMode: boolean;
  existingPicks: Record<string, string>;
  sessionIsLocked: boolean;
  topFivePositions: Record<string, number>;
  onSubmit: (
    picks: Record<string, string>,
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const [editingMatchup, setEditingMatchup] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // Session/cascade identity defines a fresh local editing state.
    // oxlint-disable-next-line react/set-state-in-effect
    setEditing(false);
  }, [cascadeMode, selectedSession]);

  const showEditToggle = !sessionIsLocked;

  return (
    <View className="gap-2">
      <SectionHeader
        title="Head to Head"
        action={
          showEditToggle ? (
            <EditToggle
              label={cascadeMode ? 'Make picks' : 'Edit'}
              editing={editing}
              onToggle={() => {
                setEditingMatchup(undefined);
                setEditing((v) => !v);
              }}
            />
          ) : null
        }
      />
      <H2HReadonly
        matchups={matchups}
        selections={existingPicks}
        onEdit={
          !cascadeMode && !sessionIsLocked
            ? (id) => {
                setEditingMatchup(id);
                setEditing(true);
              }
            : undefined
        }
      />
      {editing ? (
        <PickEditorModal
          fillBody={editingMatchup !== undefined}
          {...h2hEditorTitle(matchups, editingMatchup, selectedSession)}
          onClose={() => setEditing(false)}
        >
          <H2HEditor
            topFivePositions={topFivePositions}
            visibleMatchupId={editingMatchup}
            cascadeMode={cascadeMode}
            existingPicks={existingPicks}
            matchups={matchups}
            onCancel={() => setEditing(false)}
            onSubmit={onSubmit}
            race={race}
            selectedSession={selectedSession}
            sessionIsLocked={sessionIsLocked}
          />
        </PickEditorModal>
      ) : null}
    </View>
  );
}

export function H2HEditor({
  visibleMatchupId,
  topFivePositions,
  race,
  matchups,
  selectedSession,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onCancel,
  onSubmit,
}: {
  visibleMatchupId?: string;
  topFivePositions?: Record<string, number>;
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
  const isSignedIn = useIsSignedIn();
  const draftSession = cascadeMode ? CASCADE_DRAFT_SESSION : selectedSession;
  /**
   * Saved picks plus anything tapped. Duels the Top 5 answers are layered
   * underneath (`selections` below) rather than stored, so they keep following
   * the Top 5 until tapped and a draft only holds what the player chose.
   */
  const [explicitPicks, setSelections] = useState<Record<string, string>>({
    ...existingPicks,
  });
  const inferredPicks = inferH2HPicks(
    matchups.map((matchup) => ({
      matchupId: matchup._id,
      driver1Id: matchup.driver1._id,
      driver2Id: matchup.driver2._id,
    })),
    Object.entries(topFivePositions ?? {})
      .sort((a, b) => a[1] - b[1])
      .map(([driverId]) => driverId),
  ) as Record<string, string>;
  const selections: Record<string, string> = {
    ...inferredPicks,
    ...explicitPicks,
  };
  const inferredMatchupIds = new Set(
    Object.keys(inferredPicks).filter((id) => !(id in explicitPicks)),
  );
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  /** Single-battle edit: the pick is the save, then the takeover closes. */
  const [duelStatus, setDuelStatus] = useState<'idle' | 'saving' | 'saved'>(
    'idle',
  );
  const [saveFailed, setSaveFailed] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef<string | null>(null);
  const visibleMatchup = visibleMatchupId
    ? matchups.find((m) => m._id === visibleMatchupId)
    : undefined;
  // First entry steps through the battles one at a time; a saved card is
  // edited on the full grid, where scanning beats stepping. Same split as web.
  const useDuelSequence = Object.keys(existingPicks).length === 0;

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    captureAnalyticsEvent('h2h_editor_opened', {
      scope: cascadeMode ? 'cascade' : 'session',
    });
    // Once per editor mount, not per prop change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setDraftHydrated(true);
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
      h2hByMatchup: explicitPicks,
      awaitingAccount: !isSignedIn,
    });
  }, [draftSession, isDirty, isSignedIn, race.slug, explicitPicks]);

  const isComplete =
    matchups.length > 0 &&
    matchups.every((matchup) => selections[matchup._id] !== undefined);
  const canSave = isComplete && !sessionIsLocked;

  // First-time picks save themselves as the last matchup is tapped — users
  // kept completing the grid and forgetting the Save button. Edits stay manual.
  // Never auto-save a signed-out grid: the save path for a guest is the
  // sign-in sheet, and throwing that over the screen 1.2s after the last tap
  // is an interruption they did not ask for. They get the explicit button.
  const { markInteraction } = useAutoSaveOnFirstComplete({
    enabled:
      isSignedIn &&
      Object.keys(existingPicks).length === 0 &&
      matchups.length > 0 &&
      !sessionIsLocked &&
      !isSubmitting,
    complete: isComplete,
    picksSignature: JSON.stringify(selections),
    delayMs: H2H_AUTO_SAVE_DELAY_MS,
    save: () => void handleSave(),
  });

  async function handleSave(
    picks: Record<string, string> = selections,
    options?: { singleDuel?: boolean },
  ) {
    const picksComplete = matchups.every(
      (matchup) => picks[matchup._id] !== undefined,
    );
    if (!picksComplete || sessionIsLocked || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (!isSignedIn) {
        await patchConnectedDraft(race.slug, draftSession, {
          h2hByMatchup: picks,
          awaitingAccount: true,
        });
        await onSubmit(picks, cascadeMode ? undefined : selectedSession);
        onCancel();
        return;
      }
      if (options?.singleDuel) {
        setDuelStatus('saving');
      }
      await onSubmit(picks, cascadeMode ? undefined : selectedSession);
      // Only clear the H2H portion of the draft — preserve any in-progress Top 5.
      await patchConnectedDraft(race.slug, draftSession, { h2hByMatchup: {} });
      setIsDirty(false);
      setRestoredDraftAt(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (options?.singleDuel) {
        // Hold on "Saved" long enough to watch the pick land, as web does.
        setDuelStatus('saved');
        closeTimerRef.current = setTimeout(onCancel, DUEL_CONFIRM_HOLD_MS);
        return;
      }
      showToast(
        cascadeMode
          ? '🏁 H2H locked in for the weekend'
          : `Saved ${SESSION_LABELS[selectedSession]} H2H`,
        'success',
      );
      onCancel();
    } catch (error) {
      setDuelStatus('idle');
      setSaveFailed(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        error instanceof Error ? error.message : 'Save failed',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectMatchup(matchupId: string, driverId: string) {
    markInteraction();
    setIsDirty(true);
    if (
      inferredMatchupIds.has(matchupId) &&
      selections[matchupId] !== driverId
    ) {
      captureAnalyticsEvent('h2h_inferred_pick_changed', {
        scope: cascadeMode ? 'cascade' : 'session',
      });
    }
    const next = { ...selections, [matchupId]: driverId };
    if (
      !isComplete &&
      matchups.every((matchup) => next[matchup._id] !== undefined)
    ) {
      captureAnalyticsEvent('h2h_picks_completed', {
        scope: cascadeMode ? 'cascade' : 'session',
        inferred_count: inferredMatchupIds.size,
      });
    }
    setSelections((prev) => ({ ...prev, [matchupId]: driverId }));
  }

  async function handleDiscardDraft() {
    await patchConnectedDraft(race.slug, draftSession, { h2hByMatchup: {} });
    setSelections({ ...existingPicks });
    setIsDirty(false);
    setRestoredDraftAt(null);
  }

  return (
    <View className={`mt-1 gap-3.5 ${visibleMatchup ? 'flex-1' : ''}`}>
      {restoredDraftAt ? (
        <View className="flex-row items-center justify-between gap-3">
          <Text className="text-muted flex-1 text-xs">
            H2H draft from {formatDateTime(restoredDraftAt)}
          </Text>
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => {
              void handleDiscardDraft();
            }}
          >
            <Text className="text-xs font-bold text-accent">Discard</Text>
          </Pressable>
        </View>
      ) : null}

      {visibleMatchup ? (
        <View className="flex-1 pb-4">
          <H2HDuelQuestion
            disabled={sessionIsLocked || duelStatus !== 'idle'}
            matchup={visibleMatchup}
            onPick={(driverId) => {
              void Haptics.selectionAsync();
              const next = { ...selections, [visibleMatchup._id]: driverId };
              setIsDirty(true);
              setSelections((prev) => ({
                ...prev,
                [visibleMatchup._id]: driverId,
              }));
              void handleSave(next, { singleDuel: true });
            }}
            selectedDriverId={selections[visibleMatchup._id]}
            status={
              duelStatus === 'saved' ? (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons color={colors.accent} name="checkmark" size={14} />
                  <Text className="text-sm text-accent">Saved</Text>
                </View>
              ) : duelStatus === 'saving' ? (
                'Saving…'
              ) : sessionIsLocked ? (
                'Session locked'
              ) : (
                'Tap a driver to save this battle.'
              )
            }
            topFivePositions={topFivePositions}
            variant="takeover"
          />
        </View>
      ) : useDuelSequence ? (
        <H2HDuelPicker
          disabled={sessionIsLocked}
          draftHydrated={draftHydrated}
          matchups={matchups}
          onSelect={selectMatchup}
          inferredMatchupIds={inferredMatchupIds}
          selections={selections}
          topFivePositions={topFivePositions}
        />
      ) : (
        <H2HMatchupGrid
          matchups={matchups}
          mode={sessionIsLocked ? 'readonly' : 'interactive'}
          onSelect={selectMatchup}
          selections={selections}
        />
      )}

      {/* The sequence shows no Save button until every battle is called: a
          disabled "Pick 11 more" under the first duel only restated the
          counter. A signed-in first entry saves itself on the last pick, so
          this is the signed-out save and the fallback if that write fails. */}
      {visibleMatchup ||
      (useDuelSequence &&
        (!isComplete || (isSignedIn && !saveFailed))) ? null : (
        <PrimaryButton
          disabled={!canSave || isSubmitting}
          label={
            isSubmitting
              ? 'Saving…'
              : sessionIsLocked
                ? 'Session locked'
                : !isComplete
                  ? `Pick ${
                      matchups.filter(
                        (matchup) => selections[matchup._id] === undefined,
                      ).length
                    } more`
                  : cascadeMode
                    ? 'Save weekend H2H'
                    : `Save ${SESSION_LABELS_SHORT[selectedSession]} H2H`
          }
          onPress={() => {
            void handleSave();
          }}
        />
      )}
    </View>
  );
}

export function H2HReadonly({
  matchups,
  selections,
  onEdit,
}: {
  matchups: ReadonlyArray<Matchup>;
  selections: Record<string, string>;
  onEdit?: (id: string) => void;
}) {
  if (matchups.length === 0) {
    return null;
  }
  if (Object.keys(selections).length === 0) {
    return (
      <Text className="text-muted py-2 text-xs">
        No H2H picks saved for this session.
      </Text>
    );
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {matchups.map((matchup) => {
        const winner = [matchup.driver1, matchup.driver2].find(
          (driver) => driver._id === selections[matchup._id],
        );
        return (
          <Pressable
            key={matchup._id}
            accessibilityRole={onEdit ? 'button' : undefined}
            accessibilityLabel={`${displayTeamName(matchup.team)}: ${winner?.code ?? 'No pick'}${onEdit ? ', edit pick' : ''}`}
            disabled={!onEdit}
            onPress={() => onEdit?.(matchup._id)}
            className="min-h-12 flex-row items-center justify-between gap-2 bg-surface px-3 py-2"
            style={{
              flexBasis: '47%',
              flexGrow: 1,
              borderBottomWidth: 2,
              borderBottomColor: getTeamColor(matchup.team),
            }}
          >
            <Text className="text-muted flex-1 text-xs" numberOfLines={1}>
              {displayTeamName(matchup.team)}
            </Text>
            <Numeral variant="small">{winner?.code ?? '—'}</Numeral>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Empty / fallback states
// ─────────────────────────────────────────────────────────────────────────
