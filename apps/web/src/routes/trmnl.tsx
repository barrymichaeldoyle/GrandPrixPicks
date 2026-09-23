import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { TabSwitch } from '@/components/TabSwitch';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { pageMeta, siteConfig } from '@/lib/site';
import type { TrmnlLayout, TrmnlScreenConfig } from '@/lib/trmnl/render';
import {
  defaultTrmnlPalette,
  TRMNL_LAYOUTS,
  TRMNL_PALETTES,
  trmnlScreenDocument,
  trmnlScreenProfile,
} from '@/lib/trmnl/render';
import type { TrmnlPageScenario } from '@/lib/trmnl/pageScenarios';
import { fetchTrmnlPageScenarios } from '@/lib/trmnl/pageScenarios';

import { TrmnlFeedback } from './-trmnl/TrmnlFeedback';

/**
 * Every screen of the TRMNL plugin, rendered from the real Liquid layouts in
 * `apps/trmnl/src` against the real payload builder (`lib/trmnl/payload.ts`),
 * so it cannot drift from what the plugin shows. The screens are the site's
 * real weekends: the coming build-up live, and last weekend replayed at each
 * later moment (`lib/trmnl/pageScenarios.ts`). Spec:
 * `docs/trmnl-plugin-specification.md`.
 *
 * noindex and out of the sitemap: it is mostly rendered screens with little
 * prose, which is the shape `docs/seo-content-policy.md` says not to ask
 * Google to index. It is the plugin's "learn more" link from the TRMNL
 * directory, and the place to check a layout change.
 */

type View = TrmnlLayout | 'all';

type Device = TrmnlScreenConfig['device'];
type Orientation = TrmnlScreenConfig['orientation'];
type Palette = TrmnlScreenConfig['palette'];

type TrmnlSearch = {
  scenario?: string;
  size?: View;
  device?: Device;
  orientation?: Orientation;
  palette?: Palette;
};

/*
 * `loader`, `validateSearch` and `head` stay in the main bundle, which every
 * page loads; only the component is split out. So nothing up here may import
 * the renderer, the payload builder or the scenarios, or liquidjs and the
 * templates ship to the whole site. The loader calls a server function, which
 * the client sees only as a stub. The component checks the scenario id and
 * falls back to the first.
 */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]) {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

const VIEW_IDS = new Set<string>([
  'full',
  'half_horizontal',
  'half_vertical',
  'quadrant',
  'all',
] satisfies View[]);

export const Route = createFileRoute('/trmnl')({
  loader: async () => {
    // A minute at the edge: the build-up tab is live data.
    await setRaceDataCacheHeaders();
    return { scenarios: await fetchTrmnlPageScenarios() };
  },
  validateSearch: (search: Record<string, unknown>): TrmnlSearch => ({
    scenario:
      typeof search.scenario === 'string' &&
      /^[a-z-]{1,32}$/.test(search.scenario)
        ? search.scenario
        : undefined,
    size:
      typeof search.size === 'string' && VIEW_IDS.has(search.size)
        ? (search.size as View)
        : undefined,
    device: oneOf<Device>(search.device, ['og', 'x']),
    orientation: oneOf<Orientation>(search.orientation, [
      'landscape',
      'portrait',
    ]),
    palette: oneOf<Palette>(search.palette, [
      '1bit',
      '2bit',
      '4bit',
      'color-4bwry',
      'color-7a',
      'color-full',
    ]),
  }),
  component: TrmnlPage,
  head: () =>
    pageMeta({
      title: 'Formula 1 Race Weekend for TRMNL | Grand Prix Picks',
      description:
        'Every screen of the Grand Prix Picks plugin for TRMNL e-ink displays, for each moment of a race weekend and each screen size.',
      path: '/trmnl',
      noIndex: true,
    }),
});

const DEVICE_OPTIONS: { value: Device; label: string }[] = [
  { value: 'og', label: 'TRMNL OG' },
  { value: 'x', label: 'TRMNL X' },
];

const ORIENTATION_OPTIONS: { value: Orientation; label: string }[] = [
  { value: 'landscape', label: 'Landscape' },
  { value: 'portrait', label: 'Portrait' },
];

const VIEW_OPTIONS: { value: View; label: string }[] = [
  ...TRMNL_LAYOUTS.map((l) => ({ value: l.id, label: l.label })),
  { value: 'all', label: 'All sizes' },
];

function TrmnlPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { scenarios } = Route.useLoaderData();
  const scenario =
    scenarios.find((s) => s.id === search.scenario) ?? scenarios[0];
  const scenarioOptions = scenarios.map((s) => ({
    value: s.id,
    label: s.label,
  }));
  const view = search.size ?? 'full';
  const device = search.device ?? 'og';
  const config: TrmnlScreenConfig = {
    device,
    orientation: search.orientation ?? 'landscape',
    // Unset follows the device: switching to the X shows it in its own 16
    // grays, not the OG's 4.
    palette: search.palette ?? defaultTrmnlPalette(device),
  };
  const deviceProfile = trmnlScreenProfile(config);
  const paletteOptions = TRMNL_PALETTES.map((p) => ({
    value: p.id,
    label: p.label,
  }));

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <PageHeader
          title="Formula 1 Race Weekend for TRMNL"
          subtitle="Our plugin for the TRMNL e-ink display shows the current race weekend: session times in your time zone, practice and session results as they are published, the starting grid on race morning, and the news. Between seasons it shows the final standings."
        />

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-3">
            <TabSwitch
              value={config.device}
              onChange={(value) =>
                navigate({
                  search: (prev) => ({ ...prev, device: value }),
                  replace: true,
                })
              }
              options={DEVICE_OPTIONS}
              className="flex gap-1 rounded-lg bg-surface-muted/70 p-1"
              ariaLabel="Device"
            />
            <TabSwitch
              value={config.orientation}
              onChange={(value) =>
                navigate({
                  search: (prev) => ({ ...prev, orientation: value }),
                  replace: true,
                })
              }
              options={ORIENTATION_OPTIONS}
              className="flex gap-1 rounded-lg bg-surface-muted/70 p-1"
              ariaLabel="Orientation"
            />
            <TabSwitch
              value={config.palette}
              onChange={(value) =>
                navigate({
                  search: (prev) => ({ ...prev, palette: value }),
                  replace: true,
                })
              }
              options={paletteOptions}
              className="flex gap-1 rounded-lg bg-surface-muted/70 p-1"
              ariaLabel="Palette"
            />
          </div>
          <TabSwitch
            value={scenario.id}
            onChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, scenario: value }),
                replace: true,
              })
            }
            options={scenarioOptions}
            className="flex flex-wrap gap-1 rounded-lg bg-surface-muted/55 p-1"
            ariaLabel="Moment of the weekend"
          />
          <TabSwitch
            value={view}
            onChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, size: value }),
                replace: true,
              })
            }
            options={VIEW_OPTIONS}
            className="flex flex-wrap gap-1 rounded-lg bg-surface-muted/40 p-1"
            ariaLabel="Screen size"
          />
        </div>

        {/* Two lines reserved, so a longer caption never moves the screen. */}
        <p className="mt-6 min-h-10 text-sm text-text-muted">
          {deviceProfile.label}, {deviceProfile.width}×{deviceProfile.height}.{' '}
          {scenario.caption} Times in UK time.
        </p>

        {view === 'all' ? (
          <div className="mt-3 grid gap-6 sm:grid-cols-2">
            {TRMNL_LAYOUTS.map((layout) => (
              <figure key={layout.id} className="flex flex-col gap-2">
                <TrmnlScreen
                  scenario={scenario}
                  layout={layout.id}
                  config={config}
                />
                <figcaption className="text-sm text-text-muted">
                  {layout.label}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <TrmnlScreen scenario={scenario} layout={view} config={config} />
          </div>
        )}

        <TrmnlFeedback />

        <PayloadDetails payload={scenario.payload} />
      </div>
    </div>
  );
}

/**
 * The payload behind the screen, as JSON. Client-only: the sample payloads
 * are built where the page runs, and a server and a browser can format the
 * same date with different ICU data, which React would report as a hydration
 * mismatch.
 */
function PayloadDetails({
  payload,
}: {
  payload: TrmnlPageScenario['payload'];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <details className="mt-8 border-t border-border pt-4">
      <summary className="cursor-pointer text-sm font-semibold text-text">
        Data the plugin receives
      </summary>
      {mounted && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-muted/55 p-3 text-xs text-text-muted">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </details>
  );
}

/**
 * The layouts point the icon and flags at production, which is right for
 * TRMNL. Here they are served from wherever this page is, so a preview deploy
 * or `pnpm dev` shows assets that production does not have yet.
 */
function withLocalAssets(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }
  const origin = window.location.origin;
  return html
    .replaceAll(`${siteConfig.url}/flags/`, `${origin}/flags/`)
    .replaceAll(`${siteConfig.url}/trmnl-icon.svg`, `${origin}/trmnl-icon.svg`);
}

/** Flags already inlined, by URL, so a tab change never refetches one. */
const inlinedImages = new Map<string, string>();

/**
 * An image as a `data:` URI, so the screen's document can read its pixels.
 * The screens run in sandboxed documents with an opaque origin, where a canvas
 * cannot read an image from this site, and the preview dithers the flag
 * through a canvas (`DITHER_SOURCE` in render.ts). Undefined while it loads;
 * the URL itself if it cannot be fetched, which then shows undithered.
 */
function useInlinedImage(url: string | null): string | null | undefined {
  const [, setLoaded] = useState(0);

  useEffect(() => {
    if (!url || inlinedImages.has(url)) {
      return;
    }
    let cancelled = false;
    async function inline(from: string) {
      try {
        const response = await fetch(from);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        inlinedImages.set(from, dataUri);
      } catch {
        inlinedImages.set(from, from);
      }
      if (!cancelled) {
        setLoaded((n) => n + 1);
      }
    }
    void inline(url);
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) {
    return null;
  }
  return inlinedImages.get(url);
}

type Frame = {
  id: number;
  doc: string;
  width: number;
  height: number;
  ready: boolean;
};

/** Long enough for TRMNL's script to fit values and clamp headlines. */
const SETTLE_MS = 150;

/**
 * One TRMNL screen in an iframe at the device's own pixel size (800x480 for
 * the OG, 1872x1404 for the X), scaled down to the column. An iframe because
 * TRMNL's Framework CSS is global and would restyle the site, and because its
 * JS (value fitting, headline clamping) expects a whole document.
 *
 * Double-buffered. Swapping an iframe's document blanks it, then TRMNL's
 * script refits the text a moment later, so every tab change flashed white
 * and then jumped. A new screen loads invisibly over the old one and replaces
 * it once it has settled; the old one is kept until then.
 */
function TrmnlScreen({
  scenario,
  layout,
  config,
}: {
  scenario: TrmnlPageScenario;
  layout: TrmnlLayout;
  config: TrmnlScreenConfig;
}) {
  const { width, height, label: deviceLabel } = trmnlScreenProfile(config);
  const flagUrl = scenario.payload.race?.flag_url
    ? withLocalAssets(scenario.payload.race.flag_url)
    : null;
  const flag = useInlinedImage(flagUrl);
  const html = withLocalAssets(
    trmnlScreenDocument(layout, scenario.payload, config),
  );
  // Hold the screen back until the flag is inlined, so it is never drawn
  // first in colour and then again dithered.
  const doc =
    flag === undefined
      ? null
      : flagUrl && flag
        ? html.replaceAll(`src="${flagUrl}"`, `src="${flag}"`)
        : html;
  const boxRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setBoxWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (doc === null) {
      return;
    }
    setFrames((current) =>
      current.at(-1)?.doc === doc
        ? current
        : [
            // Keep the last settled screen showing while the new one loads.
            ...current.filter((frame) => frame.ready).slice(-1),
            { id: nextId.current++, doc, width, height, ready: false },
          ],
    );
  }, [doc, width, height]);

  function settle(id: number) {
    setFrames((current) => {
      const index = current.findIndex((frame) => frame.id === id);
      if (index < 0) {
        return current;
      }
      // This screen is ready: show it and drop everything under it.
      return current
        .slice(index)
        .map((frame, i) => (i === 0 ? { ...frame, ready: true } : frame));
    });
  }

  const label = TRMNL_LAYOUTS.find((l) => l.id === layout)?.label ?? layout;

  return (
    <div
      ref={boxRef}
      className={`relative w-full overflow-hidden rounded-md border border-border bg-white ${
        // A portrait X at 800px wide would be over 1000px tall.
        height > width ? 'max-w-[480px]' : 'max-w-[800px]'
      }`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {boxWidth !== null &&
        frames.map((frame) => (
          <iframe
            key={frame.id}
            title={`${scenario.label}: ${label} on ${deviceLabel}`}
            srcDoc={frame.doc}
            sandbox="allow-scripts"
            width={frame.width}
            height={frame.height}
            onLoad={() => setTimeout(() => settle(frame.id), SETTLE_MS)}
            className="absolute top-0 left-0 origin-top-left border-0 transition-opacity duration-150"
            style={{
              transform: `scale(${boxWidth / frame.width})`,
              opacity: frame.ready ? 1 : 0,
            }}
          />
        ))}
    </div>
  );
}
