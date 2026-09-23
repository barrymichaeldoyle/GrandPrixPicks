import { createFileRoute } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { TabSwitch } from '@/components/TabSwitch';
import { setRaceDataCacheHeaders } from '@/lib/publicPageCacheHeaders';
import { pageMeta, siteConfig } from '@/lib/site';
import type { TrmnlLayout, TrmnlScreenConfig } from '@/lib/trmnl/render';
import type { TrmnlPreviewMessage } from '@/lib/trmnl/render';
import {
  defaultTrmnlPalette,
  TRMNL_LAYOUTS,
  TRMNL_PALETTES,
  TRMNL_PREVIEW_READY,
  TRMNL_PREVIEW_RENDER,
  TRMNL_PREVIEW_RENDERED,
  TRMNL_PREVIEW_SHELL,
  trmnlPreviewInks,
  trmnlScreenMarkup,
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

type Device = TrmnlScreenConfig['device'];
type Orientation = TrmnlScreenConfig['orientation'];
type Palette = TrmnlScreenConfig['palette'];

/** "published" is the moment's own news; a number is that many samples. */
type NewsChoice = 'published' | '0' | '1' | '2' | '10';

type TrmnlSearch = {
  scenario?: string;
  /** Sample headlines; absent means the news as published. */
  news?: 0 | 1 | 2 | 10;
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
    // A number, so the URL reads `news=10`: TanStack quotes a string that
    // looks like one.
    news: ([0, 1, 2, 10] as const).find((count) => count === search.news),
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

const NEWS_OPTIONS: { value: NewsChoice; label: string }[] = [
  { value: 'published', label: 'News as published' },
  { value: '0', label: 'No news' },
  { value: '1', label: '1 headline' },
  { value: '2', label: '2 headlines' },
  { value: '10', label: '10 headlines' },
];

function TrmnlPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { scenarios } = Route.useLoaderData();
  const moment =
    scenarios.find((s) => s.id === search.scenario) ?? scenarios[0];
  const newsChoice: NewsChoice =
    search.news === undefined ? 'published' : `${search.news}`;
  // Swap in the sample headlines and the focus they lead to; everything else
  // is the moment as it is.
  const scenario =
    newsChoice === 'published'
      ? moment
      : {
          ...moment,
          payload: { ...moment.payload, ...moment.news[newsChoice] },
        };
  const scenarioOptions = scenarios.map((s) => ({
    value: s.id,
    label: s.label,
  }));
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
            value={newsChoice}
            onChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  news:
                    value === 'published'
                      ? undefined
                      : (Number(value) as 0 | 1 | 2 | 10),
                }),
                replace: true,
              })
            }
            options={NEWS_OPTIONS}
            className="flex flex-wrap gap-1 rounded-lg bg-surface-muted/40 p-1"
            ariaLabel="News"
          />
        </div>

        {/* Two lines reserved, so a longer caption never moves the screen. */}
        <p className="mt-6 min-h-10 text-sm text-text-muted">
          {deviceProfile.label}, {deviceProfile.width}×{deviceProfile.height}.{' '}
          {moment.caption}
          {newsChoice === 'published' ? '' : ' Headlines are samples.'} Times in
          UK time.
        </p>

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

        <section
          aria-labelledby="trmnl-data-spec"
          className="mt-8 border-t border-border pt-6"
        >
          <h2 id="trmnl-data-spec" className="text-xl font-semibold text-text">
            What the plugin shows
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-text">Weekend</dt>
              <dd className="mt-1 text-text-muted">
                The current or next race, its circuit, round and session times
                in the device owner’s time zone. A race result stays up for 36
                hours.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">Weather</dt>
              <dd className="mt-1 text-text-muted">
                Session forecasts appear when current weather data is available.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">Results and grid</dt>
              <dd className="mt-1 text-text-muted">
                Practice shows the top three. Qualifying shows the top five;
                sprint and race results show the top ten. The confirmed grid
                appears when it is published.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">News</dt>
              <dd className="mt-1 text-text-muted">
                Published weekend headlines appear as space allows. The QR code
                opens the weekend write-up when available, or the race page.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-text">Between seasons</dt>
              <dd className="mt-1 text-text-muted">
                The full screen shows 22 drivers and 11 constructors from the
                championship standings.
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-sm text-text-muted">
            The preview replays earlier weekend moments. Headline counts other
            than “News as published” use sample headlines. Before the season
            ends, the off-season tab uses current standings and sample news.
          </p>
        </section>

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
 * The layouts point the flags at production, which is right for
 * TRMNL. Here they are served from wherever this page is, so a preview deploy
 * or `pnpm dev` shows assets that production does not have yet.
 */
function withLocalAssets(html: string): string {
  if (typeof window === 'undefined') {
    return html;
  }
  const origin = window.location.origin;
  return html.replaceAll(`${siteConfig.url}/flags/`, `${origin}/flags/`);
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

/** The two frames each screen alternates between; see `TrmnlScreen`. */
type Slot = { width: number; height: number };

/**
 * How long a screen may take before the spinner shows. A warm frame draws a
 * new screen in well under this, and a spinner that blinks on every tab
 * change reads as noise.
 */
const SPINNER_DELAY_MS = 400;

/**
 * One TRMNL screen at the device's own pixel size (800x480 for the OG,
 * 1872x1404 for the X), scaled down to the column. In an iframe because
 * TRMNL's Framework CSS is global and would restyle the site, and because its
 * JS (value fitting, headline clamping) expects a whole document.
 *
 * Each frame loads `TRMNL_PREVIEW_SHELL` once and is then sent screens by
 * message: loading a document per screen cost about two seconds a switch
 * (see the shell's comment). Two frames alternate, so a new screen is drawn
 * and fitted in the hidden one and shown only when it reports back; a screen
 * swapped in place would flash unfitted text. The second frame boots after
 * the first screen shows, so a first visit loads the Framework once, not twice.
 * A spinner covers any wait long enough to notice: a frame's first boot, or
 * a slow network.
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
  const markup = withLocalAssets(
    trmnlScreenMarkup(layout, scenario.payload, config),
  );
  // Held back until the flag is inlined, so it is never drawn first in colour
  // and then again dithered.
  const screen =
    flag === undefined
      ? null
      : flagUrl && flag
        ? markup.replaceAll(`src="${flagUrl}"`, `src="${flag}"`)
        : markup;
  const { inks, gray } = trmnlPreviewInks(config.palette);
  const inksKey = inks ? JSON.stringify(inks) : '';
  /** Everything that makes this screen look the way it does. */
  const screenKey =
    screen === null ? null : `${width}x${height}|${inksKey}|${screen}`;

  const boxRef = useRef<HTMLDivElement>(null);
  const frameRefs = useRef<(HTMLIFrameElement | null)[]>([null, null]);
  const booted = useRef([false, false]);
  const nextId = useRef(1);
  /** The latest screen asked for, and the frame drawing it. */
  const pending = useRef<{
    slot: number;
    key: string;
    size: Slot;
    message: TrmnlPreviewMessage;
  } | null>(null);
  const visibleRef = useRef<number | null>(null);
  const [boxWidth, setBoxWidth] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([{ width, height }]);
  const [visible, setVisible] = useState<number | null>(null);
  /** The key of the screen showing now. */
  const [shownKey, setShownKey] = useState<string | null>(null);
  /** The screen the spinner's delay ran out for, if it is still awaited. */
  const [slowKey, setSlowKey] = useState<string | null>(null);
  const waiting = screenKey === null || screenKey !== shownKey;
  const showSpinner = waiting && slowKey === screenKey;

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

  function send(slot: number, message: TrmnlPreviewMessage) {
    // The frame's origin is opaque, so no narrower target is possible; the
    // message is a public screen.
    frameRefs.current[slot]?.contentWindow?.postMessage(message, '*');
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const slot = frameRefs.current.findIndex(
        (frame) => frame !== null && frame.contentWindow === event.source,
      );
      const data = event.data as { type?: string; id?: number } | null;
      if (slot < 0 || !data) {
        return;
      }
      if (data.type === TRMNL_PREVIEW_READY) {
        booted.current[slot] = true;
        if (pending.current?.slot === slot) {
          send(slot, pending.current.message);
        }
      } else if (
        data.type === TRMNL_PREVIEW_RENDERED &&
        pending.current &&
        data.id === pending.current.message.id
      ) {
        const { key, size } = pending.current;
        pending.current = null;
        visibleRef.current = slot;
        setVisible(slot);
        setShownKey(key);
        setSlots((current) => {
          const next = current.map((existing, index) =>
            index === slot ? size : existing,
          );
          // The second frame boots once there is something on screen.
          return next.length === 2 ? next : [...next, size];
        });
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (screen === null || screenKey === null) {
      return;
    }
    const message: TrmnlPreviewMessage = {
      type: TRMNL_PREVIEW_RENDER,
      id: nextId.current++,
      screen,
      inks: inksKey ? (JSON.parse(inksKey) as number[][]) : null,
      gray,
    };
    // Draw into the hidden frame, or the first one before anything shows. A
    // second change before the first lands goes to the same frame, whose
    // queue draws them in order; only the latest is ever shown.
    const slot =
      visibleRef.current === null
        ? 0
        : (pending.current?.slot ??
          (frameRefs.current[1 - visibleRef.current]
            ? 1 - visibleRef.current
            : visibleRef.current));
    pending.current = {
      slot,
      key: screenKey,
      size: { width, height },
      message,
    };
    // The frame drawing it takes the new screen's size now, while it is
    // hidden; its state catches up when it is shown.
    const frame = frameRefs.current[slot];
    if (frame && slot !== visibleRef.current) {
      frame.width = String(width);
      frame.height = String(height);
    }
    if (booted.current[slot]) {
      send(slot, message);
    }
  }, [screen, screenKey, inksKey, gray, width, height]);

  useEffect(() => {
    if (!waiting || screenKey === null) {
      return;
    }
    const timer = setTimeout(() => setSlowKey(screenKey), SPINNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [waiting, screenKey]);

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
        slots.map((slot, index) => (
          <iframe
            // Keyed by position: a frame is never remounted, which is the
            // point of keeping it.
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            ref={(element) => {
              frameRefs.current[index] = element;
            }}
            title={`${scenario.label}: ${label} on ${deviceLabel}`}
            srcDoc={TRMNL_PREVIEW_SHELL}
            sandbox="allow-scripts"
            width={slot.width}
            height={slot.height}
            aria-hidden={visible !== index || undefined}
            tabIndex={visible === index ? undefined : -1}
            className={`absolute top-0 left-0 origin-top-left border-0 ${
              visible === index ? 'z-20' : 'z-0'
            }`}
            // Hidden by the cover below, never by opacity or visibility:
            // Chrome throttles animation frames in a cross-origin frame it
            // takes to be invisible, and the Framework's fitting pass waits on
            // them, so a transparent frame took four seconds to draw what a
            // covered one draws in a tenth of that.
            style={{ transform: `scale(${boxWidth / slot.width})` }}
          />
        ))}
      <div className="absolute inset-0 z-10 bg-white" />
      <div
        role="status"
        className={`pointer-events-none absolute top-2 right-2 z-30 rounded-full bg-black/70 p-1.5 text-white transition-opacity duration-150 ${
          showSpinner ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="sr-only">{showSpinner ? 'Loading screen' : ''}</span>
      </div>
    </div>
  );
}
