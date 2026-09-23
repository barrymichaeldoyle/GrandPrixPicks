import { Liquid } from 'liquidjs';
import qrcode from 'qrcode-generator';

import type { TrmnlPayload } from './payload';

/**
 * Renders the TRMNL plugin's real Liquid layouts (`apps/trmnl/src`) in
 * JavaScript, for the `/trmnl` page and the render tests.
 *
 * TRMNL itself renders with Ruby Liquid plus two extensions of its own, which
 * are reproduced here:
 *
 * - `{% template name %}…{% endtemplate %}` in `shared.liquid` defines a block
 *   that the layouts `{% render %}`. Here the blocks are lifted out into
 *   liquidjs's in-memory templates, which is what `render` already reads.
 * - `qr_code` draws a QR code as SVG. Same contract as TRMNL's filter
 *   (`module_size`, then error-correction level, default H), and the same
 *   shape of output: black modules, no quiet zone, `class="qr-code"`.
 *
 * liquidjs and Ruby Liquid agree on everything these templates use (for,
 * limit/offset, unless, join, plus, divided_by), but they are not the same
 * engine. A template that renders here and breaks on TRMNL is possible in
 * principle; the device is the final check.
 */

export type TrmnlLayout =
  | 'full'
  | 'half_horizontal'
  | 'half_vertical'
  | 'quadrant';

export const TRMNL_LAYOUTS: readonly { id: TrmnlLayout; label: string }[] = [
  { id: 'full', label: 'Full screen' },
  { id: 'half_horizontal', label: 'Half, top or bottom' },
  { id: 'half_vertical', label: 'Half, left or right' },
  { id: 'quadrant', label: 'Quarter' },
];

export type TrmnlDevice = 'og' | 'og-1bit' | 'x' | 'x-portrait';

/**
 * The two TRMNL devices, as the Framework's device profiles
 * (trmnl.com/framework/docs/3.3/devices). On the platform the screen class is
 * supplied for us; here it has to be spelled out, or the Framework renders its
 * default 1-bit 800x480 screen, which is neither.
 *
 * The X is not just a bigger OG: it lays out at 1040x780 CSS pixels and the
 * Framework then scales the whole screen by its 1.8 pixel ratio to the
 * panel's 1872x1404, so `width`/`height` here are the panel's, the size the
 * frame has to be. It is 4:3 rather than 5:3, has 16 grays, and its 2x
 * density swaps TRMNL's pixel fonts for Inter.
 */
export const TRMNL_DEVICES: readonly {
  id: TrmnlDevice;
  label: string;
  screenClass: string;
  width: number;
  height: number;
}[] = [
  {
    id: 'og',
    label: 'TRMNL OG',
    screenClass: 'screen--ogv2 screen--md screen--2bit',
    width: 800,
    height: 480,
  },
  {
    // An OG set to the black-and-white palette. TRMNL's reviewers check
    // gray text here, which is why every gray label has `1bit:text--black`.
    id: 'og-1bit',
    label: 'TRMNL OG 1-bit',
    screenClass: 'screen--og screen--md screen--1bit',
    width: 800,
    height: 480,
  },
  {
    id: 'x',
    label: 'TRMNL X',
    screenClass: 'screen--v2 screen--lg screen--density-2x screen--4bit',
    width: 1872,
    height: 1404,
  },
  {
    // TRMNL's reviewers preview every layout on the X in portrait too.
    // `screen--portrait` swaps the screen's dimensions.
    id: 'x-portrait',
    label: 'TRMNL X portrait',
    screenClass:
      'screen--v2 screen--lg screen--density-2x screen--4bit screen--portrait',
    width: 1404,
    height: 1872,
  },
];

const SOURCES = import.meta.glob<string>('../../../../trmnl/src/*.liquid', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function source(name: string): string {
  const entry = Object.entries(SOURCES).find(([path]) =>
    path.endsWith(`/${name}.liquid`),
  );
  if (!entry) {
    throw new Error(`Missing TRMNL template: ${name}.liquid`);
  }
  return entry[1];
}

const TEMPLATE_BLOCK =
  /{%-?\s*template\s+(\w+)\s*-?%}([\s\S]*?){%-?\s*endtemplate\s*-?%}/g;

function splitShared(shared: string) {
  const templates: Record<string, string> = {};
  const rest = shared.replace(TEMPLATE_BLOCK, (_match, name, body) => {
    templates[name as string] = body as string;
    return '';
  });
  return { templates, rest };
}

const QR_LEVELS = { l: 'L', m: 'M', q: 'Q', h: 'H' } as const;

/** TRMNL's `qr_code` filter: `{{ url | qr_code: module_size, level }}`. */
export function qrCodeSvg(data: string, size = 11, level = ''): string {
  const qr = qrcode(
    0,
    QR_LEVELS[level.toLowerCase() as keyof typeof QR_LEVELS] ?? 'H',
  );
  qr.addData(String(data));
  qr.make();
  const count = qr.getModuleCount();
  const px = count * size;
  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col * size} ${row * size}h${size}v${size}h-${size}z`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" shape-rendering="crispEdges" class="qr-code"><rect width="${px}" height="${px}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

let engine: { liquid: Liquid; sharedRest: string } | null = null;

function getEngine() {
  if (!engine) {
    const { templates, rest } = splitShared(source('shared'));
    const liquid = new Liquid({ templates, strictFilters: true });
    liquid.registerFilter('qr_code', qrCodeSvg);
    engine = { liquid, sharedRest: rest };
  }
  return engine;
}

/**
 * One layout's markup, exactly as TRMNL would build it: the Shared tab's
 * content first, then the layout. `trmnl` is the platform's own variable; only
 * the fields the templates read are supplied.
 */
export function renderTrmnlMarkup(
  layout: TrmnlLayout,
  payload: TrmnlPayload,
): string {
  const { liquid, sharedRest } = getEngine();
  return liquid.parseAndRenderSync(`${sharedRest}\n${source(layout)}`, {
    ...payload,
    trmnl: { user: { time_zone_iana: 'Europe/London', locale: 'en' } },
  }) as string;
}

const MASHUPS: Record<TrmnlLayout, { mashup: string | null; slots: number }> = {
  full: { mashup: null, slots: 1 },
  half_horizontal: { mashup: 'mashup--1Tx1B', slots: 2 },
  half_vertical: { mashup: 'mashup--1Lx1R', slots: 2 },
  quadrant: { mashup: 'mashup--2x2', slots: 4 },
};

/**
 * A whole screen as TRMNL composes it on the given device, for an iframe. A half or
 * quarter layout sits in its mashup with the other slots marked as someone
 * else's plugin, because that is how an owner actually sees it.
 *
 * TRMNL's Framework CSS and JS load from trmnl.com, as they do on the device:
 * the JS is what clamps long headlines and fits the large values.
 */
export function trmnlScreenDocument(
  layout: TrmnlLayout,
  payload: TrmnlPayload,
  device: TrmnlDevice = 'og',
): string {
  const { screenClass } =
    TRMNL_DEVICES.find((d) => d.id === device) ?? TRMNL_DEVICES[0];
  const ours = `<div class="view view--${layout}">${renderTrmnlMarkup(layout, payload)}</div>`;
  const { mashup, slots } = MASHUPS[layout];
  const other = `<div class="view view--${layout}"><div class="layout layout--col layout--center"><span class="label label--gray">Another plugin</span></div></div>`;
  const screen = mashup
    ? `<div class="mashup ${mashup}">${ours}${other.repeat(slots - 1)}</div>`
    : ours;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://trmnl.com/css/latest/plugins.css"><script src="https://trmnl.com/js/latest/plugins.js"></script></head><body class="environment trmnl"><div class="screen ${screenClass}">${screen}</div></body></html>`;
}
