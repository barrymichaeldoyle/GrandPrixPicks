'use node';

import { type Infer, v } from 'convex/values';
import type { ReactElement } from 'react';
import { render } from 'react-email';

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { sendEmail } from '../lib/email';
import { PredictionReminderEmail } from './PredictionReminderEmail';
import { ResultsEmailShell } from './ResultsEmail.shared';
import { SignupNudgeEmail } from './SignupNudgeEmail';

/**
 * Renders and sends one notification email.
 *
 * This is a Node action because React Email's `render` needs `react-dom/server`,
 * which the default Convex runtime does not provide. Everything that decides
 * *whether* to send lives in `notificationEmails.send`, which is a mutation and
 * therefore transactional: it flips the job to `accepted` and schedules this
 * action in the same commit, so a job is handed to Resend exactly once. The
 * `idempotencyKey` covers the remaining case, where the action itself is
 * retried after an ambiguous failure.
 */

const sessionRow = v.object({
  label: v.string(),
  startAt: v.number(),
  isSprint: v.boolean(),
});

/**
 * What a reminder leads with for someone who sat out the last round.
 *
 * Four weeks of "your picks lock in 3 days" reached every lapsed newcomer on
 * prod and brought none of them back, so for them the deadline goes second and
 * the weekend's news goes first. `lastPlayed` is the hook that this is a game
 * they are already in, not a sign-up pitch.
 */
const lapsedLead = v.object({
  headline: v.union(v.string(), v.null()),
  sourceName: v.union(v.string(), v.null()),
  writeupUrl: v.union(v.string(), v.null()),
  lastPlayed: v.union(
    v.object({
      raceName: v.string(),
      points: v.number(),
      position: v.union(v.number(), v.null()),
      totalPlayers: v.union(v.number(), v.null()),
    }),
    v.null(),
  ),
});

const nextRace = v.union(
  v.object({ name: v.string(), raceUrl: v.string(), lockAt: v.number() }),
  v.null(),
);

const payload = v.union(
  /**
   * The results mail for a player who has scored this season but sat this
   * weekend out. Without it a lapsed player never saw a result again, only
   * deadlines. The body is spoiler-free and names the race.
   */
  v.object({
    kind: v.literal('recap'),
    raceName: v.string(),
    raceUrl: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    // Optional because jobs already scheduled before spoiler-free emails
    // still carry them. New jobs omit them; do not put them in the body.
    podium: v.optional(v.array(v.string())),
    weekendWinner: v.optional(
      v.union(v.object({ name: v.string(), points: v.number() }), v.null()),
    ),
    nextRace,
  }),
  v.object({
    kind: v.literal('reminder'),
    raceName: v.string(),
    raceUrl: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    lockAt: v.number(),
    sessions: v.array(sessionRow),
    lapsed: v.optional(lapsedLead),
  }),
  v.object({
    kind: v.literal('signup'),
    raceName: v.union(v.string(), v.null()),
    raceUrl: v.string(),
  }),
  v.object({
    kind: v.literal('summary'),
    raceName: v.string(),
    raceUrl: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    // Optional because jobs already scheduled before spoiler-free emails
    // still carry scores, rank and best pick. New jobs omit them; do not
    // put them in the body.
    top5Points: v.optional(v.number()),
    h2hPoints: v.optional(v.number()),
    weekendRank: v.optional(
      v.union(
        v.object({ position: v.number(), totalPlayers: v.number() }),
        v.null(),
      ),
    ),
    bestPick: v.optional(
      v.union(
        v.object({
          driverName: v.string(),
          predictedPosition: v.number(),
          actualPosition: v.union(v.number(), v.null()),
          points: v.number(),
          sessionLabel: v.string(),
        }),
        v.null(),
      ),
    ),
    nextRace: v.optional(nextRace),
  }),
);

/**
 * A stored timezone is whatever the browser reported at sign-up, so it can be
 * absent or stale enough that `Intl` rejects it. A reminder that fails to
 * render is a reminder nobody gets, so an unusable zone falls back to UTC
 * rather than throwing.
 */
function safeTimeZone(timezone: string | undefined): string {
  if (!timezone) {
    return 'UTC';
  }
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(0);
    return timezone;
  } catch {
    return 'UTC';
  }
}

export function formatSessionSchedule(
  sessions: Array<{ label: string; startAt: number; isSprint: boolean }>,
  timezone: string | undefined,
) {
  const timeZone = safeTimeZone(timezone);
  // Assembled from parts rather than taken whole: a locale's own shape for
  // this combination is not stable across ICU versions (en-GB currently gives
  // "Sun 27 Sept"), and these strings sit in a fixed-width schedule column.
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  return sessions.map((session) => {
    const parts = new Map(
      day
        .formatToParts(session.startAt)
        .map((part) => [part.type, part.value] as const),
    );
    return {
      label: session.label,
      date: `${parts.get('weekday')}, ${parts.get('day')} ${parts.get('month')}`,
      time: clock.format(session.startAt),
      isSprint: session.isSprint,
    };
  });
}

/** Whole units only: an email read hours after it was sent should not look precise. */
export function formatTimeUntil(ms: number): string {
  const hours = Math.round(ms / 3600000);
  if (hours >= 48) {
    const days = Math.round(hours / 24);
    return `${days} days`;
  }
  if (hours >= 2) {
    return `${hours} hours`;
  }
  const minutes = Math.max(1, Math.round(ms / 60000));
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export type ResultsMailCopy = {
  subject: string;
  previewText: string;
  headline: string;
  intro: string;
  primaryCtaLabel: string;
};

/** Subject, preview and body for a player who scored this weekend. */
export function summaryEmailCopy(raceName: string): ResultsMailCopy {
  const headline = `Your ${raceName} results are ready`;
  return {
    subject: headline,
    previewText: "Scores are in. Open the site when you've watched the race.",
    headline,
    intro:
      "This email doesn't include any results, so it's safe to open before you've watched.",
    primaryCtaLabel: 'View my results',
  };
}

/** Subject, preview and body for a player who sat this weekend out. */
export function recapEmailCopy(raceName: string): ResultsMailCopy {
  const headline = `The ${raceName} is done and scored`;
  const intro = 'See who topped the weekend board on the site.';
  return {
    subject: headline,
    previewText: intro,
    headline,
    intro,
    primaryCtaLabel: 'See weekend standings',
  };
}

/** "Next: Mexican Grand Prix. Picks lock Sat, 31 Oct, 21:00 UTC." */
export function nextRaceLine(
  next: { name: string; lockAt: number } | null | undefined,
  timezone: string | undefined,
): string | undefined {
  if (!next) {
    return undefined;
  }
  const [lock] = formatSessionSchedule(
    [{ label: 'Lock', startAt: next.lockAt, isSprint: false }],
    timezone,
  );
  return `Next: ${next.name}. Picks lock ${lock.date}, ${lock.time}.`;
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`;
  }
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** "Last time out: Italian Grand Prix, 31 points, 5th of 14." */
export function lastPlayedLine(last: {
  raceName: string;
  points: number;
  position: number | null;
  totalPlayers: number | null;
}): string {
  const rank =
    last.position !== null && last.totalPlayers !== null
      ? `, ${ordinal(last.position)} of ${last.totalPlayers}`
      : '';
  return `Last time out: ${last.raceName}, ${last.points} points${rank}.`;
}

export type DeliverPayload = Infer<typeof payload>;
export type LapsedLead = Infer<typeof lapsedLead>;

export const deliver = internalAction({
  args: {
    jobId: v.optional(v.id('notificationEmails')),
    to: v.string(),
    idempotencyKey: v.string(),
    unsubscribeUrl: v.string(),
    settingsUrl: v.string(),
    logoUrl: v.string(),
    timezone: v.optional(v.string()),
    payload,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const shared = {
        settingsUrl: args.settingsUrl,
        unsubscribeUrl: args.unsubscribeUrl,
        logoUrl: args.logoUrl,
      };
      let subject: string;
      let body: ReactElement;
      let lines: Array<string>;

      if (args.payload.kind === 'reminder') {
        const timeUntilLock = formatTimeUntil(args.payload.lockAt - Date.now());
        const sessions = formatSessionSchedule(
          args.payload.sessions,
          args.timezone,
        );
        const lapsed = args.payload.lapsed;
        const lastPlayed = lapsed?.lastPlayed
          ? lastPlayedLine(lapsed.lastPlayed)
          : null;
        // A lapsed reader has already ignored the deadline subject for weeks,
        // so theirs carries the story instead when there is one.
        subject =
          lapsed?.headline && lapsed.headline.length <= 80
            ? `${args.payload.raceName}: ${lapsed.headline}`
            : `${args.payload.raceName}: your picks lock in ${timeUntilLock}`;
        lines = [
          ...(lapsed?.headline ? [lapsed.headline, ''] : []),
          ...(lastPlayed ? [lastPlayed, ''] : []),
          `Predictions for the ${args.payload.raceName} lock in ${timeUntilLock}.`,
          '',
          ...sessions.map((s) => `${s.label}: ${s.date}, ${s.time}`),
          ...(lapsed?.writeupUrl ? ['', lapsed.writeupUrl] : []),
        ];
        body = (
          <PredictionReminderEmail
            {...shared}
            raceName={args.payload.raceName}
            raceUrl={args.payload.raceUrl}
            timeUntilLock={timeUntilLock}
            sessions={sessions}
            round={args.payload.round}
            countryCode={args.payload.countryCode}
            lead={
              lapsed?.headline
                ? {
                    headline: lapsed.headline,
                    sourceName: lapsed.sourceName,
                    writeupUrl: lapsed.writeupUrl,
                  }
                : undefined
            }
            lastPlayed={lastPlayed ?? undefined}
          />
        );
      } else if (args.payload.kind === 'recap') {
        const { raceName } = args.payload;
        const next = args.payload.nextRace;
        const copy = recapEmailCopy(raceName);
        const helperText = nextRaceLine(next, args.timezone);
        subject = copy.subject;
        lines = [
          copy.headline,
          copy.intro,
          ...(helperText ? ['', helperText, next!.raceUrl] : []),
        ];
        body = (
          <ResultsEmailShell
            {...shared}
            previewText={copy.previewText}
            headline={copy.headline}
            intro={copy.intro}
            raceName={raceName}
            raceUrl={args.payload.raceUrl}
            round={args.payload.round}
            countryCode={args.payload.countryCode}
            primaryCtaLabel={copy.primaryCtaLabel}
            secondaryCtaLabel={next ? `Make ${next.name} picks` : undefined}
            secondaryCtaUrl={next?.raceUrl}
            helperText={helperText}
            footerText="You're receiving this because you have result notifications enabled."
          />
        );
      } else if (args.payload.kind === 'signup') {
        subject = args.payload.raceName
          ? `Make your ${args.payload.raceName} picks`
          : 'Make your first picks';
        lines = [
          args.payload.raceName
            ? `Pick your top 5 for the ${args.payload.raceName} and start scoring this weekend.`
            : 'Pick your top 5 for the next race and start scoring.',
        ];
        body = (
          <SignupNudgeEmail
            {...shared}
            raceName={args.payload.raceName}
            raceUrl={args.payload.raceUrl}
          />
        );
      } else {
        const { raceName } = args.payload;
        const copy = summaryEmailCopy(raceName);
        const next = args.payload.nextRace;
        const helperText = nextRaceLine(next, args.timezone);
        subject = copy.subject;
        lines = [
          copy.headline,
          copy.intro,
          ...(helperText ? ['', helperText, next!.raceUrl] : []),
        ];
        body = (
          <ResultsEmailShell
            {...shared}
            previewText={copy.previewText}
            headline={copy.headline}
            intro={copy.intro}
            raceName={raceName}
            raceUrl={args.payload.raceUrl}
            round={args.payload.round}
            countryCode={args.payload.countryCode}
            primaryCtaLabel={copy.primaryCtaLabel}
            secondaryCtaLabel={next ? `Make ${next.name} picks` : undefined}
            secondaryCtaUrl={next?.raceUrl}
            helperText={helperText}
            footerText="You're receiving this because you have result notifications enabled."
          />
        );
      }

      const emailId = await sendEmail(ctx, {
        from:
          process.env.EMAIL_FROM ??
          'Grand Prix Picks <noreply@grandprixpicks.com>',
        to: args.to,
        subject,
        html: await render(body),
        text: [
          ...lines,
          '',
          args.payload.raceUrl,
          '',
          `Unsubscribe: ${args.unsubscribeUrl}`,
        ].join('\n'),
        headers: [
          { name: 'List-Unsubscribe', value: `<${args.unsubscribeUrl}>` },
          {
            name: 'List-Unsubscribe-Post',
            value: 'List-Unsubscribe=One-Click',
          },
        ],
        idempotencyKey: args.idempotencyKey,
      });
      if (args.jobId) {
        await ctx.runMutation(internal.notificationEmails.recordEmailId, {
          id: args.jobId,
          emailId,
        });
      }
    } catch (error) {
      // `send` already marked the job `accepted`, because scheduling this
      // action commits with that mutation. Only this side knows the render
      // or the handoff then failed, so report it back or the mail is lost
      // with the job still claiming success.
      if (args.jobId) {
        await ctx.runMutation(internal.notificationEmails.markDeliveryFailed, {
          id: args.jobId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    }
    return null;
  },
});
