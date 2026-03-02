'use node';

import { render } from '@react-email/render';
import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';
import type { PredictionReminderProps } from './PredictionReminderEmail';
import { PredictionReminderEmail } from './PredictionReminderEmail';

function formatSessionTime(
  epochMs: number,
  locale = 'en-GB',
  timeZone = 'UTC',
): { date: string; time: string } {
  const dt = new Date(epochMs);
  const date = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(dt);
  const time = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(dt);
  return { date, time };
}

export const sendBatch = internalAction({
  args: {
    recipients: v.array(
      v.object({
        email: v.string(),
        timezone: v.optional(v.string()),
        locale: v.optional(v.string()),
      }),
    ),
    raceName: v.string(),
    timeUntilLock: v.string(),
    raceId: v.string(),
    raceSlug: v.string(),
    sessions: v.array(
      v.object({
        label: v.string(),
        startAt: v.number(),
        isSprint: v.boolean(),
      }),
    ),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    hasSprint: v.boolean(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    // Group recipients by timezone/locale combo to avoid re-rendering
    const groups = new Map<
      string,
      { locale: string; timezone: string; emails: Array<string> }
    >();
    for (const r of args.recipients) {
      const tz = r.timezone ?? 'UTC';
      const loc = r.locale ?? 'en-GB';
      const key = `${tz}|${loc}`;
      const group = groups.get(key);
      if (group) {
        group.emails.push(r.email);
      } else {
        groups.set(key, { locale: loc, timezone: tz, emails: [r.email] });
      }
    }

    let sent = 0;
    let failed = 0;

    for (const { locale, timezone, emails } of groups.values()) {
      const sessionSchedule = args.sessions.map((s) => {
        const { date, time } = formatSessionTime(s.startAt, locale, timezone);
        return { label: s.label, date, time, isSprint: s.isSprint };
      });

      const props: PredictionReminderProps = {
        raceName: args.raceName,
        timeUntilLock: args.timeUntilLock,
        raceUrl: `${appUrl}/races/${args.raceId}?utm_source=email&utm_medium=email&utm_campaign=prediction_reminder`,
        settingsUrl: `${appUrl}/settings`,
        logoUrl: `${appUrl}/logo-email.png`,
        sessions: sessionSchedule,
        round: args.round,
        countryCode: args.countryCode,
        hasSprint: args.hasSprint,
      };

      const html = await render(PredictionReminderEmail(props));

      for (const email of emails) {
        try {
          await resend.sendEmail(ctx, {
            from: fromAddress,
            to: email,
            subject: `Your ${args.raceName} picks close in ${args.timeUntilLock === '24 hours' ? '24h' : args.timeUntilLock}`,
            html,
          });
          sent++;
        } catch (e) {
          console.error(`Failed to send reminder to ${email}:`, e);
          failed++;
        }
      }
    }

    return { sent, failed };
  },
});

export const sendH2HNudge = internalAction({
  args: {
    email: v.string(),
    raceName: v.string(),
    racePath: v.string(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';
    const raceUrl = `${appUrl}${args.racePath}?utm_source=email&utm_medium=email&utm_campaign=h2h_nudge`;
    const settingsUrl = `${appUrl}/settings`;

    const html = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <h2 style="margin: 0 0 12px; font-size: 22px;">Finish your H2H picks</h2>
        <p style="margin: 0 0 12px; color: #334155; line-height: 1.5;">
          Nice work — you submitted your Top 5 predictions for <strong>${args.raceName}</strong>.
        </p>
        <p style="margin: 0 0 20px; color: #334155; line-height: 1.5;">
          You still have teammate head-to-head picks left. Complete them now to avoid missing points.
        </p>
        <a href="${raceUrl}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">Complete H2H Picks</a>
        <p style="margin: 20px 0 0; color: #64748b; font-size: 13px;">
          Manage reminders in <a href="${settingsUrl}" style="color:#0d9488;">Settings</a>.
        </p>
      </div>
    `;

    try {
      await resend.sendEmail(ctx, {
        from: fromAddress,
        to: args.email,
        subject: `Finish your H2H picks for ${args.raceName}`,
        html,
      });
      return { sent: 1, failed: 0 };
    } catch (e) {
      console.error(`Failed to send H2H nudge to ${args.email}:`, e);
      return { sent: 0, failed: 1 };
    }
  },
});
