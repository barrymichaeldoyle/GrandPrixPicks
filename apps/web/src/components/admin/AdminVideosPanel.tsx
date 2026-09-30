import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { useMutation } from 'convex/react';
import { useQuery } from '@/integrations/convex/query';
import { useState } from 'react';

function UploadReview({
  upload,
  races,
}: {
  upload: Doc<'youtubeUploads'>;
  races: Doc<'races'>[];
}) {
  const review = useMutation(api.youtubeUploads.review);
  const [raceSlug, setRaceSlug] = useState('');
  const [kind, setKind] = useState<Doc<'raceVideos'>['kind']>('fp1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(decision: 'publish' | 'reject' | 'retry') {
    setBusy(true);
    setError('');
    try {
      await review({
        id: upload._id,
        version: upload.sourceUpdatedAt,
        decision,
        ...(decision === 'publish' ? { raceSlug, kind } : {}),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Video review failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 rounded border border-slate-700 p-4">
      <a
        href={`https://www.youtube.com/watch?v=${upload.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-white underline"
      >
        {upload.title}
      </a>
      <p className="text-sm text-slate-400">{upload.reason}</p>
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Video race"
          value={raceSlug}
          onChange={(e) => setRaceSlug(e.target.value)}
          className="rounded bg-slate-800 p-2 text-white"
        >
          <option value="">Select race</option>
          {races.map((race) => (
            <option key={race._id} value={race.slug}>
              {race.name} {race.season}
            </option>
          ))}
        </select>
        <select
          aria-label="Video session"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="rounded bg-slate-800 p-2 text-white"
        >
          {(
            [
              'fp1',
              'fp2',
              'fp3',
              'sprint_quali',
              'sprint',
              'quali',
              'race',
              'radio',
            ] as const
          ).map((value) => (
            <option key={value} value={value}>
              {
                {
                  fp1: 'FP1',
                  fp2: 'FP2',
                  fp3: 'FP3',
                  sprint_quali: 'Sprint Qualifying',
                  sprint: 'Sprint',
                  quali: 'Qualifying',
                  race: 'Race',
                  radio: 'Radio Rewind',
                }[value]
              }
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy || !raceSlug || !upload.verified}
          onClick={() => submit('publish')}
          className="rounded bg-slate-100 px-3 py-2 text-slate-900 disabled:opacity-50"
        >
          Publish video
        </button>
        {!upload.verified ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => submit('retry')}
            className="rounded border border-slate-600 px-3 py-2 text-white"
          >
            Retry verification
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => submit('reject')}
          className="rounded border border-slate-600 px-3 py-2 text-white"
        >
          Reject video
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AdminVideosPanel() {
  const uploads = useQuery(api.youtubeUploads.reviewQueue, {});
  const subscription = useQuery(api.youtubeUploads.subscriptionStatus, {});
  const races = useQuery(api.races.listCurrentSeason)?.races ?? [];
  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-xl font-semibold text-white">Videos to review</h2>
      {subscription ? (
        <p className="text-sm text-slate-400">
          {subscription.lastError ??
            (subscription.expiresAt
              ? `YouTube subscription expires ${new Date(subscription.expiresAt).toLocaleString()}.`
              : 'YouTube subscription confirmation pending.')}
        </p>
      ) : subscription === null ? (
        <p className="text-sm text-slate-400">
          YouTube subscription is not configured.
        </p>
      ) : null}
      {uploads === undefined ? (
        <p className="text-slate-400">Loading videos…</p>
      ) : uploads.length ? (
        uploads.map((upload) => (
          <UploadReview key={upload._id} upload={upload} races={races} />
        ))
      ) : (
        <p className="text-slate-400">No videos to review.</p>
      )}
    </section>
  );
}
