/**
 * The 400 an OG image route answers a bad or unknown `?race=` with.
 *
 * Plain text, so a slug echoed back in the message is never parsed as markup,
 * and never cached: the next request for the same URL may well succeed once
 * the race or its result exists.
 */
export function ogBadRequest(message: string): Response {
  return new Response(message, {
    status: 400,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
