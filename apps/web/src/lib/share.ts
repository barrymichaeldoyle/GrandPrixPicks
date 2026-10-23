import { formatPositionList } from '@grandprixpicks/shared/share';

import type { ShareCard } from '@/lib/og/shareCard';
import { encodeShareCardSearch } from '@/lib/og/shareCard';
import { siteConfig } from '@/lib/site';

// Shared with mobile's native share sheet so copy can't drift between apps.
export {
  buildPicksMessageText,
  buildScoreShareText,
  countryCodeToFlagEmoji,
} from '@grandprixpicks/shared/share';

/**
 * The race page URL a share lands on. It carries the card payload so the page
 * can serve a per-user OG image (`/og/share`) when the link unfurls, and the
 * source so a visit from a group chat is told apart from one from X.
 */
export function buildPicksSharePageUrl({
  raceSlug,
  card,
  source,
  campaign,
}: {
  raceSlug: string;
  card: ShareCard;
  source: 'x' | 'share';
  campaign: string;
}) {
  const params = new URLSearchParams({
    ...encodeShareCardSearch(card),
    utm_source: source,
    utm_medium: source === 'x' ? 'social' : 'share_sheet',
    utm_campaign: campaign,
  });
  return `${siteConfig.url}/races/${raceSlug}?${params.toString()}`;
}

export function buildRaceResultShareText({
  raceName,
  sessionLabel,
  drivers,
  accountHandle,
}: {
  raceName: string;
  sessionLabel: string;
  drivers: readonly { code: string; nationality?: string | null }[];
  accountHandle: string;
}) {
  return `${raceName} ${sessionLabel} results 🏎️🏁\n\n${formatPositionList(
    drivers,
  )}\n\nFull results and player scores on ${accountHandle}.`;
}

export function buildPicksShareText({
  raceName,
  sessionLabel,
  picks,
  accountHandle,
}: {
  raceName: string;
  sessionLabel: string;
  picks: readonly { code: string; nationality?: string | null }[];
  accountHandle: string;
}) {
  return `My ${sessionLabel} top 5 for the ${raceName} 🎯🏎️\n\n${formatPositionList(
    picks,
  )}\n\nThink you can beat me on ${accountHandle}?`;
}

export function buildH2HPicksShareText({
  raceName,
  sessionLabel,
  winnerCodes,
  accountHandle,
}: {
  raceName: string;
  sessionLabel: string;
  winnerCodes: readonly string[];
  accountHandle: string;
}) {
  // Codes only — team names live on the OG card, keeping the post under
  // X's 280-character limit.
  return `My ${sessionLabel} Head-to-Head picks for the ${raceName} ⚔️🏎️💨\n\n${winnerCodes.join(' · ')}\n\n🏁 Think you can beat me on ${accountHandle}?`;
}

export function buildH2HScoreShareText({
  raceName,
  sessionLabel,
  correct,
  total,
  picks,
  accountHandle,
}: {
  raceName: string;
  sessionLabel: string;
  correct: number;
  total: number;
  /** Per-matchup verdicts in grid order; code is null when no pick was made. */
  picks: readonly { code: string | null; correct: boolean }[];
  accountHandle: string;
}) {
  // Wordle-style one-liner — team names live on the OG card, keeping the
  // post under X's 280-character limit.
  const breakdown = picks
    .map((pick) => `${pick.correct ? '✅' : '❌'}${pick.code ?? '—'}`)
    .join(' ');
  return `I scored ${correct}/${total} on my ${raceName} ${sessionLabel} Head-to-Head picks ⚔️\n\n${breakdown}\n\nCan you beat my score on ${accountHandle}?`;
}

export function buildOfficialH2HResultReplyText({
  raceName,
  sessionLabel,
  matchups,
}: {
  raceName: string;
  sessionLabel: string;
  matchups: readonly {
    team: string;
    winnerCode: string;
    loserCode: string;
  }[];
}) {
  // Driver codes keep all 11 team lines under X's "Show more" truncation —
  // full names live on the OG card that accompanies the post.
  const results = matchups
    .map(
      ({ team, winnerCode, loserCode }) =>
        `${team}: ${winnerCode} beat ${loserCode}`,
    )
    .join('\n');
  return `${raceName} ${sessionLabel} Head-to-Head results ⚔️🏁\n\n${results}`;
}

/** Builds an X post intent with the link separated from the copy. */
export function buildXShareIntentUrl(text: string, url: string) {
  const postText = `${text.trim()}\n\n${url}`;
  return `https://x.com/intent/post?${new URLSearchParams({ text: postText }).toString()}`;
}
