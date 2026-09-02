/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as announcements from "../announcements.js";
import type * as billing from "../billing.js";
import type * as creatorPolls from "../creatorPolls.js";
import type * as crons from "../crons.js";
import type * as drivers from "../drivers.js";
import type * as emails_H2HReminderEmail from "../emails/H2HReminderEmail.js";
import type * as emails_PredictionReminderEmail from "../emails/PredictionReminderEmail.js";
import type * as emails_SessionResultsPostRaceMadePredictionsEmail from "../emails/SessionResultsPostRaceMadePredictionsEmail.js";
import type * as emails_SessionResultsPostRaceMissedPredictionsEmail from "../emails/SessionResultsPostRaceMissedPredictionsEmail.js";
import type * as emails_SessionResultsPostRaceMissingH2HPredictionsEmail from "../emails/SessionResultsPostRaceMissingH2HPredictionsEmail.js";
import type * as emails_SessionResultsPreRaceMadePredictionsEmail from "../emails/SessionResultsPreRaceMadePredictionsEmail.js";
import type * as emails_SessionResultsPreRaceMissedPredictionsEmail from "../emails/SessionResultsPreRaceMissedPredictionsEmail.js";
import type * as emails_SessionResultsPreRaceMissingH2HPredictionsEmail from "../emails/SessionResultsPreRaceMissingH2HPredictionsEmail.js";
import type * as emails_SignupNudgeEmail from "../emails/SignupNudgeEmail.js";
import type * as emails_fonts from "../emails/fonts.js";
import type * as emails_sendReminderEmails from "../emails/sendReminderEmails.js";
import type * as emails_sendResultEmails from "../emails/sendResultEmails.js";
import type * as emails_sendSupportEmail from "../emails/sendSupportEmail.js";
import type * as emails_urls from "../emails/urls.js";
import type * as f1Standings from "../f1Standings.js";
import type * as feed from "../feed.js";
import type * as follows from "../follows.js";
import type * as h2h from "../h2h.js";
import type * as home from "../home.js";
import type * as inAppNotifications from "../inAppNotifications.js";
import type * as indexNow from "../indexNow.js";
import type * as leaderboards from "../leaderboards.js";
import type * as leagues from "../leagues.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_classificationDiff from "../lib/classificationDiff.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_entitlements from "../lib/entitlements.js";
import type * as lib_followCounts from "../lib/followCounts.js";
import type * as lib_italy2026MonzaNewsCopy from "../lib/italy2026MonzaNewsCopy.js";
import type * as lib_leaderboard from "../lib/leaderboard.js";
import type * as lib_leaguePassword from "../lib/leaguePassword.js";
import type * as lib_lineups from "../lib/lineups.js";
import type * as lib_notificationChannels from "../lib/notificationChannels.js";
import type * as lib_raceNewsWriteUpImage from "../lib/raceNewsWriteUpImage.js";
import type * as lib_raceTimezones from "../lib/raceTimezones.js";
import type * as lib_reactions from "../lib/reactions.js";
import type * as lib_recheckSchedule from "../lib/recheckSchedule.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_season from "../lib/season.js";
import type * as lib_standings from "../lib/standings.js";
import type * as lib_teammateBattles from "../lib/teammateBattles.js";
import type * as lib_testing_scenarioDefinitions from "../lib/testing/scenarioDefinitions.js";
import type * as lib_userIdentity from "../lib/userIdentity.js";
import type * as lib_weather from "../lib/weather.js";
import type * as lib_weekendCapabilities from "../lib/weekendCapabilities.js";
import type * as liveScoring from "../liveScoring.js";
import type * as notifications from "../notifications.js";
import type * as openF1Results from "../openF1Results.js";
import type * as practiceResults from "../practiceResults.js";
import type * as predictions from "../predictions.js";
import type * as push from "../push.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as raceNews from "../raceNews.js";
import type * as raceNewsMigrations from "../raceNewsMigrations.js";
import type * as raceScheduleMigrations from "../raceScheduleMigrations.js";
import type * as races from "../races.js";
import type * as reactionMigrations from "../reactionMigrations.js";
import type * as results from "../results.js";
import type * as resultsRecheck from "../resultsRecheck.js";
import type * as seed from "../seed.js";
import type * as support from "../support.js";
import type * as testing from "../testing.js";
import type * as testingScenarios from "../testingScenarios.js";
import type * as users from "../users.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  announcements: typeof announcements;
  billing: typeof billing;
  creatorPolls: typeof creatorPolls;
  crons: typeof crons;
  drivers: typeof drivers;
  "emails/H2HReminderEmail": typeof emails_H2HReminderEmail;
  "emails/PredictionReminderEmail": typeof emails_PredictionReminderEmail;
  "emails/SessionResultsPostRaceMadePredictionsEmail": typeof emails_SessionResultsPostRaceMadePredictionsEmail;
  "emails/SessionResultsPostRaceMissedPredictionsEmail": typeof emails_SessionResultsPostRaceMissedPredictionsEmail;
  "emails/SessionResultsPostRaceMissingH2HPredictionsEmail": typeof emails_SessionResultsPostRaceMissingH2HPredictionsEmail;
  "emails/SessionResultsPreRaceMadePredictionsEmail": typeof emails_SessionResultsPreRaceMadePredictionsEmail;
  "emails/SessionResultsPreRaceMissedPredictionsEmail": typeof emails_SessionResultsPreRaceMissedPredictionsEmail;
  "emails/SessionResultsPreRaceMissingH2HPredictionsEmail": typeof emails_SessionResultsPreRaceMissingH2HPredictionsEmail;
  "emails/SignupNudgeEmail": typeof emails_SignupNudgeEmail;
  "emails/fonts": typeof emails_fonts;
  "emails/sendReminderEmails": typeof emails_sendReminderEmails;
  "emails/sendResultEmails": typeof emails_sendResultEmails;
  "emails/sendSupportEmail": typeof emails_sendSupportEmail;
  "emails/urls": typeof emails_urls;
  f1Standings: typeof f1Standings;
  feed: typeof feed;
  follows: typeof follows;
  h2h: typeof h2h;
  home: typeof home;
  inAppNotifications: typeof inAppNotifications;
  indexNow: typeof indexNow;
  leaderboards: typeof leaderboards;
  leagues: typeof leagues;
  "lib/auth": typeof lib_auth;
  "lib/classificationDiff": typeof lib_classificationDiff;
  "lib/email": typeof lib_email;
  "lib/entitlements": typeof lib_entitlements;
  "lib/followCounts": typeof lib_followCounts;
  "lib/italy2026MonzaNewsCopy": typeof lib_italy2026MonzaNewsCopy;
  "lib/leaderboard": typeof lib_leaderboard;
  "lib/leaguePassword": typeof lib_leaguePassword;
  "lib/lineups": typeof lib_lineups;
  "lib/notificationChannels": typeof lib_notificationChannels;
  "lib/raceNewsWriteUpImage": typeof lib_raceNewsWriteUpImage;
  "lib/raceTimezones": typeof lib_raceTimezones;
  "lib/reactions": typeof lib_reactions;
  "lib/recheckSchedule": typeof lib_recheckSchedule;
  "lib/scoring": typeof lib_scoring;
  "lib/season": typeof lib_season;
  "lib/standings": typeof lib_standings;
  "lib/teammateBattles": typeof lib_teammateBattles;
  "lib/testing/scenarioDefinitions": typeof lib_testing_scenarioDefinitions;
  "lib/userIdentity": typeof lib_userIdentity;
  "lib/weather": typeof lib_weather;
  "lib/weekendCapabilities": typeof lib_weekendCapabilities;
  liveScoring: typeof liveScoring;
  notifications: typeof notifications;
  openF1Results: typeof openF1Results;
  practiceResults: typeof practiceResults;
  predictions: typeof predictions;
  push: typeof push;
  pushNotifications: typeof pushNotifications;
  raceNews: typeof raceNews;
  raceNewsMigrations: typeof raceNewsMigrations;
  raceScheduleMigrations: typeof raceScheduleMigrations;
  races: typeof races;
  reactionMigrations: typeof reactionMigrations;
  results: typeof results;
  resultsRecheck: typeof resultsRecheck;
  seed: typeof seed;
  support: typeof support;
  testing: typeof testing;
  testingScenarios: typeof testingScenarios;
  users: typeof users;
  weather: typeof weather;
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
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
