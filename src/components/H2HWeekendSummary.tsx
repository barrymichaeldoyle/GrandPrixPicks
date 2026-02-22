import { useQuery } from 'convex/react';
import { useState } from 'react';

import type { SessionType } from '@/lib/sessions';

import { api } from '../../convex/_generated/api';
import type { Doc } from '../../convex/_generated/dataModel';
import { H2HMatchupGrid } from './H2HMatchupGrid';
import { H2HPredictionForm } from './H2HPredictionForm';

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

  // If user has no H2H predictions yet, show the form
  if (!hasH2HPredictions) {
    return (
      <div>
        <p className="mb-4 text-text-muted">
          Pick which teammate finishes ahead in each pairing. This prediction
          will apply to{' '}
          {race.hasSprint
            ? 'Qualifying, Sprint Qualifying, Sprint, and Race'
            : 'Qualifying and Race'}
          . You can fine-tune individual sessions after submitting.
        </p>
        <H2HPredictionForm raceId={race._id} sessionType={selectedSession} />
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
        className="sm:gap-3"
      />
    </div>
  );
}
