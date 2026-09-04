/**
 * The complete custom event vocabulary shared by web and mobile.
 *
 * Keeping this finite makes misspelled events a compile error instead of a
 * permanently fragmented row in PostHog. Add new names here as part of the
 * same change that introduces their call site and dashboard definition.
 */
export const analyticsEventNames = [
  'admin_h2h_results_reply_copied',
  'admin_practice_social_copy_copied',
  'admin_results_publish_failed',
  'admin_results_published',
  'admin_results_shared_x',
  'admin_social_card_downloaded',
  'auth_completed',
  'auth_failed',
  'auth_started',
  'checkout_closed',
  'checkout_loaded',
  'checkout_open_failed',
  'checkout_opened',
  'checkout_redirected',
  'checkout_start_failed',
  'checkout_started',
  'checkout_ui_completed',
  'feed_event_opened',
  'feed_event_reaction_added',
  'feed_event_reaction_changed',
  'feed_event_reaction_removed',
  'feed_loaded',
  'feed_paginated',
  'feedback_widget_opened',
  'feedback_widget_submit_failed',
  'feedback_widget_submitted',
  'h2h_duel_edited',
  'h2h_duel_selected',
  'h2h_editor_opened',
  'h2h_picks_completed',
  'h2h_prediction_draft_discarded',
  'h2h_prediction_signin_prompted',
  'h2h_sequence_completed',
  'h2h_sequence_started',
  'h2h_picks_shared_x',
  'h2h_score_shared_x',
  'landing_auth_completed',
  'landing_auth_started',
  'landing_first_h2h_pick_added',
  'landing_first_pick_added',
  'landing_global_leaderboard_clicked',
  'landing_h2h_completed',
  'landing_hero_cta_clicked',
  'landing_league_cta_clicked',
  'landing_picker_step_changed',
  'landing_picker_viewed',
  'landing_picks_started_over',
  'landing_prediction_card_save_started',
  'landing_prediction_saved',
  'landing_save_wall_viewed',
  'landing_scoring_rules_clicked',
  'landing_top5_to_h2h_handoff_completed',
  'landing_top5_to_h2h_handoff_started',
  'landing_top_five_completed',
  'landing_top_five_handoff_viewed',
  'leaderboard_filter_changed',
  'leaderboard_player_opened',
  'league_create_failed',
  'league_created',
  'league_invite_copied',
  'league_invite_shared_x',
  'league_join_failed',
  'league_joined',
  'leagues_web_handoff_opened',
  'next_race_cta_clicked',
  'notification_marked_read',
  'notification_opened',
  'notification_setting_changed',
  'notifications_filter_changed',
  'notifications_load_more',
  'notifications_mark_all_read',
  'pending_pick_draft_recovered',
  'pending_pick_draft_recovery_failed',
  'picks_shared_x',
  'practice_results_page_viewed',
  'prediction_draft_discarded',
  'prediction_randomize_failed',
  'prediction_randomized',
  'prediction_save_failed',
  'prediction_saved',
  'prediction_signin_prompted',
  'public_header_cta_clicked',
  'purchase_completed',
  'push_permission_result',
  'push_pre_prompt_dismissed',
  'race_writeup_next_link_clicked',
  'score_share_opened',
  'score_shared_x',
  'screen_viewed',
  'session_results_button_pressed',
  'session_results_expanded',
  'session_results_modal_opened',
  'session_results_tab_selected',
  'settings_regional_updated',
  'top5_editor_opened',
  'top5_picks_completed',
  'user_followed',
  'user_unfollowed',
  'x_follow_prompt_completed',
] as const;

export type AnalyticsEventName =
  | (typeof analyticsEventNames)[number]
  | `$${string}`;

/** Canonical product outcomes shared by web, mobile, and PostHog insights. */
export const analyticsEvents = {
  predictionSaved: 'prediction_saved',
  predictionSaveFailed: 'prediction_save_failed',
  screenViewed: 'screen_viewed',
  purchaseCompleted: 'purchase_completed',
} as const satisfies Record<string, AnalyticsEventName>;

export type PredictionType = 'top5' | 'h2h';
export type PredictionScope = 'cascade' | 'session';

/**
 * Keep internal-account detection out of PostHog itself: the app sees the
 * Clerk email long enough to derive a boolean, but never sends the address.
 */
export function isInternalAnalyticsEmail(
  email: string | null | undefined,
): boolean {
  return email?.toLowerCase().endsWith('@barrymichaeldoyle.com') ?? false;
}

export type AnalyticsFailureReason =
  | 'locked'
  | 'unauthorized'
  | 'validation'
  | 'network'
  | 'rate_limited'
  | 'unknown';

/** Convert unstable provider/backend messages into bounded analytics values. */
export function analyticsFailureReason(error: unknown): AnalyticsFailureReason {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (/lock|deadline|closed/.test(message)) return 'locked';
  if (/unauthor|forbidden|sign[ -]?in|auth/.test(message))
    return 'unauthorized';
  if (/valid|invalid|required|must |cannot|can't/.test(message)) {
    return 'validation';
  }
  if (/rate|too many|429/.test(message)) return 'rate_limited';
  if (/network|fetch|offline|timeout|timed out|connection/.test(message)) {
    return 'network';
  }
  return 'unknown';
}
