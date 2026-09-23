import {
  raceWriteupPhaseLabel,
  type RaceWriteupPhase,
} from '@/lib/raceWriteupPhase';

/**
 * The last item of the hero eyebrow, so it is set exactly like the dates,
 * venue and round before it. It used to be a smaller sans label, which read as
 * a different kind of thing tacked onto the line.
 */
export function RaceWriteupPhaseLabel({ phase }: { phase: RaceWriteupPhase }) {
  return (
    <span className="gpp-mono text-sm text-text-muted">
      {raceWriteupPhaseLabel(phase)}
    </span>
  );
}
