import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { useState } from 'react';

import type { SessionType } from '@/lib/sessions';

import { H2HMatchupGrid } from './H2HMatchupGrid';
import { H2HPredictionForm } from './H2HPredictionForm';
import { InlineLoader } from './InlineLoader';

type Race = Doc<'races'>;

interface H2HWeekendSummaryProps {
  race: Race;
  selectedSession: SessionType;
  /** Controlled editing: when set, parent can hide its own header. */
  editingSession?: SessionType | null;
  onEditingSessionChange?: (session: SessionType | null) => void;
  onEditingDirtyChange?: (dirty: boolean) => void;
}

export function H2HWeekendSummary({
  race,
  selectedSession,
  editingSession: controlledEditing,
  onEditingSessionChange,
  onEditingDirtyChange,
}: H2HWeekendSummaryProps) {
  const h2hPredictions = useQuery(api.h2h.myH2HPredictionsForRace, {
    raceId: race._id,
  });
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});

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

  if (h2hPredictions === undefined) {
    return <InlineLoader />;
  }

  // If user has no H2H predictions yet, show the form
  if (!hasH2HPredictions) {
    return (
      <div>
        <p className="mb-4 text-sm text-text-muted">
          Pick each teammate matchup once. We&apos;ll apply it across the
          weekend, and you can edit sessions before they start.
        </p>
        <H2HPredictionForm raceId={race._id} />
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
        matchups={matchups ?? []}
        selections={selectedSessionPicks}
        mode="readonly"
      />
    </div>
  );
}
