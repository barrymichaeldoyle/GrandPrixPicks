import { api } from '@convex-generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { useNow } from '@/lib/testing/now';

const MAX_ANNOUNCEMENT_LENGTH = 500;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDatetimeLocalValue(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Parses a datetime-local input value (local time) to ms epoch. */
function fromDatetimeLocalValue(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : undefined;
}

export function AdminBannerTab() {
  const announcement = useQuery(api.announcements.adminGetAnnouncement);
  const setAnnouncement = useMutation(api.announcements.adminSetAnnouncement);
  const clearAnnouncement = useMutation(
    api.announcements.adminClearAnnouncement,
  );
  const now = useNow(30_000);

  // null = untouched, fall back to the saved announcement's value.
  const [message, setMessage] = useState<string | null>(null);
  const [startsAtInput, setStartsAtInput] = useState<string | null>(null);
  const [expiresAtInput, setExpiresAtInput] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (announcement === undefined) {
    return <InlineLoader />;
  }

  const draft = message ?? announcement?.message ?? '';
  const trimmedDraft = draft.trim();
  const startsAtDraft =
    startsAtInput ??
    (announcement?.startsAt != null
      ? toDatetimeLocalValue(announcement.startsAt)
      : '');
  const expiresAtDraft =
    expiresAtInput ??
    (announcement?.expiresAt != null
      ? toDatetimeLocalValue(announcement.expiresAt)
      : '');

  const isActive = announcement?.active === true;
  const isScheduled =
    isActive && announcement.startsAt != null && now < announcement.startsAt;
  const isExpired =
    isActive && announcement.expiresAt != null && now >= announcement.expiresAt;
  const status = !isActive
    ? { label: 'Not shown', className: 'bg-slate-700 text-slate-400' }
    : isScheduled
      ? { label: 'Scheduled', className: 'bg-amber-500/15 text-amber-400' }
      : isExpired
        ? { label: 'Expired', className: 'bg-slate-700 text-slate-400' }
        : { label: 'Live', className: 'bg-emerald-500/15 text-emerald-400' };

  async function handlePublish() {
    setIsSaving(true);
    setError(null);
    try {
      await setAnnouncement({
        message: trimmedDraft,
        startsAt: fromDatetimeLocalValue(startsAtDraft),
        expiresAt: fromDatetimeLocalValue(expiresAtDraft),
      });
      setMessage(null);
      setStartsAtInput(null);
      setExpiresAtInput(null);
    } catch (err) {
      console.error('Failed to publish announcement:', err);
      setError(
        err instanceof Error && err.message.includes('Auto-hide')
          ? 'Check the schedule — the auto-hide time must be in the future and after the show-from time.'
          : 'Failed to publish — try again.',
      );
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
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
          >
            {status.label}
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

        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="admin-banner-starts-at"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Show from{' '}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="admin-banner-starts-at"
              type="datetime-local"
              value={startsAtDraft}
              onChange={(event) => setStartsAtInput(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-slate-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Hold the banner back until then — e.g. when the session was
              expected to finish. Empty shows it immediately.
            </p>
          </div>
          <div>
            <label
              htmlFor="admin-banner-expires-at"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Auto-hide at{' '}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              id="admin-banner-expires-at"
              type="datetime-local"
              value={expiresAtDraft}
              onChange={(event) => setExpiresAtInput(event.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white [color-scheme:dark] focus:border-slate-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Takes itself down — no need to remember to clear it. Empty keeps
              it up until you take it down.
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
