import { v } from 'convex/values';

import { internal } from './_generated/api';
import {
  env,
  internalAction,
  internalMutation,
  query,
} from './_generated/server';

/**
 * F1 Store products for the affiliate store pages, read from the Impact
 * partner catalog API.
 *
 * The store publishes one catalog per shop and language (UK, France, Spain,
 * Germany, Australia, and "US", which is the international USD shop), each
 * with licensed product photos, prices, stock and a ready-made tracking link
 * per item. That is the only source of product photos we are allowed to use:
 * the store's own pages refuse automated requests.
 *
 * The web server picks the visitor's catalog (`apps/web/server/lib/f1Store.ts`)
 * and reads it through {@link forPage}. This module only keeps the rows fresh.
 */

type StoreProductPageConfig = {
  /** Impact's full-text search. Loose: "Mexico" also returns any "Grand Prix". */
  keyword: string;
  /** What the item's own name must match, which is the filter that counts. */
  name: RegExp;
  /** Narrows to one team: Ocon's page shows his Haas stock, not Alpine's. */
  subCategory?: string;
  /**
   * Drops items dated to any other season. The Las Vegas catalog still sells
   * 2023 to 2025 event posters, and a 2024 poster under a 2026 race reads as
   * a mistake.
   */
  season?: number;
};

/**
 * What to collect for each store page, keyed by the page that shows it: a
 * driver's guide card, or a race write-up's store card by race slug.
 *
 * A race is listed only when the store sells merch named for it. In October
 * 2026 that was Singapore, Mexico and Las Vegas; Austin, São Paulo, Qatar, Abu
 * Dhabi, Sepang and Baku had none, and their cards stay generic.
 */
const STORE_PRODUCT_PAGES: Record<string, StoreProductPageConfig> = {
  'esteban-ocon': {
    keyword: 'Esteban Ocon',
    name: /Ocon/,
    subCategory: 'Haas F1 Team',
  },
  'singapore-2026': { keyword: 'Singapore', name: /singapore/i, season: 2026 },
  'mexico-2026': { keyword: 'Mexico', name: /mexico/i, season: 2026 },
  'las-vegas-2026': {
    keyword: 'Las Vegas',
    name: /las vegas/i,
    season: 2026,
  },
};

/** Impact's largest page; three pages covers any one race's merch. */
const SEARCH_PAGE_SIZE = 100;
const SEARCH_MAX_PAGES = 3;

/** The F1 Store's Impact campaign. Other brands' catalogs are ignored. */
const F1_STORE_CAMPAIGN_ID = '11910';

/** Rows kept per page per catalog, after sizes are collapsed. */
const MAX_ITEMS_PER_PAGE = 40;

const storeProduct = v.object({
  catalogId: v.string(),
  catalogItemId: v.string(),
  name: v.string(),
  imageUrl: v.string(),
  url: v.string(),
  currentPrice: v.number(),
  originalPrice: v.optional(v.number()),
  currency: v.string(),
  inStock: v.boolean(),
});

type StoreProduct = typeof storeProduct.type;

type ImpactItem = {
  CampaignId?: string;
  CatalogId?: string;
  CatalogItemId?: string;
  Name?: string;
  ImageUrl?: string;
  Url?: string;
  CurrentPrice?: string;
  OriginalPrice?: string;
  Currency?: string;
  StockAvailability?: string;
  SubCategory?: string;
};

function httpsHost(value: string | undefined, hosts: readonly string[]) {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' && hosts.includes(url.host);
  } catch {
    return false;
  }
}

/**
 * One Impact item as a row, or null when it does not belong on the page or
 * is missing what a tile needs.
 *
 * The link must be an Impact tracking link and the image must come from the
 * store's image host: the rows are rendered as links and images on a public
 * page, so nothing from the feed is trusted to point anywhere else.
 *
 * An empty `StockAvailability` counts as in stock. The German catalog leaves
 * it blank for items the others mark `InStock`, and the sync runs often
 * enough that a sold-out item drops out of the feed soon anyway.
 */
export function toStoreProduct(
  item: ImpactItem,
  page: string,
): StoreProduct | null {
  const config = STORE_PRODUCT_PAGES[page];
  if (!config) {
    return null;
  }
  const years = item.Name?.match(/\b20\d\d\b/g) ?? [];
  const price = Number(item.CurrentPrice);
  const original = Number(item.OriginalPrice);
  if (
    item.CampaignId !== F1_STORE_CAMPAIGN_ID ||
    !item.CatalogId ||
    !item.CatalogItemId ||
    !item.Name ||
    !config.name.test(item.Name) ||
    (config.subCategory !== undefined &&
      item.SubCategory !== config.subCategory) ||
    (config.season !== undefined &&
      years.some((year) => Number(year) !== config.season)) ||
    !httpsHost(item.Url, ['f1.pxf.io']) ||
    !httpsHost(item.ImageUrl, ['feeds.frgimages.com']) ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !item.Currency
  ) {
    return null;
  }
  return {
    catalogId: item.CatalogId,
    catalogItemId: item.CatalogItemId,
    name: item.Name,
    imageUrl: item.ImageUrl!,
    url: item.Url!,
    currentPrice: price,
    ...(Number.isFinite(original) && original > price
      ? { originalPrice: original }
      : {}),
    currency: item.Currency,
    inStock: item.StockAvailability !== 'OutOfStock',
  };
}

async function searchImpact(keyword: string): Promise<ImpactItem[]> {
  const sid = env.IMPACT_ACCOUNT_SID;
  const token = env.IMPACT_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error(
      'IMPACT_ACCOUNT_SID and IMPACT_AUTH_TOKEN are not configured',
    );
  }
  const items: ImpactItem[] = [];
  for (let page = 1; page <= SEARCH_MAX_PAGES; page += 1) {
    const url = new URL(
      `https://api.impact.com/Mediapartners/${sid}/Catalogs/ItemSearch`,
    );
    url.searchParams.set('Keyword', keyword);
    url.searchParams.set('PageSize', String(SEARCH_PAGE_SIZE));
    url.searchParams.set('Page', String(page));
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Impact catalog search failed: ${response.status}`);
    }
    const body = (await response.json()) as {
      Items?: ImpactItem[];
      '@numpages'?: string;
    };
    items.push(...(Array.isArray(body.Items) ? body.Items : []));
    if (page >= Number(body['@numpages'] ?? 1)) {
      break;
    }
  }
  return items;
}

/**
 * A product's name without its variant suffixes: "Mexico Skull T-shirt -
 * Noir", "- Rouge - Unisexe" and "- Femme" are one shirt to a reader scanning
 * three tiles.
 */
function productName(name: string) {
  return name.split(/\s+[-–]\s+/)[0] ?? name;
}

/**
 * One row per product per catalog. The catalogs list every size, and every
 * colour, as its own item, so a hoodie in six sizes would otherwise fill a
 * card six times. The cheapest variant stands for the product.
 */
export function collapseSizes(products: StoreProduct[]): StoreProduct[] {
  const byProduct = new Map<string, StoreProduct>();
  for (const product of products) {
    const key = `${product.catalogId}\u0000${productName(product.name)}`;
    const kept = byProduct.get(key);
    if (!kept || product.currentPrice < kept.currentPrice) {
      byProduct.set(key, product);
    }
  }
  const perCatalog = new Map<string, number>();
  return [...byProduct.values()].filter((product) => {
    const count = (perCatalog.get(product.catalogId) ?? 0) + 1;
    perCatalog.set(product.catalogId, count);
    return count <= MAX_ITEMS_PER_PAGE;
  });
}

/**
 * Refreshes every store page. A page whose search fails keeps its previous
 * rows: stale prices for a few hours beat an empty card.
 */
export const sync = internalAction({
  args: {},
  handler: async (ctx) => {
    for (const [page, config] of Object.entries(STORE_PRODUCT_PAGES)) {
      let items: ImpactItem[];
      try {
        items = await searchImpact(config.keyword);
      } catch (error) {
        console.error(`storeProducts.sync ${page}:`, error);
        continue;
      }
      const products = collapseSizes(
        items.flatMap((item) => toStoreProduct(item, page) ?? []),
      );
      await ctx.runMutation(internal.storeProducts.replacePage, {
        page,
        products,
      });
    }
    return null;
  },
});

export const replacePage = internalMutation({
  args: { page: v.string(), products: v.array(storeProduct) },
  handler: async (ctx, { page, products }) => {
    const existing = ctx.db
      .query('storeProducts')
      .withIndex('by_page_and_catalogId', (q) => q.eq('page', page));
    for await (const row of existing) {
      await ctx.db.delete('storeProducts', row._id);
    }
    const syncedAt = Date.now();
    for (const product of products) {
      await ctx.db.insert('storeProducts', { page, ...product, syncedAt });
    }
    return null;
  },
});

/**
 * In-stock products of one store page in one catalog, cheapest first.
 *
 * Public, because it is the store's own public catalog data and the web
 * server reads it without an identity.
 */
export const forPage = query({
  args: { page: v.string(), catalogId: v.string(), limit: v.number() },
  returns: v.array(storeProduct.omit('catalogId', 'catalogItemId', 'inStock')),
  handler: async (ctx, { page, catalogId, limit }) => {
    const rows = await ctx.db
      .query('storeProducts')
      .withIndex('by_page_and_catalogId', (q) =>
        q.eq('page', page).eq('catalogId', catalogId),
      )
      .take(MAX_ITEMS_PER_PAGE);
    return rows
      .filter((row) => row.inStock)
      .sort((a, b) => a.currentPrice - b.currentPrice)
      .slice(0, Math.max(0, Math.min(limit, 6)))
      .map((row) => ({
        name: row.name,
        imageUrl: row.imageUrl,
        url: row.url,
        currentPrice: row.currentPrice,
        ...(row.originalPrice === undefined
          ? {}
          : { originalPrice: row.originalPrice }),
        currency: row.currency,
      }));
  },
});
