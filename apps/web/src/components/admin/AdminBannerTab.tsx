import { api } from '@convex-generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';

const MAX_ANNOUNCEMENT_LENGTH = 500;

export function AdminBannerTab() {
  const announcement = useQuery(api.announcements.adminGetAnnouncement);
  const setAnnouncement = useMutation(api.announcements.adminSetAnnouncement);
  const clearAnnouncement = useMutation(
    api.announcements.adminClearAnnouncement,
  );

  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (announcement === undefined) {
    return <InlineLoader />;
  }

  const draft = message ?? announcement?.message ?? '';
  const trimmedDraft = draft.trim();
  const isActive = announcement?.active === true;

  async function handlePublish() {
    setIsSaving(true);
    setError(null);
    try {
      await setAnnouncement({ message: trimmedDraft });
      setMessage(null);
    } catch (err) {
      console.error('Failed to publish announcement:', err);
      setError('Failed to publish — try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClear() {
    setIsSaving(true);
    setError(null);
    try {
      await clearAnnouncement({});
    } catch (err) {
      console.error('Failed to clear announcement:', err);
      setError('Failed to take the banner down — try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 sm:p-5">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Site Banner</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}
          >
            {isActive ? 'Live' : 'Not shown'}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-400">
          A dismissible message shown to everyone at the top of the site — e.g.
          "Results will be published late while we wait for FIA penalty
          decisions." Publishing again replaces the current message and re-shows
          it to users who dismissed the old one.
        </p>

        <label
          htmlFor="admin-banner-message"
          className="mb-1 block text-sm font-medium text-slate-300"
        >
          Message
        </label>
        <textarea
          id="admin-banner-message"
          value={draft}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={MAX_ANNOUNCEMENT_LENGTH}
          placeholder="e.g. Heads up — this weekend's results may be published a little later than usual."
          className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-slate-400 focus:outline-none"
        />
        <div className="mt-1 text-right text-xs text-slate-500">
          {draft.length}/{MAX_ANNOUNCEMENT_LENGTH}
        </div>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || trimmedDraft.length === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isActive ? 'Update Banner' : 'Publish Banner'}
          </button>
          {isActive && (
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Take Down
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
