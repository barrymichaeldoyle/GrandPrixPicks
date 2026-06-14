import type { SessionType } from '@/lib/sessions';

/**
 * Payload for per-user share cards (OG images). Encoded into the race page's
 * share URL by the share buttons, decoded again by the race route head() and
 * the /og/share endpoint. Data travels in the URL on purpose: OG crawlers are
 * anonymous, and a user putting their own picks/score in a link they chose to
 * share is the consent model — no public Convex query needed.
 */
export type ShareCard =
  | { variant: 'picks'; session: SessionType; picks: string[]; by?: string }
  | { variant: 'result'; session: SessionType; picks: string[] }
  | { variant: 'h2h_result'; session: SessionType; winners: string[] }
  | {
      variant: 'h2h_picks';
      session: SessionType;
      winners: string[];
      by?: string;
    }
  | {
      variant: 'h2h_score';
      session: SessionType;
      correct: number;
      total: number;
      points: number;
      /** Per-matchup verdicts in grid order (older links omit them). */
      picks?: { code: string; correct: boolean }[];
      by?: string;
    }
  | { variant: 'score'; points: number; final: boolean; by?: string };

const SESSION_TYPES = ['quali', 'sprint_quali', 'sprint', 'race'] as const;

const DRIVER_CODE_RE = /^[A-Z]{2,4}$/;
const H2H_PICK_TOKEN_RE = /^[A-Z]{2,4}:[01]$/;
const MAX_NAME_LENGTH = 40;
const SHARE_CARD_VERSION = '2';

function sanitizeName(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replaceAll(/[\u0000-\u001f\u007f]/g, '').trim();
  if (cleaned.length === 0) {
    return undefined;
  }
  return cleaned.slice(0, MAX_NAME_LENGTH);
}

/** Search params for a share URL / OG image URL. */
export function encodeShareCardSearch(card: ShareCard): Record<string, string> {
  if (card.variant === 'picks' || card.variant === 'result') {
    return {
      share_v: SHARE_CARD_VERSION,
      share: card.variant,
      session: card.session,
      picks: card.picks.join(','),
      ...(card.variant === 'picks' && card.by ? { by: card.by } : {}),
    };
  }
  if (card.variant === 'h2h_result' || card.variant === 'h2h_picks') {
    return {
      share_v: SHARE_CARD_VERSION,
      share: card.variant,
      session: card.session,
      winners: card.winners.join(','),
      ...(card.variant === 'h2h_picks' && card.by ? { by: card.by } : {}),
    };
  }
  if (card.variant === 'h2h_score') {
    return {
      share_v: SHARE_CARD_VERSION,
      share: 'h2h_score',
      session: card.session,
      correct: String(card.correct),
      total: String(card.total),
      points: String(card.points),
      ...(card.picks && card.picks.length > 0
        ? {
            picks: card.picks
              .map((pick) => `${pick.code}:${pick.correct ? 1 : 0}`)
              .join(','),
          }
        : {}),
      ...(card.by ? { by: card.by } : {}),
    };
  }
  return {
    share_v: SHARE_CARD_VERSION,
    share: 'score',
    points: String(card.points),
    final: card.final ? '1' : '0',
    ...(card.by ? { by: card.by } : {}),
  };
}

/**
 * Parses and validates share-card params from untrusted search input.
 * Returns null when params are absent or invalid (callers fall back to the
 * default OG image).
 */
export function parseShareCard(
  search: Record<string, unknown>,
): ShareCard | null {
  const by = sanitizeName(search.by);

  if (search.share === 'picks' || search.share === 'result') {
    const session = SESSION_TYPES.find((s) => s === search.session);
    if (!session) {
      return null;
    }
    if (typeof search.picks !== 'string') {
      return null;
    }
    const picks = search.picks.split(',');
    if (picks.length !== 5 || !picks.every((c) => DRIVER_CODE_RE.test(c))) {
      return null;
    }
    if (search.share === 'result') {
      return { variant: 'result', session, picks };
    }
    return { variant: 'picks', session, picks, by };
  }

  if (search.share === 'score') {
    const points = Number(search.points);
    if (!Number.isInteger(points) || points < 0 || points > 999) {
      return null;
    }
    return { variant: 'score', points, final: search.final === '1', by };
  }

  if (search.share === 'h2h_result' || search.share === 'h2h_picks') {
    const session = SESSION_TYPES.find((s) => s === search.session);
    if (!session || typeof search.winners !== 'string') {
      return null;
    }
    const winners = search.winners.split(',');
    if (
      winners.length < 1 ||
      winners.length > 16 ||
      !winners.every((code) => DRIVER_CODE_RE.test(code))
    ) {
      return null;
    }
    if (search.share === 'h2h_picks') {
      return { variant: 'h2h_picks', session, winners, by };
    }
    return { variant: 'h2h_result', session, winners };
  }

  if (search.share === 'h2h_score') {
    const session = SESSION_TYPES.find((s) => s === search.session);
    const correct = Number(search.correct);
    const total = Number(search.total);
    const points = Number(search.points);
    if (
      !session ||
      !Number.isInteger(correct) ||
      !Number.isInteger(total) ||
      !Number.isInteger(points) ||
      correct < 0 ||
      total < 1 ||
      total > 16 ||
      correct > total ||
      points < 0 ||
      points > 16
    ) {
      return null;
    }
    let picks: { code: string; correct: boolean }[] | undefined;
    if (typeof search.picks === 'string') {
      const tokens = search.picks.split(',');
      if (
        tokens.length > 16 ||
        !tokens.every((token) => H2H_PICK_TOKEN_RE.test(token))
      ) {
        return null;
      }
      picks = tokens.map((token) => {
        const [code, verdict] = token.split(':');
        return { code, correct: verdict === '1' };
      });
    }
    return { variant: 'h2h_score', session, correct, total, points, picks, by };
  }

  return null;
}
