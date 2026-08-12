function ToggleSwitch({
  checked,
  onChange,
  label,
  loading = false,
}: {
  checked: boolean;
  onChange: () => void;
  /** The row's visible label, which is all this control has to announce. */
  label: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div
        aria-hidden
        className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-surface-muted"
      />
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none ${
        checked ? 'bg-accent' : 'bg-surface-muted'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-text-on-accent transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export function NotificationRow({
  label,
  description,
  checked,
  onChange,
  loading = false,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {description && (
          <p className="text-xs text-text-muted">{description}</p>
        )}
      </div>
      <ToggleSwitch
        checked={checked}
        onChange={() => onChange(!checked)}
        label={label}
        loading={loading}
      />
    </div>
  );
}
