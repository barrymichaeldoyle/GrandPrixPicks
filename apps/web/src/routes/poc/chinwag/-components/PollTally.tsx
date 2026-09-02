type TallyOption = {
  count: number;
  label: string;
  share: number;
  value: string;
};

type PollTallyProps = {
  /**
   * What this same crowd said before the race, when there is one. The pairing
   * is the segment: "you had Alonso down as the banger, afterwards you said
   * Antonelli."
   */
  before?: TallyOption | null;
  /** Larger type and bars, for the board that goes on screen during the show. */
  broadcast?: boolean;
  label: string;
  options: TallyOption[];
  /** Highlighted as the reader's own answer. */
  selected?: string;
};

/**
 * One question's results, ordered by share.
 *
 * The bar is a coral fill behind the row rather than a separate track beside
 * it: at streaming distance a thin rule under a label is invisible, and a
 * filled row is readable across a room. Coral is his, and it is doing the same
 * job here that it does on his banners.
 */
export function PollTally({
  before = null,
  broadcast = false,
  label,
  options,
  selected,
}: PollTallyProps) {
  const flipped =
    before != null && options[0] && options[0].value !== before.value;

  return (
    <section>
      <h2
        className={
          broadcast
            ? 'mb-3 text-sm tracking-[0.12em] text-[var(--chinwag-ink)] uppercase sm:text-base'
            : 'mb-2 text-xs tracking-[0.12em] text-[var(--chinwag-ink-muted)] uppercase'
        }
      >
        {label}
      </h2>
      {before ? (
        <p
          className={
            broadcast
              ? 'mb-2 text-sm text-[var(--chinwag-ink-muted)] sm:text-base'
              : 'mb-2 text-xs text-[var(--chinwag-ink-muted)]'
          }
        >
          Before the race: {before.label} ({Math.round(before.share * 100)}%)
          {flipped ? ' \u2192 changed your mind' : ' \u2192 stuck with it'}
        </p>
      ) : null}
      {options.length === 0 ? (
        <p className="text-sm text-[var(--chinwag-ink-muted)]">No votes yet.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {options.map((option) => (
            <li
              key={option.value}
              className={
                option.value === selected
                  ? 'relative overflow-hidden rounded-sm border-l-4 border-[var(--chinwag-cta)] bg-[var(--chinwag-card)]'
                  : 'relative overflow-hidden rounded-sm border border-[var(--chinwag-border)] bg-[var(--chinwag-card)]'
              }
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-[var(--chinwag-coral)]"
                style={{ width: `${Math.round(option.share * 100)}%` }}
              />
              <div
                className={
                  broadcast
                    ? 'relative flex items-baseline justify-between gap-4 px-4 py-3 text-lg sm:text-2xl'
                    : 'relative flex items-baseline justify-between gap-4 px-3 py-2 text-sm'
                }
              >
                <span className="font-semibold text-[var(--chinwag-ink)]">
                  {option.label}
                </span>
                <span className="text-[var(--chinwag-ink)] tabular-nums">
                  {Math.round(option.share * 100)}%
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
