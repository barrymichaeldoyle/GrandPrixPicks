import { SESSION_LABELS_FULL } from '@/lib/sessions';
import type { FeedEvent, ScoredPick } from './types';
export { formatRelativeTime } from '@grandprixpicks/shared/dates';

export const SESSION_LABELS: Record<string, string> = SESSION_LABELS_FULL;

export function getScoreComment(
  points: number,
  picks: ScoredPick[] | undefined,
): string {
  if (picks && picks.length > 0) {
    const exact = picks.filter((p) => p.points === 5);
    const near = picks.filter((p) => p.points === 3);
    const inTop5 = picks.filter((p) => p.points === 1);
    const missed = picks.filter((p) => p.points === 0);

    if (exact.length === 5) {
      return 'All five called perfectly.';
    }
    if (exact.length === 4) {
      return 'Four exact calls. Nearly flawless.';
    }
    if (exact.length === 3) {
      return 'Three spot-on predictions.';
    }
    if (exact.length === 2) {
      return `P${exact[0].predictedPosition} and P${exact[1].predictedPosition} nailed.`;
    }
    if (exact.length === 1 && near.length + inTop5.length === 4) {
      return `P${exact[0].predictedPosition} perfect, rest in the points.`;
    }
    if (exact.length === 1) {
      return `P${exact[0].predictedPosition} called correctly.`;
    }
    if (missed.length === 5) {
      return 'Not a single top-5 pick landed.';
    }
    if (exact.length === 0 && missed.length === 0 && near.length === 0) {
      return 'All five in the top 5, just the wrong order.';
    }
    if (exact.length === 0 && missed.length === 0) {
      return 'Every pick scored, nothing spot on though.';
    }
    if (near.length >= 3) {
      return `${near.length} picks just one spot off.`;
    }
    if (missed.length >= 4) {
      return 'Hard to predict this one.';
    }
    if (near.length >= 2) {
      return `${near.length} picks one position away.`;
    }
    return points >= 15 ? 'Solid read on the session.' : 'Mixed results.';
  }

  // Fallback when no breakdown available
  if (points === 25) {
    return 'Perfect score.';
  }
  if (points >= 20) {
    return 'Excellent session.';
  }
  if (points >= 15) {
    return 'Solid picks.';
  }
  if (points >= 10) {
    return 'Getting there.';
  }
  if (points >= 5) {
    return 'Tough session.';
  }
  return 'Better luck next time.';
}

export function eventTotalPoints(event: FeedEvent): number {
  return (event.points ?? 0) + (event.h2hScore?.points ?? 0);
}
