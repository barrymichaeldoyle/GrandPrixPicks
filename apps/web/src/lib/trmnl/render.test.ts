import { describe, expect, it } from 'vitest';

import {
  DITHER_SOURCE,
  qrCodeSvg,
  renderTrmnlMarkup,
  TRMNL_LAYOUTS,
  trmnlScreenDocument,
  trmnlScreenProfile,
} from './render';
import { TRMNL_SCENARIOS } from './scenarios';

describe('TRMNL layouts', () => {
  for (const scenario of TRMNL_SCENARIOS) {
    for (const layout of TRMNL_LAYOUTS) {
      it(`renders ${scenario.id} at ${layout.id}`, () => {
        const html = renderTrmnlMarkup(layout.id, scenario.payload);

        // Every layout carries the lead, or in the off-season the standings
        // and their champion.
        const { lead, standings } = scenario.payload;
        expect(html).toContain(
          lead?.value ?? standings?.title ?? 'No race scheduled.',
        );
        // An unrendered tag means a template the engine did not know.
        expect(html).not.toMatch(/{%|{{/);
        // A variable a layout forgot to pass. liquidjs renders some missing
        // names as 0 where TRMNL's Ruby Liquid renders nothing, so this is
        // also where the page and the device would quietly disagree.
        expect(html).not.toMatch(
          /class="(?:[^"]*\s)?(?:0|undefined|null)(?=\s|")/,
        );
      });
    }
  }

  it('puts the QR code on every layout that has something to link to', () => {
    for (const scenario of TRMNL_SCENARIOS) {
      for (const layout of TRMNL_LAYOUTS) {
        const html = renderTrmnlMarkup(layout.id, scenario.payload);
        expect(
          html.includes('class="qr-code"'),
          `${scenario.id} at ${layout.id}`,
        ).toBe(scenario.payload.has_race || !!scenario.payload.standings);
      }
    }
  });

  it('shows the champion and both tables in the off-season', () => {
    const offSeason = TRMNL_SCENARIOS.find((s) => s.id === 'off-season')!;
    const full = renderTrmnlMarkup('full', offSeason.payload);
    expect(full).toContain('Formula 1 2026 Standings');
    expect(full).toContain('Drivers');
    expect(full).toContain('Constructors');
    expect(offSeason.payload.standings?.drivers).toHaveLength(22);
    expect(offSeason.payload.standings?.constructors).toHaveLength(11);
    expect(full.match(/<tr>/g)).toHaveLength(33);
    expect(full).toContain('Arvid Lindblad');
    expect(full).toContain('Cadillac');
    expect(full).toContain('Pre-season testing dates confirmed');
    const quadrant = renderTrmnlMarkup('quadrant', offSeason.payload);
    expect(quadrant).toContain('2026 champion');
    expect(quadrant).toContain('Constructors: McLaren');
  });

  it('shows news headlines without source or affected session labels', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    const half = renderTrmnlMarkup('half_vertical', friday.payload);
    expect(half).toContain('Rain forecast for qualifying');
    expect(half).not.toContain('Sample weather service');
  });

  it('says there is no race when the off-season has no standings', () => {
    const offSeason = TRMNL_SCENARIOS.find((s) => s.id === 'off-season')!;
    const html = renderTrmnlMarkup('full', {
      ...offSeason.payload,
      standings: null,
    });
    expect(html).toContain('No race scheduled.');
  });

  it('marks the next session on the timeline', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    expect(renderTrmnlMarkup('full', friday.payload)).toContain('>Next<');
  });
});

describe('trmnlScreenDocument', () => {
  it("renders each screen with the Framework's own profile", () => {
    // Without these the Framework draws its default 1-bit 800x480 screen,
    // which is neither device.
    const { payload } = TRMNL_SCENARIOS[0];
    function screen(config: Parameters<typeof trmnlScreenDocument>[2]) {
      return trmnlScreenDocument('full', payload, config).match(
        /<div class="screen ([^"]+)">/,
      )?.[1];
    }
    expect(
      screen({ device: 'og', orientation: 'landscape', palette: '2bit' }),
    ).toBe('screen--ogv2 screen--md screen--2bit');
    expect(
      screen({ device: 'og', orientation: 'portrait', palette: '1bit' }),
    ).toBe('screen--og screen--md screen--1bit screen--portrait');
    expect(
      screen({ device: 'x', orientation: 'landscape', palette: '4bit' }),
    ).toBe('screen--v2 screen--lg screen--density-2x screen--4bit');
    expect(
      screen({
        device: 'og',
        orientation: 'landscape',
        palette: 'color-4bwry',
      }),
    ).toBe('screen--og screen--md screen--color-4bwry');
  });

  it('swaps the frame for portrait', () => {
    expect(
      trmnlScreenProfile({
        device: 'x',
        orientation: 'portrait',
        palette: '4bit',
      }),
    ).toMatchObject({ width: 1404, height: 1872 });
  });
});

describe('qrCodeSvg', () => {
  it('draws modules at the requested size with no quiet zone', () => {
    // 36 characters at level M fits version 3: 29 modules.
    const svg = qrCodeSvg('https://grandprixpicks.com/t/abc-2026/w', 3, 'm');
    expect(svg).toContain('width="87"');
    expect(svg).toContain('class="qr-code"');
  });
});

describe('the preview dithers images to the palette', () => {
  const ditherPixels = new Function(
    `${DITHER_SOURCE}; return ditherPixels;`,
  )() as (
    px: Uint8ClampedArray,
    w: number,
    h: number,
    inks: number[][],
    gray: boolean,
  ) => Uint8ClampedArray;

  function solid(rgb: number[], count: number) {
    return Uint8ClampedArray.from(
      Array.from({ length: count }, () => [...rgb, 255]).flat(),
    );
  }

  it("prints only the palette's inks", () => {
    const inks = [
      [0, 0, 0],
      [255, 255, 255],
    ];
    const out = ditherPixels(solid([0, 146, 70], 64), 8, 8, inks, true);
    const colours = new Set<string>();
    for (let i = 0; i < out.length; i += 4) {
      colours.add(`${out[i]},${out[i + 1]},${out[i + 2]}`);
    }
    expect([...colours].sort()).toEqual(['0,0,0', '255,255,255']);
  });

  it('keeps a mid gray as a mix of black and white', () => {
    const inks = [
      [0, 0, 0],
      [255, 255, 255],
    ];
    const out = ditherPixels(solid([128, 128, 128], 256), 16, 16, inks, true);
    let white = 0;
    for (let i = 0; i < out.length; i += 4) {
      white += out[i] === 255 ? 1 : 0;
    }
    expect(white / 256).toBeGreaterThan(0.4);
    expect(white / 256).toBeLessThan(0.6);
  });

  it('runs on every palette but full colour', () => {
    const payload = TRMNL_SCENARIOS[0].payload;
    for (const palette of [
      '1bit',
      '2bit',
      '4bit',
      'color-4bwry',
      'color-7a',
    ] as const) {
      expect(
        trmnlScreenDocument('full', payload, {
          device: 'og',
          orientation: 'landscape',
          palette,
        }),
      ).toContain('ditherScreenImages(');
    }
    expect(
      trmnlScreenDocument('full', payload, {
        device: 'og',
        orientation: 'landscape',
        palette: 'color-full',
      }),
    ).not.toContain('ditherScreenImages(');
  });
});

describe('the Liquid templates', () => {
  const sources = import.meta.glob<string>('../../../../trmnl/src/*.liquid', {
    query: '?raw',
    import: 'default',
    eager: true,
  });

  it('use no bracketed size the Framework does not generate', () => {
    // Bracketed pixel sizes stop at [128px]; a larger one silently does
    // nothing. That squeezed every flag on the X into the OG's width cap.
    for (const [path, text] of Object.entries(sources)) {
      for (const match of text.matchAll(/--(?:[a-z]+-)*\[(\d+)px\]/g)) {
        expect(Number(match[1]), `${match[0]} in ${path}`).toBeLessThanOrEqual(
          128,
        );
      }
    }
  });
});
