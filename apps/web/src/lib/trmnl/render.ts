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

export type TrmnlDevice = 'og' | 'x';
type TrmnlOrientation = 'landscape' | 'portrait';
/**
 * The Framework's rendering modes (trmnl.com/framework/docs/3.3/color_palettes).
 * Grayscale: 1-bit (black and white), 2-bit (4 grays, the OG's own) and 4-bit
 * (16 grays, the X's own); an owner can choose a lower one per playlist item.
 * Colour: the OG's black/white/red/yellow panel, 7-colour e-paper (Inkplate,
 * Inky Impression) and full colour (tablets and other colour screens), which
 * TRMNL serves through bring-your-own-device.
 */
export type TrmnlPalette =
  | '1bit'
  | '2bit'
  | '4bit'
  | 'color-4bwry'
  | 'color-7a'
  | 'color-full';

export const TRMNL_PALETTES: readonly { id: TrmnlPalette; label: string }[] = [
  { id: '1bit', label: 'Black & white' },
  { id: '2bit', label: '4 grays' },
  { id: '4bit', label: '16 grays' },
  { id: 'color-4bwry', label: 'B/W/R/Y' },
  { id: 'color-7a', label: '7 colours' },
  { id: 'color-full', label: 'Full colour' },
];

/** Each device's own palette, when an owner has not chosen another. */
export function defaultTrmnlPalette(device: TrmnlDevice): TrmnlPalette {
  return device === 'og' ? '2bit' : '4bit';
}

export type TrmnlScreenConfig = {
  device: TrmnlDevice;
  orientation: TrmnlOrientation;
  palette: TrmnlPalette;
};

const DEFAULT_SCREEN_CONFIG: TrmnlScreenConfig = {
  device: 'og',
  orientation: 'landscape',
  palette: '2bit',
};

/**
 * The screen a TRMNL owner can actually have: a device, turned either way,
 * on either palette. These are the Framework's device profiles
 * (trmnl.com/framework/docs/3.3/devices). On the platform the screen class is
 * supplied for us; here it has to be spelled out, or the Framework renders its
 * default 1-bit 800x480 screen, which is neither device.
 *
 * - The OG is 800x480. Its 2-bit profile is `screen--ogv2`; on any other
 *   palette, including the B/W/R/Y colour OG, it is `screen--og`.
 * - The X lays out at 1040x780 CSS pixels and the Framework then scales the
 *   whole screen by its 1.8 pixel ratio to the panel's 1872x1404, so the size
 *   returned is the panel's, the size the frame has to be. Its 2x density
 *   swaps TRMNL's pixel fonts for Inter.
 * - `screen--portrait` swaps the dimensions. TRMNL's reviewers check every
 *   layout on the X in portrait, and on the OG and X in landscape.
 * - The palette is the rendering-mode class (`screen--2bit`,
 *   `screen--color-4bwry`...). Labels are gray only on 2-bit and 4-bit,
 *   where the ink has real grays; 1-bit and colour would dither them.
 */
export function trmnlScreenProfile(config: TrmnlScreenConfig): {
  label: string;
  screenClass: string;
  width: number;
  height: number;
} {
  const og = config.device === 'og';
  const portrait = config.orientation === 'portrait';
  const classes = og
    ? [config.palette === '2bit' ? 'screen--ogv2' : 'screen--og', 'screen--md']
    : ['screen--v2', 'screen--lg', 'screen--density-2x'];
  classes.push(`screen--${config.palette}`);
  if (portrait) {
    classes.push('screen--portrait');
  }
  const [long, short] = og ? [800, 480] : [1872, 1404];
  return {
    label: [
      og ? 'TRMNL OG' : 'TRMNL X',
      portrait ? 'portrait' : null,
      // Mid-sentence: "black & white", but "B/W/R/Y" keeps its capitals.
      TRMNL_PALETTES.find((p) => p.id === config.palette)?.label.replace(
        /^[A-Z](?=[a-z])/,
        (first) => first.toLowerCase(),
      ),
    ]
      .filter(Boolean)
      .join(', '),
    screenClass: classes.join(' '),
    width: portrait ? short : long,
    height: portrait ? long : short,
  };
}

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

/**
 * Each palette's inks, for the preview's stand-in for TRMNL's image
 * dithering. Grays are evenly spaced levels; the colour inks are nominal, and
 * a real panel's are duller. Full colour has none: it prints what it is given.
 */
const PALETTE_INKS: Record<TrmnlPalette, number[][] | null> = {
  '1bit': grays(2),
  '2bit': grays(4),
  '4bit': grays(16),
  'color-4bwry': [
    [0, 0, 0],
    [255, 255, 255],
    [255, 0, 0],
    [255, 255, 0],
  ],
  'color-7a': [
    [0, 0, 0],
    [255, 255, 255],
    [0, 255, 0],
    [0, 0, 255],
    [255, 0, 0],
    [255, 255, 0],
    [255, 128, 0],
  ],
  'color-full': null,
};

function grays(levels: number): number[][] {
  return Array.from({ length: levels }, (_, i) => {
    const v = Math.round((255 * i) / (levels - 1));
    return [v, v, v];
  });
}

/**
 * The preview's stand-in for TRMNL's dithering of `image-dither` images.
 *
 * The Framework only marks an image for dithering; TRMNL's renderer does it,
 * when it draws the screen for the device, and neither the Framework CSS nor
 * its JS dithers. Without this every flag showed in full colour on a 1-bit
 * or grayscale screen. Floyd-Steinberg to the nearest ink, at the image's
 * size in panel pixels, which is what the device prints; grayscale palettes
 * compare on luminance.
 *
 * A string rather than a function's `toString()`, because a bundler may
 * rewrite a function's source (helper calls, renamed globals) and this runs
 * inside the screen's own document. The render tests evaluate this string.
 */
export const DITHER_SOURCE = `
function ditherPixels(px, w, h, inks, gray) {
  var buf = new Float32Array(w * h * 3);
  for (var i = 0; i < w * h; i++) {
    var r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], a = px[i * 4 + 3] / 255;
    r = r * a + 255 * (1 - a); g = g * a + 255 * (1 - a); b = b * a + 255 * (1 - a);
    if (gray) { r = g = b = 0.299 * r + 0.587 * g + 0.114 * b; }
    buf[i * 3] = r; buf[i * 3 + 1] = g; buf[i * 3 + 2] = b;
  }
  function spread(x, y, er, eg, eb, f) {
    if (x < 0 || x >= w || y >= h) return;
    var j = (y * w + x) * 3;
    buf[j] += er * f; buf[j + 1] += eg * f; buf[j + 2] += eb * f;
  }
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var k = (y * w + x) * 3, best = inks[0], bestD = Infinity;
      for (var n = 0; n < inks.length; n++) {
        var dr = buf[k] - inks[n][0], dg = buf[k + 1] - inks[n][1], db = buf[k + 2] - inks[n][2];
        var d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = inks[n]; }
      }
      var er = buf[k] - best[0], eg = buf[k + 1] - best[1], eb = buf[k + 2] - best[2];
      var o = (y * w + x) * 4;
      px[o] = best[0]; px[o + 1] = best[1]; px[o + 2] = best[2]; px[o + 3] = 255;
      spread(x + 1, y, er, eg, eb, 7 / 16);
      spread(x - 1, y + 1, er, eg, eb, 3 / 16);
      spread(x, y + 1, er, eg, eb, 5 / 16);
      spread(x + 1, y + 1, er, eg, eb, 1 / 16);
    }
  }
  return px;
}
function ditherScreenImages(inks, gray) {
  var images = document.querySelectorAll('img.image-dither');
  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    if (img.dataset.dithered || !img.complete || !img.naturalWidth) continue;
    // Panel pixels: the X's screen is scaled up by the Framework, and the
    // flag's 1px frame is a border, not part of the image.
    var scale = img.getBoundingClientRect().width / img.offsetWidth;
    var w = Math.round(img.clientWidth * scale), h = Math.round(img.clientHeight * scale);
    if (!w || !h) continue;
    try {
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h);
      ditherPixels(data.data, w, h, inks, gray);
      ctx.putImageData(data, 0, 0);
      img.dataset.dithered = '1';
      img.style.imageRendering = 'pixelated';
      img.src = canvas.toDataURL();
    } catch (e) {
      /* An image the canvas cannot read stays as it is. */
    }
  }
}
`;

/** The script a preview document runs for its palette, or '' for full colour. */
function ditherScript(palette: TrmnlPalette): string {
  const inks = PALETTE_INKS[palette];
  if (!inks) {
    return '';
  }
  const gray = !palette.startsWith('color-');
  return `<script>${DITHER_SOURCE}window.addEventListener('load',function(){ditherScreenImages(${JSON.stringify(inks)},${gray});});</script>`;
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
 * the JS is what clamps long headlines and fits the large values. Images marked
 * `image-dither` are dithered to the palette, standing in for the platform
 * (`DITHER_SOURCE`); the caller has to give them a readable source, since the
 * sandboxed document cannot read pixels from another origin.
 */
export function trmnlScreenDocument(
  layout: TrmnlLayout,
  payload: TrmnlPayload,
  config: TrmnlScreenConfig = DEFAULT_SCREEN_CONFIG,
): string {
  const { screenClass } = trmnlScreenProfile(config);
  const ours = `<div class="view view--${layout}">${renderTrmnlMarkup(layout, payload)}</div>`;
  const { mashup, slots } = MASHUPS[layout];
  const other = `<div class="view view--${layout}"><div class="layout layout--col layout--center"><span class="label label--gray">Another plugin</span></div></div>`;
  const screen = mashup
    ? `<div class="mashup ${mashup}">${ours}${other.repeat(slots - 1)}</div>`
    : ours;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://trmnl.com/css/latest/plugins.css"><script src="https://trmnl.com/js/latest/plugins.js"></script>${ditherScript(config.palette)}</head><body class="environment trmnl"><div class="screen ${screenClass}">${screen}</div></body></html>`;
}
