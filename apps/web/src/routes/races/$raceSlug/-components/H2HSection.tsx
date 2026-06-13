import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { Pencil, Swords } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { H2HMatchupGrid } from '@/components/H2HMatchupGrid';
import { H2HPredictionForm } from '@/components/H2HPredictionForm';
import { InlineLoader } from '@/components/InlineLoader';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { RandomizeButton } from '@/components/RandomizeButton';
import { ShareOnXButton } from '@/components/ShareOnXButton';
import { StartPicksCta } from '@/components/StartPicksCta';
import { StepBadge } from '@/components/StepBadge';
import { Tooltip } from '@/components/Tooltip';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import { getRaceSessionLockAt } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { buildH2HPicksShareText } from '@/lib/share';
import { siteConfig } from '@/lib/site';
import { useNow } from '@/lib/testing/now';

interface H2HSectionProps {
  race: Doc<'races'>;
  selectedSession: SessionType;
  /** When provided, section is controlled by parent (e.g. to hide other section while editing). */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
  /** When true, show Randomize button in this section (Top 5 done, H2H still needed). */
  showRandomizeButton?: boolean;
  hasPredictions?: boolean;
  hasH2HPredictions?: boolean;
  onEditingDirtyChange?: (dirty: boolean) => void;
  hasUnsavedEditingChanges?: boolean;
  /** Controlled open state for the first-time (cascade) picks overlay, so the
      parent can auto-open it (e.g. chained right after a Top 5 save). */
  initialPicksOpen?: boolean;
  onInitialPicksOpenChange?: (open: boolean) => void;
}

export function H2HSection({
  race,
  selectedSession,
  editingSession: controlledEditing,
  onEditingSessionChange,
  showRandomizeButton,
  hasPredictions,
  hasH2HPredictions,
  onEditingDirtyChange,
  hasUnsavedEditingChanges = false,
  initialPicksOpen: controlledInitialPicksOpen,
  onInitialPicksOpenChange,
}: H2HSectionProps) {
  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );
  const editingSession =
    onEditingSessionChange !== undefined
      ? (controlledEditing ?? null)
      : internalEditing;
  const setEditingSession = onEditingSessionChange ?? setInternalEditing;
  // First-time H2H picks (cascade to all sessions) also happen in the focus
  // overlay; this tracks whether it's open (from the start CTA, or auto-opened
  // by the parent right after the Top 5 save).
  const [internalInitialPicksOpen, setInternalInitialPicksOpen] =
    useState(false);
  const initialPicksOpen =
    onInitialPicksOpenChange !== undefined
      ? (controlledInitialPicksOpen ?? false)
      : internalInitialPicksOpen;
  const setInitialPicksOpen =
    onInitialPicksOpenChange ?? setInternalInitialPicksOpen;
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});
  const now = useNow();
  const selectedSessionLockTime = getRaceSessionLockAt(race, selectedSession);
  const selectedSessionLocked = now >= selectedSessionLockTime;
  const isLoadingPredictions =
    h2hPredictions === undefined || matchups === undefined;
  const canEditSelectedSession = Boolean(
    !isLoadingPredictions && hasH2HPredictions && !selectedSessionLocked,
  );
  const selectedSessionHasH2H =
    !isLoadingPredictions && h2hPredictions?.[selectedSession] != null;

  // H2H picks sharing (this section only renders before the session has
  // published results, so these are always pre-result picks).
  const me = useQuery(api.users.me, {});
  const selectedSessionH2HPicks = h2hPredictions?.[selectedSession] ?? null;
  const myH2HPickCodes = (matchups ?? [])
    .map((matchup) => {
      const pickId = selectedSessionH2HPicks?.[matchup._id];
      if (pickId === matchup.driver1._id) {
        return matchup.driver1.code;
      }
      if (pickId === matchup.driver2._id) {
        return matchup.driver2.code;
      }
      return null;
    })
    .filter((code): code is string => code != null);
  const canShareH2HPicks = selectedSessionHasH2H && myH2HPickCodes.length > 0;
  const h2hPicksShareText = canShareH2HPicks
    ? buildH2HPicksShareText({
        raceName: race.name,
        sessionLabel: SESSION_LABELS[selectedSession],
        winnerCodes: myH2HPickCodes,
        accountHandle: siteConfig.social.x.handle,
        raceHashtag: race.hashtag,
      })
    : '';
  const h2hPicksShareUrl = canShareH2HPicks
    ? `${siteConfig.url}/races/${race.slug}?${new URLSearchParams({
        ...encodeShareCardSearch({
          variant: 'h2h_picks',
          session: selectedSession,
          winners: myH2HPickCodes,
          by: me?.displayName || me?.username || undefined,
        }),
        utm_source: 'x',
        utm_medium: 'social',
        utm_campaign: 'share_h2h_picks',
      }).toString()}`
    : '';

  const overlayOpen = initialPicksOpen || editingSession !== null;
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  function closeOverlay() {
    setShowCloseConfirm(false);
    setInitialPicksOpen(false);
    setEditingSession(null);
    onEditingDirtyChange?.(false);
  }

  function requestCloseOverlay() {
    if (hasUnsavedEditingChanges) {
      setShowCloseConfirm(true);
      return;
    }
    closeOverlay();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <StepBadge step={2} done={Boolean(selectedSessionHasH2H)} />
          <h2 className="text-xl font-semibold text-text">
            <span className="sm:hidden">H2H Predictions</span>
            <span className="hidden sm:inline">Head-to-Head Predictions</span>
          </h2>
          {hasH2HPredictions && (
            <>
              {canEditSelectedSession ? (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={Pencil}
                  onClick={() => setEditingSession(selectedSession)}
                  title={`Edit ${SESSION_LABELS[selectedSession]} H2H Predictions`}
                  data-testid="h2h-edit-button"
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              ) : (
                <Tooltip content="This session has started — predictions can't be changed">
                  <span className="inline-flex" data-testid="h2h-locked-badge">
                    <Badge variant="locked" />
                  </span>
                </Tooltip>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showRandomizeButton &&
            hasPredictions !== undefined &&
            hasH2HPredictions !== undefined && (
              <RandomizeButton
                raceId={race._id}
                hasPredictions={hasPredictions}
                hasH2HPredictions={hasH2HPredictions}
              />
            )}
        </div>
      </div>

      <ErrorBoundary>
        {isLoadingPredictions ? (
          <InlineLoader />
        ) : hasH2HPredictions ? (
          <>
            <H2HMatchupGrid
              matchups={matchups}
              selections={h2hPredictions?.[selectedSession] ?? {}}
              mode="readonly"
              readonlyClickTooltip="Click edit above to change"
            />
            {canShareH2HPicks && (
              <div className="mt-3">
                <ShareOnXButton
                  text={h2hPicksShareText}
                  url={h2hPicksShareUrl}
                  analyticsEvent="h2h_picks_shared_x"
                  analyticsProps={{
                    race_slug: race.slug,
                    session_type: selectedSession,
                  }}
                  label="Share my H2H picks on X"
                />
              </div>
            )}
          </>
        ) : (
          <StartPicksCta
            icon={Swords}
            description="Pick each teammate matchup once. We'll apply it across the weekend, and you can edit sessions before they start."
            actionLabel="Pick H2H Winners"
            onStart={() => setInitialPicksOpen(true)}
            data-testid="h2h-start-button"
          />
        )}
      </ErrorBoundary>

      {matchups !== undefined && (
        <PicksFocusOverlay
          open={overlayOpen}
          onClose={requestCloseOverlay}
          suspended={showCloseConfirm}
          title={
            editingSession
              ? `${SESSION_LABELS[editingSession]} — Head-to-Head`
              : 'Head-to-Head Predictions'
          }
          subtitle={
            editingSession
              ? 'Applies to this session only'
              : 'Applies to every session this weekend'
          }
        >
          <H2HPredictionForm
            raceId={race._id}
            matchups={matchups}
            sessionType={editingSession ?? undefined}
            existingPicks={
              editingSession
                ? (h2hPredictions?.[editingSession] ?? undefined)
                : undefined
            }
            onSuccess={closeOverlay}
            onDirtyChange={onEditingDirtyChange}
          />
        </PicksFocusOverlay>
      )}
      <ConfirmDialog
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={closeOverlay}
        title="Close without saving?"
        description="You have unsaved H2H changes. We'll keep them as a draft on this device, but they won't count until you save them."
        confirmLabel="Close Without Saving"
      />
    </div>
  );
}
