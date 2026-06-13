import type { Doc } from '@convex-generated/dataModel';
import { Ban, Loader2, RotateCcw } from 'lucide-react';

export function RaceStatusHeader({
  race,
  isCancelling,
  onCancel,
  onRestore,
}: {
  race: Doc<'races'>;
  isCancelling: boolean;
  onCancel: () => void;
  onRestore: () => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-medium text-slate-500">
            Round {race.round} - {race.season}
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white">{race.name}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm ${
              race.status === 'upcoming'
                ? 'bg-emerald-500/20 text-emerald-400'
                : race.status === 'locked'
                  ? 'bg-amber-500/20 text-amber-400'
                  : race.status === 'cancelled'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {race.status === 'cancelled' ? 'Called Off' : race.status}
          </span>
          {race.status !== 'finished' &&
            race.status !== 'locked' &&
            (race.status === 'cancelled' ? (
              <button
                onClick={onRestore}
                disabled={isCancelling}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                Restore
              </button>
            ) : (
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCancelling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Ban size={14} />
                )}
                Mark Called Off
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
