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

const payload = v.union(
  v.object({
    kind: v.literal('reminder'),
    raceName: v.string(),
    raceUrl: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    lockAt: v.number(),
    sessions: v.array(sessionRow),
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
    top5Points: v.number(),
    h2hPoints: v.number(),
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

export type DeliverPayload = Infer<typeof payload>;

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
        subject = `${args.payload.raceName}: your picks lock in ${timeUntilLock}`;
        lines = [
          `Predictions for the ${args.payload.raceName} lock in ${timeUntilLock}.`,
          '',
          ...sessions.map((s) => `${s.label}: ${s.date}, ${s.time}`),
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
        const { top5Points, h2hPoints, raceName } = args.payload;
        const total = top5Points + h2hPoints;
        const intro = `Top 5: ${top5Points} points. Head-to-head: ${h2hPoints} points.`;
        subject = `${raceName}: you scored ${total} points`;
        lines = [`You scored ${total} points at the ${raceName}.`, intro];
        body = (
          <ResultsEmailShell
            {...shared}
            previewText={`You scored ${total} points at the ${raceName}.`}
            headline={`You scored ${total} points`}
            intro={intro}
            raceName={raceName}
            raceUrl={args.payload.raceUrl}
            round={args.payload.round}
            countryCode={args.payload.countryCode}
            primaryCtaLabel="See Weekend Standings"
            footerText="You're receiving this because you have result notifications enabled."
          />
        );
      }

      await sendEmail(ctx, {
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
