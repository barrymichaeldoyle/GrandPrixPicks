import type { Doc, Id } from '@convex-generated/dataModel';
import type { ComponentProps } from 'react';
import { useState } from 'react';

import type { SessionType } from '@/lib/sessions';

import { H2HMatchupGrid } from './H2HMatchupGrid';
import { H2HPredictionForm } from './H2HPredictionForm';

type Race = Doc<'races'>;
type H2HPredictions = Partial<
  Record<SessionType, Record<string, Id<'drivers'>> | null>
>;
type Matchups = ComponentProps<typeof H2HMatchupGrid>['matchups'];

interface H2HWeekendSummaryProps {
  race: Race;
  h2hPredictions: H2HPredictions | null;
  matchups: Matchups;
  selectedSession: SessionType;
  /** Controlled editing: when set, parent can hide its own header. */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
  onEditingDirtyChange?: (dirty: boolean) => void;
}

export function H2HWeekendSummary({
  race,
  h2hPredictions,
  matchups,
  selectedSession,
  editingSession: controlledEditing,
  onEditingSessionChange,
  onEditingDirtyChange,
}: H2HWeekendSummaryProps) {
  const [internalEditing, setInternalEditing] = useState<SessionType | null>(
    null,
  );

  const isControlled = onEditingSessionChange !== undefined;
  const editingSession = isControlled
    ? (controlledEditing ?? null)
    : internalEditing;
  const setEditingSession = isControlled
    ? (s: SessionType | null) => onEditingSessionChange(s)
    : setInternalEditing;

  const hasH2HPredictions =
    h2hPredictions && Object.values(h2hPredictions).some((p) => p !== null);

  // If user has no H2H predictions yet, show the form
  if (!hasH2HPredictions) {
    return (
      <div>
        <p className="mb-4 text-sm text-text-muted">
          Pick each teammate matchup once. We&apos;ll apply it across the
          weekend, and you can edit sessions before they start.
        </p>
        <H2HPredictionForm raceId={race._id} matchups={matchups} />
      </div>
    );
  }

  // Editing a single session
  if (editingSession) {
    const existingPicks = h2hPredictions[editingSession] ?? undefined;
    return (
      <div>
        <H2HPredictionForm
          raceId={race._id}
          matchups={matchups}
          sessionType={editingSession}
          existingPicks={existingPicks}
          onSuccess={() => setEditingSession(null)}
          onDirtyChange={onEditingDirtyChange}
        />
      </div>
    );
  }

  const selectedSessionPicks = h2hPredictions[selectedSession] ?? {};

  return (
    <div className="space-y-4">
      <H2HMatchupGrid
        matchups={matchups}
        selections={selectedSessionPicks}
        mode="readonly"
        readonlyClickTooltip="Click edit above to change"
      />
    </div>
  );
}
