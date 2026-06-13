type UpdateMode = 'correction' | 'amendment';

export function UpdateModeSelector({
  updateMode,
  onUpdateModeChange,
  amendmentNote,
  onAmendmentNoteChange,
  amendedAt,
  previousAmendmentNote,
}: {
  updateMode: UpdateMode;
  onUpdateModeChange: (mode: UpdateMode) => void;
  amendmentNote: string;
  onAmendmentNoteChange: (note: string) => void;
  amendedAt?: number | null;
  previousAmendmentNote?: string | null;
}) {
  return (
    <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <p className="mb-3 text-sm font-semibold text-white">
        How should this update go out?
      </p>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-3 transition-colors has-checked:border-yellow-500/60 has-checked:bg-yellow-500/5">
          <input
            type="radio"
            name="update-mode"
            checked={updateMode === 'correction'}
            onChange={() => onUpdateModeChange('correction')}
            className="mt-0.5 accent-yellow-500"
          />
          <span>
            <span className="block text-sm font-medium text-white">
              Silent correction
            </span>
            <span className="block text-sm text-slate-400">
              I entered the results wrong. Recalculate scores quietly — players
              are not notified.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-700 p-3 transition-colors has-checked:border-yellow-500/60 has-checked:bg-yellow-500/5">
          <input
            type="radio"
            name="update-mode"
            checked={updateMode === 'amendment'}
            onChange={() => onUpdateModeChange('amendment')}
            className="mt-0.5 accent-yellow-500"
          />
          <span>
            <span className="block text-sm font-medium text-white">
              Official amendment
            </span>
            <span className="block text-sm text-slate-400">
              The real-world result changed (penalty, stewards&apos; decision).
              Players who predicted this session are rescored and notified, and
              your note is shown on the race page.
            </span>
          </span>
        </label>
      </div>
      {updateMode === 'amendment' && (
        <div className="mt-3">
          <textarea
            value={amendmentNote}
            onChange={(e) => onAmendmentNoteChange(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder={`e.g. "Stewards' decision: Gasly retains P3 after post-race review"`}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-yellow-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown to players word-for-word — say what changed and why.
          </p>
        </div>
      )}
      {amendedAt != null && previousAmendmentNote && (
        <p className="mt-3 text-xs text-slate-500">
          Previously amended {new Date(amendedAt).toLocaleString()}: &ldquo;
          {previousAmendmentNote}&rdquo;
        </p>
      )}
    </div>
  );
}
