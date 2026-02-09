import { defineEventHandler, setHeaders } from 'nitro/h3';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { homeTemplate } from '../../../src/lib/og/templates';

// eslint-disable-next-line no-restricted-syntax -- Nitro server routes require default exports
export default defineEventHandler(async (event) => {
  const png = await renderOgImage(homeTemplate());

  setHeaders(event, {
    'Content-Type': 'image/png',
    'Cache-Control': 'public, s-maxage=604800, max-age=3600',
  });

  return png;
});
