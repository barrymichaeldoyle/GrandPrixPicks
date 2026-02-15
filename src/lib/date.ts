/**
 * Shared date/time formatting for race and prediction UI.
 */

import { useEffect, useState } from 'react';

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateLong(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Human-readable countdown (e.g. "23d 03h 05m 09s" or "02h 30m 15s"). */
function getTimeUntil(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) {
    return 'Started';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/** Live countdown that ticks every second. */
export function useCountdown(timestamp: number): string {
  const [label, setLabel] = useState(() => getTimeUntil(timestamp));

  useEffect(() => {
    const tick = () => setLabel(getTimeUntil(timestamp));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}
