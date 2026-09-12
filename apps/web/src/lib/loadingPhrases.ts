import { useState } from 'react';

/**
 * What the sign-in curtains say while they are up.
 *
 * The curtain covers a wait nobody asked for, and "Loading your dashboard"
 * narrates the software rather than the sport. These are pit-lane jobs instead:
 * each one is something a crew is busy doing in the minutes before a car goes
 * out, which is exactly the shape of this wait.
 *
 * Rules for anything added here:
 *
 * - A job in progress, not a moment ("Changing tyres", never "Lights out").
 * - True of a 2026 car. No refuelling (banned since 2010) and no DRS (gone for
 *   2026 — it is straight mode and Overtake now), so a line about either dates
 *   the site to a fan who would notice.
 * - Short enough to hold one line at 320px, which is roughly 28 characters.
 *
 * "Signing you in" is deliberately NOT in this list. It is the one curtain that
 * reports a real thing the system is doing to your account, and a person
 * watching an auth redirect should be told that, not entertained.
 */
export const PIT_LANE_LOADING_PHRASES = [
  'Revving engines',
  'Preparing for lights out',
  'Changing tyres',
  'Changing the front wing',
  'Warming the tyres',
  'Warming the brakes',
  'Bolting on a new set of softs',
  'Checking tyre pressures',
  'Torquing the wheel nuts',
  'Charging the battery',
  'Running the formation lap',
  'Clearing the grid',
  'Waving you out of the pit lane',
  'Taking the covers off',
] as const;

export type PitLaneLoadingPhrase = (typeof PIT_LANE_LOADING_PHRASES)[number];

/** One line at random. Exported for the test; call {@link useLoadingPhrase}. */
export function pickLoadingPhrase(): PitLaneLoadingPhrase {
  const index = Math.floor(Math.random() * PIT_LANE_LOADING_PHRASES.length);
  return PIT_LANE_LOADING_PHRASES[index] ?? PIT_LANE_LOADING_PHRASES[0];
}

/**
 * A phrase that holds still for as long as the curtain is up.
 *
 * Picked in a state initialiser rather than during render, because the label
 * sits in a component that re-renders while it waits — auth resolving, a chunk
 * arriving — and a line that changes under a reader mid-wait reads as a glitch.
 *
 * The server and the client pick independently, so the two disagree on a
 * hydrated load. That is what `suppressHydrationWarning` is for at the call
 * sites: React keeps the server's line, which is already random, and the
 * mismatch is a different phrase rather than a wrong one.
 */
export function useLoadingPhrase(): PitLaneLoadingPhrase {
  const [phrase] = useState(pickLoadingPhrase);
  return phrase;
}
