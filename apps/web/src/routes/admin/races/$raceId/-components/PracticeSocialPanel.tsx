import type { FunctionReturnType } from 'convex/server';
import { Check, Copy, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';

import { api } from '@convex-generated/api';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { siteConfig } from '@/lib/site';

type Summary = NonNullable<
  FunctionReturnType<
    typeof api.practiceResults.getPracticeSessionSummariesForRace
  >
>;
type Operations = NonNullable<
  FunctionReturnType<typeof api.practiceResults.getAdminPracticeOperations>
>;

function draftFor(summary: Summary) {
  const session = summary.sessions.at(-1);
  if (!session?.fastest) {
    return '';
  }
  const podium = session.topThree.map((entry) => entry.code).join(' · ');
  const mover = session.positionChanges[0];
  const reserve = session.reserveDrivers[0];
  return [
    `${session.sessionType.toUpperCase()} complete at the ${summary.race.name} 🏁`,
    `${session.fastest.code} sets the pace with a ${session.fastest.bestLapSeconds.toFixed(3)}s lap.`,
    `Top 3: ${podium}.`,
    mover
      ? `${mover.code} made the biggest move, ${Math.abs(mover.placesGained)} places ${mover.placesGained >= 0 ? 'up' : 'down'} from the previous practice session.`
      : null,
    reserve
      ? `Reserve watch: ${reserve.code} finished P${reserve.position}.`
      : null,
    `${summary.race.hashtag ?? '#F1'} #GrandPrixPicks`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function PracticeSocialPanel({
  summary,
  operations,
}: {
  summary: Summary | null | undefined;
  operations: Operations | null | undefined;
}) {
  const generated = summary ? draftFor(summary) : '';
  const [copy, setCopy] = useState(generated);
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopy(generated), [generated]);

  if (!summary || summary.sessions.length === 0) {
    return null;
  }
  const url = `${siteConfig.url}${summary.race.canonicalPath}?utm_source=social&utm_medium=organic&utm_campaign=practice_results`;

  async function copyPost() {
    await navigator.clipboard.writeText(`${copy}\n\n${url}`);
    setCopied(true);
    captureAnalyticsEvent('admin_practice_social_copy_copied', {
      race_slug: summary?.race.slug,
      session_type: summary?.sessions.at(-1)?.sessionType,
    });
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-yellow-400" />
        <h2 className="text-xl font-semibold text-white">
          Practice content preview
        </h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Review and edit this factual draft before publishing manually.
      </p>
      <textarea
        aria-label="Editable practice social post"
        className="mt-4 min-h-48 w-full rounded-lg border border-slate-600 bg-slate-950/60 p-3 text-sm leading-6 text-white focus:border-yellow-400 focus:outline-none"
        onChange={(event) => setCopy(event.target.value)}
        value={copy}
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400"
          onClick={() => void copyPost()}
          type="button"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy post + link'}
        </button>
        <a
          className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Preview results page
        </a>
      </div>
      {operations ? (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {operations.map((item) => (
            <div
              className="rounded-lg border border-slate-700 bg-slate-900/50 p-3"
              key={item.sessionType}
            >
              <p className="text-xs font-bold text-white uppercase">
                {item.sessionType}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {item.poll
                  ? `${item.poll.status.replaceAll('_', ' ')} · ${item.poll.attemptCount} attempts`
                  : 'Not attempted'}
              </p>
              <p
                className={`mt-1 text-xs ${
                  item.poll?.lastError ? 'text-red-300' : 'text-emerald-300'
                }`}
              >
                {item.poll?.lastError ??
                  (item.result?.nextRecheckAt
                    ? `Recheck ${new Date(item.result.nextRecheckAt).toLocaleString()}`
                    : item.result
                      ? 'Reconciliation complete'
                      : 'Result pending')}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
