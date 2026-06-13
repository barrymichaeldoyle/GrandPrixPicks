import { CheckCircle2, Clock, Radio } from 'lucide-react';

import { getWeekendSessionStarts } from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { useUserDateFormat } from '@/lib/useUserDateFormat';

export type SessionEntry = {
  type: SessionType;
  label: string;
  startAt: number;
};

export function buildSessions(
  race: Parameters<typeof getWeekendSessionStarts>[0],
): SessionEntry[] {
  return getWeekendSessionStarts(race).map((entry) => ({
    ...entry,
    label: SESSION_LABELS[entry.type],
  }));
}

export type SessionStatus = 'finished' | 'in_progress' | 'upcoming';

export function getSessionStatus(
  session: SessionEntry,
  publishedSessions: SessionType[],
  now: number,
): SessionStatus {
  if (publishedSessions.includes(session.type)) {
    return 'finished';
  }
  if (session.startAt <= now) {
    return 'in_progress';
  }
  return 'upcoming';
}

export function groupSessionsByDay(
  sessions: SessionEntry[],
): Array<{ dayKey: string; dayLabel: string; sessions: SessionEntry[] }> {
  const groups = new Map<
    string,
    { dayLabel: string; sessions: SessionEntry[] }
  >();
  for (const session of sessions) {
    const d = new Date(session.startAt);
    const dayKey = d.toDateString();
    const dayLabel = d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { dayLabel, sessions: [] });
    }
    groups.get(dayKey)!.sessions.push(session);
  }
  return Array.from(groups.entries()).map(([dayKey, data]) => ({
    dayKey,
    ...data,
  }));
}

export function SessionRow({
  session,
  status,
  isNext,
}: {
  session: SessionEntry;
  status: SessionStatus;
  isNext: boolean;
}) {
  const { formatTime } = useUserDateFormat();
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${
        isNext
          ? '-ml-3 border-l-2 border-accent pl-3'
          : 'border-l-2 border-transparent'
      }`}
    >
      <span className="w-4 shrink-0">
        {status === 'finished' && (
          <CheckCircle2
            className="h-4 w-4 text-success"
            aria-label="Finished"
          />
        )}
        {status === 'in_progress' && (
          <Radio
            className="h-4 w-4 animate-pulse text-accent"
            aria-label="In progress"
          />
        )}
        {status === 'upcoming' && (
          <Clock
            className={`h-4 w-4 ${isNext ? 'text-accent' : 'text-text-muted/35'}`}
            aria-label="Upcoming"
          />
        )}
      </span>

      <span
        className={`flex-1 text-sm font-medium ${
          status === 'finished' ? 'text-text-muted' : 'text-text'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{session.label}</span>
          {status === 'in_progress' && (
            <span className="inline-flex items-center rounded-full border border-cyan-400/45 bg-cyan-400/18 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
              Live
            </span>
          )}
        </span>
      </span>

      <span
        className={`shrink-0 text-sm tabular-nums ${
          status === 'finished'
            ? 'text-text-muted/45'
            : status === 'in_progress' || isNext
              ? 'font-semibold text-accent'
              : 'text-text-muted'
        }`}
        suppressHydrationWarning
      >
        {formatTime(session.startAt)}
      </span>
    </div>
  );
}
