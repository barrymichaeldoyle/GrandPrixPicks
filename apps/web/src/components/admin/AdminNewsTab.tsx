import { api } from '@convex-generated/api';
import type { Doc, Id } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useState } from 'react';
import { useQuery } from '@/integrations/convex/query';

type Category = 'pick_related' | 'general';
type Session = 'quali' | 'sprint_quali' | 'sprint' | 'race';

export function AdminNewsTab() {
  const rows = useQuery(api.newsPipeline.reviewQueue);
  if (!rows) {
    return <p className="text-slate-300">Loading news review…</p>;
  }
  return (
    <div className="space-y-4">
      <SourceSettings />
      <HandoffQueue />
      {rows.length ? (
        rows.map((row) => (
          <ProposalCard
            key={row.proposal._id}
            row={row}
            mergeTargets={rows
              .filter(
                (other) =>
                  other.proposal._id !== row.proposal._id &&
                  other.proposal.category === row.proposal.category,
              )
              .map((other) => other.proposal)}
          />
        ))
      ) : (
        <p className="text-slate-300">No news to review.</p>
      )}
    </div>
  );
}

function HandoffQueue() {
  const rows = useQuery(api.newsPipeline.handoffQueue);
  if (!rows?.length) {
    return null;
  }
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
      <h2 className="text-lg font-semibold">Write-up handoffs</h2>
      {rows.map(({ proposal, candidate, source }) => (
        <div className="mt-3 text-sm" key={proposal._id}>
          <p>
            {proposal.raceSlug} · {proposal.headline}
          </p>
          <p>{proposal.handoffNote}</p>
          <a
            className="underline"
            href={candidate.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.name}: {candidate.title}
          </a>
        </div>
      ))}
    </section>
  );
}

function SourceSettings() {
  const sources = useQuery(api.newsPipeline.listSources);
  const configure = useMutation(api.newsPipeline.configureSource);
  const [name, setName] = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function save(
    nextName: string,
    nextUrl: string,
    enabled: boolean,
    pollIntervalMs: number,
  ) {
    setBusy(true);
    setError('');
    try {
      await configure({
        name: nextName,
        feedUrl: nextUrl,
        enabled,
        pollIntervalMs,
      });
      setName('');
      setFeedUrl('');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save source.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
      <h2 className="text-lg font-semibold">Approved sources</h2>
      <div className="mt-2 space-y-2">
        {sources?.map((source) => (
          <div
            key={source._id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>
              {source.name} · {source.feedUrl}
            </span>
            <button
              className="rounded bg-slate-700 px-3 py-1"
              disabled={busy}
              onClick={() =>
                void save(
                  source.name,
                  source.feedUrl,
                  !source.enabled,
                  source.pollIntervalMs,
                )
              }
            >
              {source.enabled ? 'Pause' : 'Enable'}
            </button>
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save(name, feedUrl, true, 3_600_000);
        }}
      >
        <input
          aria-label="Source name"
          className="rounded bg-slate-800 p-2"
          placeholder="Source name"
          required
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <input
          aria-label="RSS feed URL"
          className="min-w-64 flex-1 rounded bg-slate-800 p-2"
          placeholder="https://publisher.example/feed"
          required
          type="url"
          value={feedUrl}
          onChange={(event) => setFeedUrl(event.target.value)}
        />
        <button
          className="rounded bg-blue-600 px-4 py-2"
          disabled={busy}
          type="submit"
        >
          Add source
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}

function ProposalCard({
  row,
  mergeTargets,
}: {
  row: {
    proposal: Doc<'newsProposals'>;
    candidate: Doc<'newsCandidates'>;
    source: Doc<'newsSources'>;
    corroborating: {
      candidate: Doc<'newsCandidates'>;
      source: Doc<'newsSources'>;
    }[];
  };
  mergeTargets: Doc<'newsProposals'>[];
}) {
  const { proposal, candidate, source, corroborating } = row;
  const review = useMutation(api.newsPipeline.reviewProposal);
  const [headline, setHeadline] = useState(proposal.headline);
  const [body, setBody] = useState(proposal.body);
  const [category, setCategory] = useState<Category>(proposal.category);
  const [raceSlug, setRaceSlug] = useState(proposal.raceSlug ?? '');
  const [sessions, setSessions] = useState<Session[]>(proposal.affectsSessions);
  const [feedSelected, setFeedSelected] = useState(true);
  const [writeUpSelected, setWriteUpSelected] = useState(true);
  const [mergeIntoId, setMergeIntoId] = useState<Id<'newsProposals'> | ''>('');
  const [handoffNote, setHandoffNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function decide(decision: 'reject' | 'publish' | 'merge' | 'handoff') {
    setBusy(true);
    setError('');
    try {
      await review({
        proposalId: proposal._id as Id<'newsProposals'>,
        decision,
        mergeIntoId:
          decision === 'merge' && mergeIntoId ? mergeIntoId : undefined,
        handoffNote: decision === 'handoff' ? handoffNote : undefined,
        headline,
        body,
        category,
        raceSlug: raceSlug || undefined,
        affectsSessions: sessions,
        feedSelected,
        writeUpSelected,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save review.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100">
      <div className="mb-3 text-sm text-slate-300">
        <a
          href={candidate.canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {source.name}: {candidate.title}
        </a>
        <p>{candidate.excerpt}</p>
        {corroborating.map(({ candidate: other, source: otherSource }) => (
          <p key={other._id}>
            Also reported by{' '}
            <a
              className="underline"
              href={other.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {otherSource.name}: {other.title}
            </a>
          </p>
        ))}
        {candidate.suggestedRaceSlug ||
        candidate.suggestedDriverCodes?.length ||
        candidate.suggestedTeams?.length ? (
          <p>
            Suggestions: {candidate.suggestedRaceSlug ?? 'No weekend'}
            {candidate.suggestedDriverCodes?.length
              ? ` · Drivers: ${candidate.suggestedDriverCodes.join(', ')}`
              : ''}
            {candidate.suggestedTeams?.length
              ? ` · Teams: ${candidate.suggestedTeams.join(', ')}`
              : ''}
          </p>
        ) : null}
        <p>
          Confidence: {proposal.confidence}. Review: {proposal.reviewReason}
        </p>
        {proposal.contradictions?.length ? (
          <p>Contradictions: {proposal.contradictions.join('; ')}</p>
        ) : null}
      </div>
      <label className="block text-sm">
        Headline
        <input
          className="mt-1 w-full rounded bg-slate-800 p-2"
          value={headline}
          maxLength={180}
          onChange={(event) => setHeadline(event.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm">
        Body
        <textarea
          className="mt-1 w-full rounded bg-slate-800 p-2"
          rows={4}
          value={body}
          maxLength={1000}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="text-sm">
          Category
          <select
            className="ml-2 rounded bg-slate-800 p-2"
            value={category}
            onChange={(event) => {
              const next = event.target.value as Category;
              setCategory(next);
              if (next === 'general') {
                setSessions([]);
              }
            }}
          >
            <option value="general">General</option>
            <option value="pick_related">Pick-related</option>
          </select>
        </label>
        <label className="text-sm">
          Weekend slug
          <input
            className="ml-2 rounded bg-slate-800 p-2"
            value={raceSlug}
            onChange={(event) => setRaceSlug(event.target.value)}
            placeholder="e.g. italy-2026"
          />
        </label>
      </div>
      {category === 'pick_related' && (
        <fieldset className="mt-3 flex flex-wrap gap-3 text-sm">
          <legend>Affected sessions</legend>
          {(['quali', 'sprint_quali', 'sprint', 'race'] as Session[]).map(
            (session) => (
              <label key={session}>
                <input
                  type="checkbox"
                  checked={sessions.includes(session)}
                  onChange={(event) =>
                    setSessions(
                      event.target.checked
                        ? [...sessions, session]
                        : sessions.filter((value) => value !== session),
                    )
                  }
                />{' '}
                {session}
              </label>
            ),
          )}
        </fieldset>
      )}
      {raceSlug && (
        <div className="mt-3 flex gap-4 text-sm">
          <label>
            <input
              type="checkbox"
              checked={feedSelected}
              onChange={(event) => setFeedSelected(event.target.checked)}
            />{' '}
            Feed
          </label>
          <label>
            <input
              type="checkbox"
              checked={writeUpSelected}
              onChange={(event) => setWriteUpSelected(event.target.checked)}
            />{' '}
            Weekend write-up
          </label>
        </div>
      )}
      {raceSlug && (
        <label className="mt-3 block text-sm">
          Hand-written write-up note
          <input
            className="mt-1 w-full rounded bg-slate-800 p-2"
            maxLength={500}
            value={handoffNote}
            onChange={(event) => setHandoffNote(event.target.value)}
          />
        </label>
      )}
      {error && (
        <p role="alert" className="mt-3 text-red-300">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-3">
        {mergeTargets.length > 0 && (
          <div className="flex gap-2">
            <select
              aria-label="Merge into proposal"
              className="rounded bg-slate-800 p-2 text-sm"
              value={mergeIntoId}
              onChange={(event) =>
                setMergeIntoId(event.target.value as Id<'newsProposals'>)
              }
            >
              <option value="">Choose proposal</option>
              {mergeTargets.map((target) => (
                <option key={target._id} value={target._id}>
                  {target.headline}
                </option>
              ))}
            </select>
            <button
              className="rounded bg-slate-700 px-3 py-2"
              disabled={busy || !mergeIntoId}
              onClick={() => void decide('merge')}
            >
              Merge
            </button>
          </div>
        )}
        <button
          className="rounded bg-red-800 px-4 py-2"
          disabled={busy}
          onClick={() => void decide('reject')}
        >
          Reject
        </button>
        <button
          className="rounded bg-blue-600 px-4 py-2"
          disabled={busy}
          onClick={() => void decide('publish')}
        >
          Publish
        </button>
        {raceSlug && (
          <button
            className="rounded bg-slate-700 px-4 py-2"
            disabled={busy || !handoffNote.trim()}
            onClick={() => void decide('handoff')}
          >
            Hand off
          </button>
        )}
      </div>
    </article>
  );
}
