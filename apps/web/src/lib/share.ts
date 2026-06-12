/** Builds an X (Twitter) post intent URL with pre-filled text and link. */
export function buildXShareIntentUrl(text: string, url: string) {
  return `https://x.com/intent/post?${new URLSearchParams({ text, url }).toString()}`;
}
