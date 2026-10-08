import { Ionicons } from '../../components/ui/Ionicons';
import {
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  DraggableTop5,
  ROW_HEIGHT,
} from '../../components/predict/DraggableTop5';
import { Numeral } from '../../components/ui/Numeral';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
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
  MAX_TOP5,
  CASCADE_DRAFT_SESSION,
  type RaceDoc,
  type DriverDoc,
} from './picksShared';
import { userFacingMessage } from '../../lib/userFacingError';

/* The Top 5 section: editor, read-only view and the section that switches between them. */

export function Top5Section({
  race,
  drivers,
  selectedSession,
  selectedLockAt,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onDraggingChange,
  onSubmit,
}: {
  race: RaceDoc;
  drivers: Array<DriverDoc>;
  selectedSession: SessionType;
  selectedLockAt: number | undefined;
  cascadeMode: boolean;
  existingPicks: ReadonlyArray<string>;
  sessionIsLocked: boolean;
  onDraggingChange?: (dragging: boolean) => void;
  onSubmit: (
    picks: string[],
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
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
        title="Top 5"
        action={
          showEditToggle ? (
            <EditToggle
              label={cascadeMode ? 'Make picks' : 'Edit'}
              editing={editing}
              onToggle={() => setEditing((v) => !v)}
            />
          ) : null
        }
      />
      <Top5Readonly
        drivers={drivers}
        picks={existingPicks}
        sessionLocked={sessionIsLocked}
      />
      {editing ? (
        <PickEditorModal
          scrollEnabled={!dragging}
          title="Top 5"
          onClose={() => setEditing(false)}
        >
          <Top5Editor
            race={race}
            drivers={drivers}
            selectedSession={selectedSession}
            selectedLockAt={selectedLockAt}
            cascadeMode={cascadeMode}
            existingPicks={existingPicks}
            sessionIsLocked={sessionIsLocked}
            onCancel={() => setEditing(false)}
            onDraggingChange={(value) => {
              setDragging(value);
              onDraggingChange?.(value);
            }}
            onSubmit={onSubmit}
          />
        </PickEditorModal>
      ) : null}
    </View>
  );
}

export function Top5Editor({
  race,
  drivers,
  selectedSession,
  selectedLockAt,
  cascadeMode,
  existingPicks,
  sessionIsLocked,
  onCancel,
  onDraggingChange,
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
  onDraggingChange?: (dragging: boolean) => void;
  onSubmit: (
    picks: string[],
    sessionType: SessionType | undefined,
  ) => Promise<void>;
}) {
  const { showToast } = useToast();
  const isSignedIn = useIsSignedIn();
  const { formatDateTime } = useUserDateFormat();
  const draftSession = cascadeMode ? CASCADE_DRAFT_SESSION : selectedSession;
  const [picks, setPicks] = useState<string[]>([...existingPicks]);
  const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const hydratedRef = useRef<string | null>(null);

  useEffect(() => {
    captureAnalyticsEvent('top5_editor_opened', {
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
    void patchConnectedDraft(race.slug, draftSession, {
      top5: picks,
      awaitingAccount: !isSignedIn,
    });
  }, [draftSession, isDirty, isSignedIn, picks, race.slug]);

  // No auto-save here, unlike H2H: picking the 5th driver is where
  // reordering STARTS, not where the interaction ends, and a timer-based
  // save kept firing mid-shuffle and flipping the editor to read-only
  // under the user's finger. Top 5 always saves via the explicit CTA.
  function updatePicks(next: string[]) {
    setIsDirty(true);
    if (picks.length < MAX_TOP5 && next.length === MAX_TOP5) {
      captureAnalyticsEvent('top5_picks_completed', {
        scope: cascadeMode ? 'cascade' : 'session',
      });
    }
    setPicks(next);
  }

  async function handleSave() {
    if (picks.length !== MAX_TOP5 || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (!isSignedIn) {
        await patchConnectedDraft(race.slug, draftSession, {
          top5: picks,
          awaitingAccount: true,
        });
        await onSubmit(picks, cascadeMode ? undefined : selectedSession);
        onCancel();
        return;
      }
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
      onCancel();
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(
        userFacingMessage(error, 'Your picks weren’t saved. Try again.'),
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
  // A lock that lands while the editor is open freezes what was saved, not
  // the draft on screen. Showing the draft read-only reads as "these are
  // locked in" when they never reached the server.
  const lostUnsavedChanges = sessionIsLocked && isDirty;
  const shownPicks = sessionIsLocked ? [...existingPicks] : picks;
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

      {lostUnsavedChanges ? (
        <Text className="text-xs text-warning">
          The session locked before your changes were saved. These are your
          saved picks.
        </Text>
      ) : null}

      {lockSoon ? (
        <Text className="text-xs text-warning">
          Heads up: locks soon. Save before the session starts.
        </Text>
      ) : null}

      <DraggableTop5
        action={
          <PrimaryButton
            disabled={!canSave || isSubmitting}
            label={
              isSubmitting
                ? 'Saving…'
                : sessionIsLocked
                  ? 'Session locked'
                  : picks.length !== MAX_TOP5
                    ? `Pick ${MAX_TOP5 - picks.length} more`
                    : ctaLabel
            }
            onPress={() => {
              void handleSave();
            }}
          />
        }
        disabled={sessionIsLocked}
        drivers={drivers}
        onChange={updatePicks}
        onDraggingChange={onDraggingChange}
        picks={shownPicks}
      />
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
    <View className="overflow-hidden rounded-xl border border-border bg-surface">
      <View className="flex-row">
        <View className="border-r border-border bg-surface-muted">
          {[1, 2, 3, 4, 5].map((n) => (
            <View
              className="w-10 items-center justify-center border-b border-border last:border-b-0"
              key={n}
              style={{ height: ROW_HEIGHT }}
            >
              <Numeral tone="accent" variant="small">
                {`P${n}`}
              </Numeral>
            </View>
          ))}
        </View>
        <View className="min-w-0 flex-1">
          {picks.map((id, index) => {
            const driver = driverById.get(id);
            return (
              <View
                className="flex-row items-stretch border-b border-border last:border-b-0"
                style={{ height: ROW_HEIGHT }}
                key={`${id}-${index}`}
              >
                <View className="w-12 shrink-0 flex-row items-stretch border-r border-border">
                  <View
                    className="w-[3px] self-stretch"
                    style={{ backgroundColor: getTeamColor(driver?.team) }}
                  />
                  <View className="flex-1 items-center justify-center gap-0.5">
                    {driver?.number != null ? (
                      <Numeral variant="small">{driver.number}</Numeral>
                    ) : null}
                    <Numeral tone="muted" variant="small">
                      {driver?.code ?? '???'}
                    </Numeral>
                  </View>
                </View>
                <View className="min-w-0 flex-1 justify-center gap-0.5 px-2.5">
                  <Text
                    className="text-foreground text-[13px] font-medium"
                    numberOfLines={1}
                  >
                    {driver?.displayName ?? 'Unknown driver'}
                  </Text>
                  {driver?.team ? (
                    <Text className="text-muted text-xs" numberOfLines={1}>
                      {displayTeamName(driver.team)}
                    </Text>
                  ) : null}
                </View>
                {sessionLocked ? (
                  <View className="justify-center pr-3">
                    <Ionicons
                      color={colors.textMuted}
                      name="lock-closed-outline"
                      size={12}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          {Array.from({ length: Math.max(0, 5 - picks.length) }).map((_, i) => (
            <View
              className="justify-center border-b border-dashed border-border bg-surface px-3 last:border-b-0"
              key={`empty-${i}`}
              style={{ height: ROW_HEIGHT }}
            >
              <Text className="text-muted text-sm">Select a driver</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// H2H section
// ─────────────────────────────────────────────────────────────────────────
