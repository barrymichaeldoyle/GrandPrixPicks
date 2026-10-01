import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { f1StoreCatalogFor } from '../../../lib/f1Store';
import { captureServerException } from '../../../lib/sentry';

type RouteEvent = {
  req: Request;
};

/** Three tiles fit one row of a guide card at every width. */
const ITEM_LIMIT = 3;

/**
 * A store page is a driver key or a race slug. Anything slug-shaped is passed
 * on, because the backend answers an unknown page with nothing; the pattern
 * only keeps junk out of the query.
 */
const PAGE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+){0,5}$/;

/**
 * F1 Store products for one store page, from the visitor's own regional
 * catalog: `GET /api/f1-store/items?page=esteban-ocon`.
 *
 * Read in the browser after the page loads rather than rendered into it,
 * because the guide is cached once for everyone and the products differ by
 * country. `private` for the same reason: a shared cache would hand every
 * visitor the first visitor's shop.
 *
 * Every failure answers with an empty list, never an error: the card already
 * has a plain store link, and that is the right page for a visitor whose shop
 * has nothing to show.
 */
export default async function handler(event: RouteEvent) {
  const page = new URL(event.req.url).searchParams.get('page');
  const headers = event.req.headers;
  const catalogId = f1StoreCatalogFor(
    headers.get('cf-ipcountry'),
    headers.get('accept-language'),
  );

  let items: unknown[] = [];
  if (page && PAGE_PATTERN.test(page) && catalogId) {
    try {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('Missing VITE_CONVEX_URL');
      }
      items = await new ConvexHttpClient(convexUrl).query(
        api.storeProducts.forPage,
        { page, catalogId, limit: ITEM_LIMIT },
      );
    } catch (error) {
      captureServerException(error, { name: 'f1_store.items' });
    }
  }

  return Response.json(
    { items },
    {
      headers: {
        'cache-control': 'private, max-age=600',
        'x-robots-tag': 'noindex',
      },
    },
  );
}
