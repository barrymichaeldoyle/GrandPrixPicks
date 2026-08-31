import {
  raceWriteupPhaseLabel,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

export function RaceWriteupPhaseLabel({ phase }: { phase: RaceWriteupPhase }) {
  return (
    <span className="gpp-mono text-xs tracking-label text-text-muted uppercase">
      {raceWriteupPhaseLabel(phase)}
    </span>
  );
}
