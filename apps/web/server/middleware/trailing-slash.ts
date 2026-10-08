import { defineHandler } from 'nitro';

import { trailingSlashRedirect } from '../lib/trailingSlash';

export default defineHandler((event) => {
  const location = trailingSlashRedirect(new URL(event.req.url));
  if (location === null) {
    return;
  }
  return new Response(null, { status: 308, headers: { location } });
});
