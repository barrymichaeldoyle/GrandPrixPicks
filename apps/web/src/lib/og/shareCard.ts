import type { SessionType } from '../sessions';

/**
 * Payload for per-user share cards (OG images). Encoded into the race page's
 * share URL by the share buttons, decoded again by the race route head() and
 * the /og/share endpoint. Data travels in the URL on purpose: OG crawlers are
 * anonymous, and a user putting their own picks/score in a link they chose to
 * share is the consent model — no public Convex query needed.
 */
export type ShareCard =
  | { variant: 'picks'; session: SessionType; picks: string[]; by?: string }
  | { variant: 'score'; points: number; final: boolean; by?: string };

const SESSION_TYPES = ['quali', 'sprint_quali', 'sprint', 'race'] as const;

const DRIVER_CODE_RE = /^[A-Z]{2,4}$/;
const MAX_NAME_LENGTH = 40;

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
  if (card.variant === 'picks') {
    return {
      share: 'picks',
      session: card.session,
      picks: card.picks.join(','),
      ...(card.by ? { by: card.by } : {}),
    };
  }
  return {
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

  if (search.share === 'picks') {
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
    return { variant: 'picks', session, picks, by };
  }

  if (search.share === 'score') {
    const points = Number(search.points);
    if (!Number.isInteger(points) || points < 0 || points > 999) {
      return null;
    }
    return { variant: 'score', points, final: search.final === '1', by };
  }

  return null;
}
