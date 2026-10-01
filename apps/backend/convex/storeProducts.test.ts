/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';
import { collapseSizes, toStoreProduct } from './storeProducts';

const modules = import.meta.glob('./**/*.{ts,tsx}');

const cap = {
  CampaignId: '11910',
  CatalogId: '6653',
  CatalogItemId: '211117979',
  Name: 'Haas New Era Esteban Ocon 9SEVENTY Team Cap - Black',
  ImageUrl: 'https://feeds.frgimages.com/_ss5_p-203495694.jpg?_hv=2&w=2000',
  Url: 'https://f1.pxf.io/c/1208040/865970/11910?prodsku=211117979&u=x',
  CurrentPrice: '28.00',
  OriginalPrice: '56.00',
  Currency: 'USD',
  StockAvailability: 'InStock',
  SubCategory: 'Haas F1 Team',
};

describe('toStoreProduct', () => {
  it('keeps a Haas Ocon item with its sale price', () => {
    expect(toStoreProduct(cap, 'esteban-ocon')).toMatchObject({
      catalogId: '6653',
      currentPrice: 28,
      originalPrice: 56,
      inStock: true,
    });
  });

  it('drops his Alpine stock from the Haas page', () => {
    expect(
      toStoreProduct({ ...cap, SubCategory: 'Alpine' }, 'esteban-ocon'),
    ).toBeNull();
  });

  it('refuses links and images that leave the store', () => {
    expect(
      toStoreProduct({ ...cap, Url: 'https://evil.example/x' }, 'esteban-ocon'),
    ).toBeNull();
    expect(
      toStoreProduct(
        { ...cap, ImageUrl: 'http://feeds.frgimages.com/x.jpg' },
        'esteban-ocon',
      ),
    ).toBeNull();
  });

  it('ignores another brand on the same search', () => {
    expect(
      toStoreProduct({ ...cap, CampaignId: '999' }, 'esteban-ocon'),
    ).toBeNull();
  });

  it('reads a blank stock field as in stock and OutOfStock as gone', () => {
    expect(
      toStoreProduct({ ...cap, StockAvailability: '' }, 'esteban-ocon')
        ?.inStock,
    ).toBe(true);
    expect(
      toStoreProduct(
        { ...cap, StockAvailability: 'OutOfStock' },
        'esteban-ocon',
      )?.inStock,
    ).toBe(false);
  });

  it('shows no original price unless it is a real discount', () => {
    expect(
      toStoreProduct({ ...cap, OriginalPrice: '28.00' }, 'esteban-ocon'),
    ).not.toHaveProperty('originalPrice');
  });
});

describe('race pages', () => {
  const poster = {
    ...cap,
    Name: 'Formula 1 Las Vegas Grand Prix 2025 Poster',
    SubCategory: 'Formula 1',
  };

  it('keeps race-named merch from any team', () => {
    expect(
      toStoreProduct(
        { ...cap, Name: 'McLaren Mitchell & Ness Las Vegas Jersey' },
        'las-vegas-2026',
      ),
    ).not.toBeNull();
  });

  it('drops merch dated to another season', () => {
    expect(toStoreProduct(poster, 'las-vegas-2026')).toBeNull();
    expect(
      toStoreProduct(
        { ...poster, Name: 'Formula 1 Las Vegas Grand Prix 2026 Poster' },
        'las-vegas-2026',
      ),
    ).not.toBeNull();
  });

  it('drops an item that only matched the loose keyword', () => {
    expect(
      toStoreProduct(
        { ...cap, Name: 'Formula 1 Japanese Grand Prix Cap' },
        'mexico-2026',
      ),
    ).toBeNull();
  });

  it('ignores a page that is not configured', () => {
    expect(toStoreProduct(cap, 'usa-2026')).toBeNull();
  });
});

describe('collapseSizes', () => {
  it('keeps one row per product per catalog, at the cheapest size', () => {
    const hoodie = toStoreProduct(
      { ...cap, Name: 'Formula 1 Mexico Skull Graphic Hoodie' },
      'mexico-2026',
    )!;
    const rows = collapseSizes([
      { ...hoodie, catalogItemId: 'm', currentPrice: 83 },
      { ...hoodie, catalogItemId: 's', currentPrice: 79 },
      { ...hoodie, catalogId: '6648', currency: 'GBP', currentPrice: 60 },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.catalogId === '6653')?.catalogItemId).toBe(
      's',
    );
  });

  it('treats colours of one product as one', () => {
    const shirt = toStoreProduct(
      { ...cap, Name: 'Formula 1 Mexico Skull T-Shirt - Black' },
      'mexico-2026',
    )!;
    expect(
      collapseSizes([
        shirt,
        { ...shirt, name: 'Formula 1 Mexico Skull T-Shirt - White' },
      ]),
    ).toHaveLength(1);
  });
});

describe('forPage', () => {
  it('returns only in-stock items from the asked catalog, and a resync replaces them', async () => {
    const t = convexTest(schema, modules);
    const product = toStoreProduct(cap, 'esteban-ocon')!;
    await t.mutation(internal.storeProducts.replacePage, {
      page: 'esteban-ocon',
      products: [
        product,
        { ...product, catalogItemId: 'gone', inStock: false },
        { ...product, catalogId: '6652', currency: 'AUD' },
      ],
    });

    const items = await t.query(api.storeProducts.forPage, {
      page: 'esteban-ocon',
      catalogId: '6653',
      limit: 3,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ currency: 'USD', currentPrice: 28 });

    await t.mutation(internal.storeProducts.replacePage, {
      page: 'esteban-ocon',
      products: [],
    });
    expect(
      await t.query(api.storeProducts.forPage, {
        page: 'esteban-ocon',
        catalogId: '6653',
        limit: 3,
      }),
    ).toEqual([]);
  });
});
