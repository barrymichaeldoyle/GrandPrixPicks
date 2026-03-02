/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as billing from "../billing.js";
import type * as drivers from "../drivers.js";
import type * as emails_PredictionReminderEmail from "../emails/PredictionReminderEmail.js";
import type * as emails_ResultsEmail from "../emails/ResultsEmail.js";
import type * as emails_sendReminderEmails from "../emails/sendReminderEmails.js";
import type * as emails_sendResultEmails from "../emails/sendResultEmails.js";
import type * as follows from "../follows.js";
import type * as h2h from "../h2h.js";
import type * as leaderboards from "../leaderboards.js";
import type * as leagues from "../leagues.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_leaderboard from "../lib/leaderboard.js";
import type * as lib_notificationChannels from "../lib/notificationChannels.js";
import type * as lib_raceTimezones from "../lib/raceTimezones.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_standings from "../lib/standings.js";
import type * as notifications from "../notifications.js";
import type * as predictions from "../predictions.js";
import type * as push from "../push.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as races from "../races.js";
import type * as results from "../results.js";
import type * as seed from "../seed.js";
import type * as support from "../support.js";
import type * as testing from "../testing.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  billing: typeof billing;
  drivers: typeof drivers;
  "emails/PredictionReminderEmail": typeof emails_PredictionReminderEmail;
  "emails/ResultsEmail": typeof emails_ResultsEmail;
  "emails/sendReminderEmails": typeof emails_sendReminderEmails;
  "emails/sendResultEmails": typeof emails_sendResultEmails;
  follows: typeof follows;
  h2h: typeof h2h;
  leaderboards: typeof leaderboards;
  leagues: typeof leagues;
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/leaderboard": typeof lib_leaderboard;
  "lib/notificationChannels": typeof lib_notificationChannels;
  "lib/raceTimezones": typeof lib_raceTimezones;
  "lib/scoring": typeof lib_scoring;
  "lib/standings": typeof lib_standings;
  notifications: typeof notifications;
  predictions: typeof predictions;
  push: typeof push;
  pushNotifications: typeof pushNotifications;
  races: typeof races;
  results: typeof results;
  seed: typeof seed;
  support: typeof support;
  testing: typeof testing;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      createManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          replyTo?: Array<string>;
          subject: string;
          to: Array<string> | string;
        },
        string
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bcc?: Array<string>;
          bounced?: boolean;
          cc?: Array<string>;
          clicked?: boolean;
          complained: boolean;
          createdAt: number;
          deliveryDelayed?: boolean;
          errorMessage?: string;
          failed?: boolean;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          bounced: boolean;
          clicked: boolean;
          complained: boolean;
          deliveryDelayed: boolean;
          errorMessage: string | null;
          failed: boolean;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          bcc?: Array<string>;
          cc?: Array<string>;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject?: string;
          template?: {
            id: string;
            variables?: Record<string, string | number>;
          };
          text?: string;
          to: Array<string>;
        },
        string
      >;
      updateManualEmail: FunctionReference<
        "mutation",
        "internal",
        {
          emailId: string;
          errorMessage?: string;
          resendId?: string;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        },
        null
      >;
    };
  };
};
