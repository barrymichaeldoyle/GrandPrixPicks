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
  const classification = drivers
    .map((driver, index) => {
      const flag = countryCodeToFlagEmoji(driver.nationality);
      return `P${index + 1} ${flag ? `${flag} ` : ''}${driver.code}`;
    })
    .join('\n');
  const hashtags = ['#F1', raceHashtag].filter(Boolean).join(' ');

  return `${raceName} ${sessionLabel} results 🏎️🏁\n\n${classification}\n\nFull results and player scores on ${accountHandle}.\n\n${hashtags}`;
}

export function buildH2HScoreShareText({
  raceName,
  sessionLabel,
  correct,
  total,
  accountHandle,
  raceHashtag,
}: {
  raceName: string;
  sessionLabel: string;
  correct: number;
  total: number;
  accountHandle: string;
  raceHashtag?: string;
}) {
  const hashtags = ['#F1', raceHashtag].filter(Boolean).join(' ');
  return `I got ${correct}/${total} Head-to-Head picks right for the ${raceName} ${sessionLabel} 🏎️🏁\n\nCan you beat my score on ${accountHandle}?\n\n${hashtags}`;
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
  const hashtags = ['#F1', raceHashtag].filter(Boolean).join(' ');
  return `${raceName} ${sessionLabel} Head-to-Head results 🏎️🏁\n\nWinners: ${winnerCodes.join(' · ')}\n\nSee every teammate matchup on ${accountHandle}.\n\n${hashtags}`;
}

/** Builds an X post intent with the link separated from the copy. */
export function buildXShareIntentUrl(text: string, url: string) {
  const postText = `${text.trim()}\n\n${url}`;
  return `https://x.com/intent/post?${new URLSearchParams({ text: postText }).toString()}`;
}
