import { ChinwagBanner } from './ChinwagBanner';
import { PollFooter } from './PollFooter';
import { PollTally } from './PollTally';

type TallyOption = {
  count: number;
  label: string;
  share: number;
  value: string;
};

export type ResultsBoardData = {
  phase: 'pre' | 'post';
  questions: {
    before: TallyOption[];
    id: string;
    label: string;
    options: TallyOption[];
  }[];
  race: { name: string };
  /** Pole and race winner, once those sessions are published. */
  settled: {
    actual: { code: string; displayName: string };
    crowd: TallyOption | null;
    id: string;
    label: string;
  }[];
  showName: string;
  totalVotes: number;
};

type ChinwagResultsBoardProps = {
  data: ResultsBoardData | undefined;
  /**
   * Marks the board as sample data. Set on the proposal link so invented vote
   * counts are never mistaken for his audience's, wherever the link ends up.
   */
  sample?: boolean;
};

/**
 * The board that goes on screen during the show.
 *
 * Shared by the live board and the demo, so what he is shown in a proposal is
 * the component he would get, not a mock-up of it that can drift away from it.
 *
 * Two columns on a wide screen so all six categories fit a 16:9 frame without
 * scrolling, which is the actual constraint: he is sharing this, not scrolling
 * it.
 */
export function ChinwagResultsBoard({
  data,
  sample = false,
}: ChinwagResultsBoardProps) {
  return (
    <div className="mx-auto max-w-6xl">
      <ChinwagBanner id="header" title="Your 2026 race predictions" />
      <h1 className="font-title mt-4 text-3xl font-semibold text-[var(--chinwag-ink)] sm:text-5xl">
        {data ? data.race.name : 'Loading'}
      </h1>
      <div className="mt-1.5 mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <p className="flex items-center gap-3 text-sm tracking-[0.12em] text-[var(--chinwag-ink-muted)] uppercase">
          {data?.phase === 'post'
            ? 'Race Report · Bangers & Clangers'
            : (data?.showName ?? 'Pre Race Chinwag')}
          {sample ? (
            <span className="rounded-sm border border-[var(--chinwag-border)] bg-[var(--chinwag-card)] px-2 py-0.5 text-[11px] tracking-[0.1em] normal-case">
              Example data
            </span>
          ) : null}
        </p>
        <p className="text-2xl text-[var(--chinwag-ink)] tabular-nums sm:text-3xl">
          {data ? data.totalVotes : 0}
          <span className="ml-2 text-base text-[var(--chinwag-ink-muted)]">
            votes
          </span>
        </p>
      </div>

      {/* Settled facts first, because on the Race Report they are the line he
          opens with: what the crowd called, and what actually happened. Only
          present once those sessions are published. */}
      {data && data.settled.length > 0 ? (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {data.settled.map((entry) => (
            <div
              className="rounded-sm border border-[var(--chinwag-border)] bg-[var(--chinwag-card)] px-4 py-3"
              key={entry.id}
            >
              <p className="text-xs tracking-[0.12em] text-[var(--chinwag-ink-muted)] uppercase">
                {entry.label}
              </p>
              <p className="mt-1 text-lg text-[var(--chinwag-ink)] sm:text-xl">
                {entry.actual.displayName}
              </p>
              {entry.crowd ? (
                <p className="mt-1 text-sm text-[var(--chinwag-ink-muted)]">
                  You said {entry.crowd.label} (
                  {Math.round(entry.crowd.share * 100)}%)
                  {entry.crowd.value === entry.actual.code ? ' ✓' : ' ✗'}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-2">
        {data?.questions.map((question) => (
          <PollTally
            before={question.before[0] ?? null}
            broadcast
            key={question.id}
            label={question.label}
            options={question.options.slice(0, 5)}
          />
        ))}
      </div>

      {/* No follow links here on purpose. This board's whole job is to fit a
          16:9 frame during the show, and a "follow me" card on his own stream
          is both redundant and one more thing pushing the numbers off screen.
          The links live on the vote page, where his audience is. */}
      <PollFooter />
    </div>
  );
}
