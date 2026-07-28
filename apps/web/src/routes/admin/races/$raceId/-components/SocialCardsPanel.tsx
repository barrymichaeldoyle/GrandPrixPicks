import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS_FULL } from '@/lib/sessions';
import { Download, Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';

type PracticeSessionType = 'fp1' | 'fp2' | 'fp3';

type SocialCard = {
  /** Stable key, also the downloaded filename stem. */
  id: string;
  label: string;
  group: string;
  url: string;
};

function buildCards(
  raceSlug: string,
  practiceSessions: PracticeSessionType[],
  resultSessions: SessionType[],
): SocialCard[] {
  const cards: SocialCard[] = practiceSessions.map((session) => ({
    id: `${raceSlug}-${session}`,
    label: session.toUpperCase(),
    group: 'Practice',
    url: `/og/practice?race=${raceSlug}&session=${session}`,
  }));

  for (const session of resultSessions) {
    cards.push({
      id: `${raceSlug}-${session}`,
      label: SESSION_LABELS_FULL[session],
      group: 'Classification',
      url: `/og/results?race=${raceSlug}&session=${session}`,
    });
    cards.push({
      id: `${raceSlug}-${session}-h2h`,
      label: `${SESSION_LABELS_FULL[session]} H2H`,
      group: 'Head-to-head',
      url: `/og/h2h?race=${raceSlug}&session=${session}`,
    });
  }

  return cards;
}

/**
 * Renders and downloads the branded 16:9 cards for posting this race weekend
 * to X. Cards are rendered server-side from published data, so a card only
 * appears once its session has results.
 */
export function SocialCardsPanel({
  raceSlug,
  practiceSessions,
  resultSessions,
}: {
  raceSlug: string | undefined;
  practiceSessions: PracticeSessionType[];
  resultSessions: SessionType[];
}) {
  const cards = raceSlug
    ? buildCards(raceSlug, practiceSessions, resultSessions)
    : [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (cards.length === 0) {
    return null;
  }

  const selected = cards.find((card) => card.id === selectedId) ?? cards[0];
  const groups = [...new Set(cards.map((card) => card.group))];

  async function download(card: SocialCard) {
    setError(null);
    const response = await fetch(card.url);
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${card.id}.png`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    captureAnalyticsEvent('admin_social_card_downloaded', {
      race_slug: raceSlug,
      card_id: card.id,
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-yellow-400" />
        <h2 className="text-xl font-semibold text-white">Social cards</h2>
      </div>
      <p className="mt-2 text-sm text-slate-400">
        Branded 16:9 images for posting to X. Pick a card to preview it, then
        download the PNG.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {groups.map((group) => (
          <div className="flex flex-wrap items-center gap-2" key={group}>
            <span className="w-32 text-xs font-bold text-slate-500 uppercase">
              {group}
            </span>
            {cards
              .filter((card) => card.group === group)
              .map((card) => (
                <button
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                    card.id === selected.id
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                      : 'border-slate-600 text-slate-300 hover:border-slate-400'
                  }`}
                  key={card.id}
                  onClick={() => {
                    setSelectedId(card.id);
                    setError(null);
                  }}
                  type="button"
                >
                  {card.label}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400"
          onClick={() => void download(selected)}
          type="button"
        >
          <Download size={16} />
          Download {selected.label}
        </button>
        <a
          className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
          href={selected.url}
          rel="noreferrer"
          target="_blank"
        >
          Open full size
        </a>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      ) : (
        <img
          alt={`${selected.label} card`}
          className="mt-4 w-full rounded-lg border border-slate-700"
          key={selected.url}
          src={selected.url}
        />
      )}
    </section>
  );
}
