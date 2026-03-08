/**
 * Shared date/time formatting for race and prediction UI.
 */

import { useEffect, useState } from 'react';

type DateLike = number | string | Date;

function toDateInput(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDateLong(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthDay(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleString();
}

export function formatCalendarDate(timestamp: DateLike): string {
  return toDateInput(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatInTimeZone(
  timestamp: DateLike,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      ...options,
      timeZone,
    }).format(toDateInput(timestamp));
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(
      toDateInput(timestamp),
    );
  }
}

/** Human-readable countdown (e.g. "23d 3h 5m 9s" or "2h 30m 15s"). */
function getTimeUntil(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff <= 0) {
    return 'Started';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}

/** Live countdown that ticks every second. */
export function useCountdown(timestamp: number): string {
  const [label, setLabel] = useState(() => getTimeUntil(timestamp));

  useEffect(() => {
    function tick() {
      setLabel(getTimeUntil(timestamp));
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}
