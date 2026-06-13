/** Converts an ISO alpha-2 country code to its Unicode flag emoji. */
export function countryCodeToFlagEmoji(countryCode?: string | null) {
  const normalized = countryCode?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) {
    return '';
  }

  return String.fromCodePoint(
    ...[...normalized].map((character) => character.charCodeAt(0) + 127397),
  );
}

/** `#F1` plus the race-specific hashtag (e.g. `#MonacoGP`), space-joined. */
function formatRaceHashtags(raceHashtag?: string) {
  return ['#F1', raceHashtag].filter(Boolean).join(' ');
}

/** `P1 🇬🇧 NOR\nP2 ...` — one driver per line with its flag, in pick order. */
function formatPositionList(
  drivers: ReadonlyArray<{ code: string; nationality?: string | null }>,
) {
  return drivers
    .map((driver, index) => {
      const flag = countryCodeToFlagEmoji(driver.nationality);
      return `P${index + 1} ${flag ? `${flag} ` : ''}${driver.code}`;
    })
    .join('\n');
}

export function buildRaceResultShareText({
  raceName,
  sessionLabel,
  drivers,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  drivers: ReadonlyArray<{ code: string; nationality?: string | null }>;
  accountHandle: string;
  raceHashtag?: string;
}) {
  return `${raceName} ${sessionLabel} results 🏎️🏁\n\n${formatPositionList(
    drivers,
  )}\n\nFull results and player scores on ${accountHandle}.\n\n${formatRaceHashtags(
    raceHashtag,
  )}`;
}

export function buildPicksShareText({
  raceName,
  sessionLabel,
  picks,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  picks: ReadonlyArray<{ code: string; nationality?: string | null }>;
  accountHandle: string;
  raceHashtag?: string;
}) {
  return `My ${sessionLabel} top 5 for the ${raceName} 🎯🏎️\n\n${formatPositionList(
    picks,
  )}\n\nThink you can beat me on ${accountHandle}?\n\n${formatRaceHashtags(
    raceHashtag,
  )}`;
}

export function buildScoreShareText({
  raceName,
  points,
  isFinal,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  points: number;
  /** True once every weekend session is scored (final tally vs. running total). */
  isFinal: boolean;
  accountHandle: string;
  raceHashtag?: string;
}) {
  const hashtags = formatRaceHashtags(raceHashtag);
  return isFinal
    ? `I scored ${points} points at the ${raceName} 🏆\n\nThink you can beat me next round on ${accountHandle}?\n\n${hashtags}`
    : `${points} points so far at the ${raceName} 📈\n\nFollow the results on ${accountHandle}.\n\n${hashtags}`;
}

export function buildH2HPicksShareText({
  raceName,
  sessionLabel,
  winnerCodes,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  winnerCodes: readonly string[];
  accountHandle: string;
  raceHashtag?: string;
}) {
  const hashtags = formatRaceHashtags(raceHashtag);
  // Codes only — team names live on the OG card, keeping the post under
  // X's 280-character limit.
  return `My ${sessionLabel} Head-to-Head picks for the ${raceName} ⚔️🏎️💨\n\n${winnerCodes.join(' · ')}\n\n🏁 Think you can beat me on ${accountHandle}?\n\n${hashtags}`;
}

export function buildH2HScoreShareText({
  raceName,
  sessionLabel,
  correct,
  total,
  picks,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  correct: number;
  total: number;
  /** Per-matchup verdicts in grid order; code is null when no pick was made. */
  picks: ReadonlyArray<{ code: string | null; correct: boolean }>;
  accountHandle: string;
  raceHashtag?: string;
}) {
  // Wordle-style one-liner — team names live on the OG card, keeping the
  // post under X's 280-character limit.
  const breakdown = picks
    .map((pick) => `${pick.correct ? '✅' : '❌'}${pick.code ?? '—'}`)
    .join(' ');
  const hashtags = formatRaceHashtags(raceHashtag);
  return `I scored ${correct}/${total} on my ${raceName} ${sessionLabel} Head-to-Head picks ⚔️\n\n${breakdown}\n\nCan you beat my score on ${accountHandle}?\n\n${hashtags}`;
}

export function buildOfficialH2HResultShareText({
  raceName,
  sessionLabel,
  winnerCodes,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  winnerCodes: readonly string[];
  accountHandle: string;
  raceHashtag?: string;
}) {
  const hashtags = formatRaceHashtags(raceHashtag);
  return `${raceName} ${sessionLabel} Head-to-Head results ⚔️🏁\n\nWinners: ${winnerCodes.join(' · ')}\n\nSee every teammate matchup on ${accountHandle}.\n\n${hashtags}`;
}

/** Builds an X post intent with the link separated from the copy. */
export function buildXShareIntentUrl(text: string, url: string) {
  const postText = `${text.trim()}\n\n${url}`;
  return `https://x.com/intent/post?${new URLSearchParams({ text: postText }).toString()}`;
}
