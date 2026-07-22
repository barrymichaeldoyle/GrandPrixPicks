export const playerCountFormatter = new Intl.NumberFormat('en-US');

export const PAGE_SIZE = 50;

export function formatAccuracy(correct: number, total: number): string {
  if (total <= 0) {
    return '—';
  }

  const percentage = (correct / total) * 100;
  return `${percentage.toLocaleString('en-US', {
    maximumFractionDigits: percentage % 1 === 0 ? 0 : 1,
  })}%`;
}
