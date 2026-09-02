import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useConvex, useMutation } from 'convex/react';
import { useState } from 'react';

import { useQuery } from '@/integrations/convex/query';

const POLL_SLUG = 'chinwag';
const CREATOR_NAME = 'Tommo McCluskey';
const SHOW_NAME = 'Pre Race Chinwag';

type AdminCreatorPollTabProps = {
  races: Doc<'races'>[] | undefined;
};

function toCsv(rows: Record<string, string>[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0]!);

  function escape(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  }

  return [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(',')),
  ].join('\n');
}

const BUTTON =
  'rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 disabled:opacity-50';
const PRIMARY =
  'rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50';

/**
 * Running the creator poll: point it at a race and a phase, open or close it,
 * take the CSV, or hand the whole thing to the calendar.
 *
 * These controls are the difference between a gift and a chore. The poll turns
 * over twice a race weekend, twenty-three times a season, and whoever does that
 * is production staff for someone else's show. Auto-advance is the real answer;
 * everything else here is the manual override for when it needs one.
 */
export function AdminCreatorPollTab({ races }: AdminCreatorPollTabProps) {
  const convex = useConvex();
  const polls = useQuery(api.creatorPolls.adminListPolls);
  const upsertPoll = useMutation(api.creatorPolls.adminUpsertPoll);
  const resetVotes = useMutation(api.creatorPolls.adminResetVotes);

  const poll = polls?.find((entry) => entry.slug === POLL_SLUG);
  const [raceId, setRaceId] = useState<Id<'races'> | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRaceId = raceId || poll?.raceId || races?.[0]?._id || '';

  async function save(patch: {
    autoAdvance?: boolean;
    phase?: 'pre' | 'post';
    status?: 'open' | 'closed';
  }) {
    if (!selectedRaceId) {
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await upsertPoll({
        slug: POLL_SLUG,
        creatorName: CREATOR_NAME,
        showName: SHOW_NAME,
        raceId: selectedRaceId as Id<'races'>,
        phase: patch.phase ?? poll?.phase ?? 'pre',
        status: patch.status ?? poll?.status ?? 'open',
        autoAdvance: patch.autoAdvance ?? poll?.autoAdvance ?? false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the poll.');
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    const data = await convex.query(api.creatorPolls.adminExportVotes, {
      slug: POLL_SLUG,
    });

    if (!data || data.rows.length === 0) {
      setError('No votes to export yet.');
      return;
    }

    const blob = new Blob([toCsv(data.rows)], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chinwag-${data.raceName.toLowerCase().replaceAll(' ', '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{SHOW_NAME} poll</h2>
        <p className="text-sm text-slate-400">
          {poll
            ? `${poll.raceName} — ${poll.phase === 'post' ? 'post-race' : 'pre-race'}, ${poll.status} · ${poll.preVotes} pre / ${poll.postVotes} post`
            : 'Not created yet.'}
        </p>
        {poll?.planned ? (
          <p className="mt-1 text-xs text-slate-500">
            Calendar says:{' '}
            {poll.planned.phase === 'post' ? 'post-race' : 'pre-race'},{' '}
            {poll.planned.status}
            {poll.autoAdvance ? ' (auto-advance on)' : ' (auto-advance off)'}
          </p>
        ) : null}
      </div>

      <label className="block text-sm text-slate-300">
        Race
        <select
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white"
          onChange={(event) => setRaceId(event.target.value as Id<'races'>)}
          value={selectedRaceId}
        >
          {races?.map((race) => (
            <option key={race._id} value={race._id}>
              R{race.round} {race.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="text-sm text-amber-400">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          className={PRIMARY}
          disabled={busy}
          onClick={() => void save({ phase: 'pre', status: 'open' })}
          type="button"
        >
          Open pre-race
        </button>
        <button
          className={PRIMARY}
          disabled={busy}
          onClick={() => void save({ phase: 'post', status: 'open' })}
          type="button"
        >
          Open post-race
        </button>
        <button
          className={BUTTON}
          disabled={busy || !poll}
          onClick={() => void save({ status: 'closed' })}
          type="button"
        >
          Close voting
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={BUTTON}
          disabled={busy || !poll}
          onClick={() => void save({ autoAdvance: !poll?.autoAdvance })}
          type="button"
        >
          {poll?.autoAdvance ? 'Turn auto-advance off' : 'Turn auto-advance on'}
        </button>
        <button
          className={BUTTON}
          onClick={() => void exportCsv()}
          type="button"
        >
          Export CSV
        </button>
        <button
          className={BUTTON}
          disabled={busy || !poll}
          onClick={() => {
            setBusy(true);
            void resetVotes({ slug: POLL_SLUG }).finally(() => setBusy(false));
          }}
          type="button"
        >
          Clear this race’s votes
        </button>
      </div>
    </div>
  );
}
