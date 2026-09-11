import {
  raceWriteupPhaseLabel,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

export function RaceWriteupPhaseLabel({ phase }: { phase: RaceWriteupPhase }) {
  return (
    <span className="text-xs font-medium text-text-muted">
      {raceWriteupPhaseLabel(phase)}
    </span>
  );
}
