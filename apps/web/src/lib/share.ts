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

/** Builds an X post intent with the link separated from the copy. */
export function buildXShareIntentUrl(text: string, url: string) {
  const postText = `${text.trim()}\n\n${url}`;
  return `https://x.com/intent/post?${new URLSearchParams({ text: postText }).toString()}`;
}
