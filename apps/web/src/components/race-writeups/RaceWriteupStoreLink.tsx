import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { TEAM_COLORS } from '@/lib/teamColors';

/**
 * Our redirect to the F1 Store, not the Impact link itself. The store is five
 * regional shops and the bare Impact link always opened the EU one, in French,
 * whoever clicked. `server/routes/go/f1-store.get.ts` picks the shop for the
 * visitor's country and wraps it in the tracking link.
 */
export const F1_STORE_LINK = '/go/f1-store';

type StorePlacement = 'news' | 'footer' | 'guide';

/**
 * Store pages the redirect will open, mirroring `F1_STORE_PAGES` in
 * `server/lib/f1Store.ts`. A key the server does not know falls back to the
 * front page, so a mismatch costs the deep link, never the click.
 */
export type F1StorePage = 'esteban-ocon';

/**
 * Shared by both placements. `rel="sponsored"` is Google's required marking for
 * a paid link, and the redirect hop does not change that.
 *
 * The click is measured because the case for keeping it is a number: Impact
 * reports sales, PostHog reports whether anyone clicks at all, and `placement`
 * says which of the two placements earned it. The event has no race property
 * because PostHog already records the page's URL on it.
 */
function storeLinkProps(placement: StorePlacement, page?: F1StorePage) {
  return {
    href: page ? `${F1_STORE_LINK}?page=${page}` : F1_STORE_LINK,
    target: '_blank',
    rel: 'sponsored noopener',
    onClick: () =>
      captureAnalyticsEvent('race_writeup_store_link_clicked', {
        placement,
        ...(page ? { page } : {}),
      }),
  } as const;
}

const DISCLOSURE = 'We earn a commission on purchases made through this link.';

/**
 * The store as one card in the weekend news grid, where a reader is already
 * scanning. It looks like its neighbours on purpose (same surface, same edge
 * bar) and says it is an affiliate link before the headline, because a reader
 * has to know that before they click, not after.
 *
 * `wide` takes both grid columns, for when a single cell would leave the
 * grid's last row half empty.
 *
 * Eleven team colours in the house lean are the card's picture: the grid is
 * what the store sells, and it is the one decoration that needs no asset.
 *
 * `storePage` is the race's slug. When the store sells merch named for the
 * race (Singapore's special-edition kit, Mexico's skull graphics), the
 * visitor's own shop's pieces replace the colours and the generic line, after
 * the page loads (see `apps/backend/convex/storeProducts.ts`). A race with
 * none, and a shop with none in stock, keep the generic card.
 *
 * Not a shop page and not a section: the write-ups are the pages search ranks
 * and AdSense reviews (see `docs/seo-content-policy.md`).
 */
export function RaceWriteupStoreCard({
  wide = false,
  storePage,
  leanClassName = '',
}: {
  wide?: boolean;
  storePage?: string;
  /** Which way the edge bar leans, from the grid that places this card. */
  leanClassName?: string;
}) {
  const products = useStoreProducts(storePage);
  const hasProducts = products.length > 0;

  return (
    <article
      className={`gpp-team-bar gpp-team-bar-lean flex flex-col bg-surface p-4 sm:p-6 ${leanClassName} ${
        wide
          ? hasProducts
            ? 'sm:col-span-2'
            : 'sm:col-span-2 sm:flex-row sm:items-end sm:gap-10'
          : ''
      }`}
      style={{ '--team-colour': 'var(--accent)' } as CSSProperties}
    >
      <div className={wide && !hasProducts ? 'sm:flex-1' : ''}>
        <p className="gpp-mono text-xs text-text-muted">
          {hasProducts ? 'Affiliate links' : 'Affiliate link'}
        </p>
        <h3 className="font-title mt-1 text-lg font-medium text-text">
          {hasProducts
            ? 'Race merch at the F1 Store'
            : 'Team kit at the F1 Store'}
        </h3>
        <StoreProductList
          products={products}
          className={`mt-3 grid gap-2 ${wide ? 'sm:grid-cols-3' : ''}`}
          columns={wide}
          onClick={() =>
            captureAnalyticsEvent('race_writeup_store_link_clicked', {
              placement: 'news',
              page: storePage,
              product: true,
            })
          }
        />
        {hasProducts ? null : (
          <div className="mt-3 flex gap-1" aria-hidden>
            {Object.entries(TEAM_COLORS).map(([team, colour]) => (
              <span
                key={team}
                className="h-7 w-3.5 [clip-path:polygon(var(--stripe-lean)_0,100%_0,calc(100%-var(--stripe-lean))_100%,0_100%)]"
                style={{ background: colour }}
              />
            ))}
          </div>
        )}
        {hasProducts ? null : (
          <p className="gpp-reading-copy mt-3 text-text-muted">
            Caps, shirts and driver merch for every team on the grid, from the
            official store for your country.
          </p>
        )}
      </div>
      <div
        className={
          wide && hasProducts
            ? 'mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'
            : wide
              ? 'mt-4 sm:mt-0 sm:shrink-0'
              : 'mt-4 sm:mt-auto sm:pt-4'
        }
      >
        <a
          {...storeLinkProps('news')}
          className={`${primaryButtonStyles('sm')} w-full sm:w-auto`}
        >
          Shop the F1 Store
          <ArrowUpRight aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p
          className={`text-xs text-text-muted ${wide && hasProducts ? '' : 'mt-2'}`}
        >
          {hasProducts
            ? 'We earn a commission on purchases made through these links.'
            : DISCLOSURE}
        </p>
      </div>
    </article>
  );
}

/**
 * The footer line, for write-ups that have no news grid to hold the card: a
 * finished race, or a weekend with nothing published yet.
 */
export function RaceWriteupStoreLink() {
  return (
    <p className="mt-2">
      Team kit and caps are on the{' '}
      <a
        {...storeLinkProps('footer')}
        className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
      >
        F1 Store
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      . {DISCLOSURE}
    </p>
  );
}

/** One product from the visitor's regional catalog, as `/api/f1-store/items` returns it. */
type StoreProduct = {
  name: string;
  imageUrl: string;
  url: string;
  currentPrice: number;
  originalPrice?: number;
  currency: string;
};

function isStoreProduct(value: unknown): value is StoreProduct {
  const item = value as Partial<StoreProduct> | null;
  return (
    typeof item?.name === 'string' &&
    typeof item.imageUrl === 'string' &&
    typeof item.url === 'string' &&
    item.url.startsWith('https://f1.pxf.io/') &&
    typeof item.currentPrice === 'number' &&
    typeof item.currency === 'string'
  );
}

/**
 * The visitor's products for a store page, or an empty list until they load
 * and whenever their shop has none. Fetched after hydration because the page
 * itself is cached for every country at once.
 */
function useStoreProducts(page: string | undefined): StoreProduct[] {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  useEffect(() => {
    if (!page) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/f1-store/items?page=${page}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((body: { items?: unknown }) => {
        setProducts(
          Array.isArray(body.items) ? body.items.filter(isStoreProduct) : [],
        );
      })
      .catch(() => {
        // Aborted on unmount, or offline: the plain link still works.
      });
    return () => controller.abort();
  }, [page]);
  return products;
}

function formatPrice(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** The catalog serves 2000px originals; a tile needs a fraction of that. */
function thumbnail(imageUrl: string) {
  try {
    const url = new URL(imageUrl);
    url.searchParams.set('w', '240');
    return url.toString();
  } catch {
    return imageUrl;
  }
}

/**
 * Products as tiles: photo, name, price, and the sale's original price struck
 * through. Renders nothing for an empty list, so a caller can place it
 * unconditionally and keep its own fallback copy.
 */
function StoreProductList({
  products,
  className,
  onClick,
  columns = false,
}: {
  products: StoreProduct[];
  className: string;
  onClick: () => void;
  /**
   * Photo above the name, for tiles laid side by side. Beside the name, a
   * third of a card's width left room for two words of "Audi F1 adidas
   * Special Edition Singapore GP Team Cap". From `sm` up only: stacked one
   * column wide on a phone, three full-width photos were a screen and a half
   * of shop, so a phone keeps the compact row.
   */
  columns?: boolean;
}) {
  if (products.length === 0) {
    return null;
  }
  return (
    <ul className={className}>
      {products.map((product) => (
        <li key={product.url}>
          <a
            href={product.url}
            target="_blank"
            rel="sponsored noopener"
            onClick={onClick}
            className={`group flex items-center gap-3 rounded-sm border border-border p-2 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              columns ? 'h-full sm:flex-col sm:items-stretch' : ''
            }`}
          >
            {/* White behind the photo: the catalog shoots products on white,
                and a dark surface around a white square reads as a hole in
                the card. */}
            <img
              src={thumbnail(product.imageUrl)}
              alt=""
              width={72}
              height={72}
              loading="lazy"
              decoding="async"
              className={`size-18 shrink-0 rounded-sm bg-white object-contain ${
                columns ? 'sm:h-32 sm:w-full' : ''
              }`}
            />
            <span className="min-w-0">
              <span className="line-clamp-2 text-sm text-text group-hover:underline">
                {/* The upstream catalog misspells Norris; correct the display
                    name here so catalog refreshes keep the correction. */}
                {product.name.replace(/\bLando Noris\b/g, 'Lando Norris')}
              </span>
              <span className="gpp-mono mt-1 block text-sm">
                <span className="font-semibold text-text">
                  {formatPrice(product.currentPrice, product.currency)}
                </span>
                {/* Strikethrough is not announced, so a screen reader would
                    read a sale as two prices. "was" says which is which. */}
                {product.originalPrice ? (
                  <>
                    <span className="sr-only">, was </span>
                    <s className="ml-2 text-text-muted">
                      {formatPrice(product.originalPrice, product.currency)}
                    </s>
                  </>
                ) : null}
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * One store page inside a guide's driver card: the products the visitor's
 * own shop has under it, then a line saying what is there and a button to the
 * whole page. The copy is the guide's, because only the guide knows why the
 * merch is worth mentioning (Ocon's, for one, is a leaving driver's last Haas
 * stock).
 *
 * The products come from the store's Impact catalogs, synced by the backend
 * (`storeProducts.ts`), so the photos are ones affiliates may use and each
 * shop shows its own stock in its own currency. Until they load, and in a
 * shop with nothing in stock, the card is just the line and the button: a
 * sold-out item leaves the page on the next sync without anyone editing it.
 */
export function F1StorePageLink({
  page,
  text,
  label,
}: {
  page: F1StorePage;
  text: string;
  label: string;
}) {
  const products = useStoreProducts(page);

  return (
    <div className="clear-both mt-5 border-t border-border pt-4">
      <StoreProductList
        products={products}
        className="mb-4 grid gap-3"
        onClick={() =>
          captureAnalyticsEvent('race_writeup_store_link_clicked', {
            placement: 'guide',
            page,
            product: true,
          })
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text">{text}</p>
        <a
          {...storeLinkProps('guide', page)}
          className={`${primaryButtonStyles('sm')} shrink-0`}
        >
          {label}
          <ArrowUpRight aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Affiliate links. We earn a commission on purchases made through them.
      </p>
    </div>
  );
}
