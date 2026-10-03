import { describe, expect, it } from 'vitest';

import {
  DITHER_SOURCE,
  qrCodeSvg,
  renderTrmnlMarkup,
  TRMNL_LAYOUTS,
  trmnlScreenDocument,
  trmnlScreenProfile,
} from './render';
import {
  sampleNewsVariant,
  TRMNL_NEWS_COUNTS,
  TRMNL_SCENARIOS,
} from './scenarios';

describe('TRMNL layouts', () => {
  it('falls back to news for missing or unknown focus', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    const populated = {
      ...friday.payload,
      ...sampleNewsVariant(friday.input, 2),
    };
    for (const focus of [undefined, null, '', 'unknown']) {
      const payload = { ...populated, focus } as unknown as typeof populated;
      expect(renderTrmnlMarkup('full', payload)).toContain(
        populated.news[0]!.headline,
      );
    }
  });

  it('omits empty standings leader and constructor labels', () => {
    const offSeason = TRMNL_SCENARIOS.find((s) => s.id === 'off-season')!;
    const payload = {
      ...offSeason.payload,
      standings: {
        ...offSeason.payload.standings!,
        drivers: [],
        constructors: [],
      },
    };
    for (const layout of ['half_horizontal', 'quadrant'] as const) {
      const html = renderTrmnlMarkup(layout, payload);
      expect(html).not.toContain('Constructors:');
      expect(html).not.toContain(payload.standings.leader_label);
    }
  });

  it('renders every layout with missing schedule and news', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    const payload = {
      ...friday.payload,
      focus: null,
      schedule: null,
      news: null,
    } as unknown as typeof friday.payload;
    for (const layout of TRMNL_LAYOUTS) {
      expect(() => renderTrmnlMarkup(layout.id, payload)).not.toThrow();
    }
    expect(renderTrmnlMarkup('full', payload)).toContain('No news yet.');
  });

  for (const scenario of TRMNL_SCENARIOS) {
    for (const layout of TRMNL_LAYOUTS) {
      it(`renders ${scenario.id} at ${layout.id}`, () => {
        const html = renderTrmnlMarkup(layout.id, scenario.payload);

        // Every layout carries the lead, or between rounds the coming rounds,
        // or in the off-season the standings and their champion.
        const { lead, standings, between_rounds } = scenario.payload;
        expect(html).toContain(
          between_rounds
            ? 'Coming up'
            : (lead?.value ?? standings?.title ?? 'No race scheduled.'),
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
          html.includes('class="qr-code'),
          `${scenario.id} at ${layout.id}`,
        ).toBe(scenario.payload.has_race || !!scenario.payload.standings);
        expect(html).not.toContain('Read more');
      }
    }
  });

  it('places one QR in the full-screen race header beside two lines of text', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    const full = renderTrmnlMarkup('full', friday.payload);
    // One line in landscape; in portrait the separator goes and the round
    // and dates drop below the circuit.
    expect(full).toContain(
      'Autodromo Nazionale Monza<span class="portrait:hidden">&nbsp;·&nbsp;</span>',
    );
    expect(full).toContain('>Round 16 · ');
    expect(full).toContain(
      'title--large portrait:title--small lg:text--xxxlarge',
    );
    expect(full).toContain(
      'label--base portrait:label--small lg:label--xlarge',
    );
    expect(full.indexOf('class="qr-code w--[56px]')).toBeLessThan(
      full.indexOf('data-clamp="2"'),
    );
    for (const scenario of TRMNL_SCENARIOS.filter((s) => s.payload.has_race)) {
      expect(
        renderTrmnlMarkup('full', scenario.payload).match(/class="qr-code/g),
        scenario.id,
      ).toHaveLength(1);
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

  it('says there is no news, or shows the sessions where it has room', () => {
    const buildUp = TRMNL_SCENARIOS.find((s) => s.id === 'build-up')!;
    const empty = {
      ...buildUp.payload,
      ...sampleNewsVariant(buildUp.input, 0),
    };
    const full = renderTrmnlMarkup('full', empty);
    expect(full).toContain('No news yet.');
    expect(full).toContain('class="qr-code w--[56px]');
    const halfVertical = renderTrmnlMarkup('half_vertical', empty);
    expect(halfVertical).not.toContain('No news yet.');
    expect(halfVertical).toContain('class="qr-code"');
    // Half, top or bottom has no timeline of its own, so it shows that.
    const half = renderTrmnlMarkup('half_horizontal', empty);
    expect(half).not.toContain('No news yet.');
    expect(half).toContain('FP1');
  });

  it('shows the drivers championship in place of an empty news column', () => {
    const buildUp = TRMNL_SCENARIOS.find((s) => s.id === 'build-up')!;
    const offSeason = TRMNL_SCENARIOS.find((s) => s.id === 'off-season')!;
    const input = { ...buildUp.input, standings: offSeason.input.standings };
    const empty = {
      ...buildUp.payload,
      ...sampleNewsVariant(input, 0),
    };
    expect(empty.focus).toBe('standings');
    const full = renderTrmnlMarkup('full', empty);
    expect(full).toContain("Drivers' Championship");
    expect(full).toContain(`>${empty.standings!.drivers.at(-1)!.code}<`);
    expect(full).not.toContain('No news yet.');
    // Only the full screen has a news column to fill.
    expect(renderTrmnlMarkup('half_vertical', empty)).not.toContain(
      "Drivers' Championship",
    );
  });

  it('passes twenty headline candidates to large-screen overflow layouts', () => {
    const buildUp = TRMNL_SCENARIOS.find((s) => s.id === 'build-up')!;
    const variant = sampleNewsVariant(buildUp.input, 20);
    expect(variant.news).toHaveLength(20);
    expect(variant.focus).toBe('news');
    const full = renderTrmnlMarkup('full', { ...buildUp.payload, ...variant });
    expect(full.match(/data-clamp="2"/g)).toHaveLength(28);
    expect(full.match(/class="divider divider--h"/g)).toHaveLength(25);
    expect(full).toContain('class="grow lg:hidden"');
    expect(full).toContain('class="grow hidden lg:block lg:portrait:hidden"');
    expect(full).toContain('h--full flex--left flex--center-y');
    expect(full).toContain('FP1');
    expect(full).toContain('Race');
    const halfHorizontal = renderTrmnlMarkup('half_horizontal', {
      ...buildUp.payload,
      ...variant,
    });
    expect(halfHorizontal.match(/data-clamp="2"/g)).toHaveLength(5);
    expect(halfHorizontal.match(/class="divider divider--h"/g)).toHaveLength(3);
    expect(halfHorizontal).toContain('FP1');
    expect(halfHorizontal).toContain('Race');
    const halfVertical = renderTrmnlMarkup('half_vertical', {
      ...buildUp.payload,
      ...variant,
    });
    // One headline on the landscape OG, three each on the portrait OG and on
    // the X in landscape and in portrait.
    expect(halfVertical.match(/data-clamp="2"/g)).toHaveLength(10);
    expect(halfVertical.match(/class="divider divider--h"/g)).toHaveLength(6);
    expect(halfVertical).toContain('Race');
    expect(halfVertical).toContain('Quali');
  });

  it('offers headlines to the quarter layout overflow manager', () => {
    const buildUp = TRMNL_SCENARIOS.find((s) => s.id === 'build-up')!;
    const variant = sampleNewsVariant(buildUp.input, 20);
    const quadrant = renderTrmnlMarkup('quadrant', {
      ...buildUp.payload,
      ...variant,
    });
    expect(quadrant.match(/data-clamp="2"/g)).toHaveLength(4);
    expect(quadrant.match(/data-clamp="3"/g)).toHaveLength(1);
    expect(quadrant.match(/class="divider divider--h"/g)).toHaveLength(1);
    expect(quadrant).toContain('flex--col flex--stretch-x gap--auto');
    expect(quadrant).toContain(buildUp.payload.lead!.value);
    expect(quadrant.indexOf(buildUp.payload.lead!.value)).toBeLessThan(
      quadrant.indexOf(variant.news[0]!.headline),
    );
  });

  it('keeps the starting grid when the news is swapped for samples', () => {
    const raceMorning = TRMNL_SCENARIOS.find((s) => s.id === 'race-morning')!;
    for (const count of TRMNL_NEWS_COUNTS) {
      const variant = sampleNewsVariant(raceMorning.input, count);
      expect(variant.focus, `${count}`).toBe('grid');
      expect(variant.news, `${count}`).toHaveLength(Math.min(count, 20));
    }
  });

  it('uses one responsive dithered flag for OG and X', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    const html = renderTrmnlMarkup('full', friday.payload);
    expect(html).toContain('class="image image-dither shrink-0 w--auto');
    expect(html.match(/<img[^>]+src="[^"]*flags[^"]*"/g)).toHaveLength(1);
    expect(html).not.toContain('image-gray-x');
  });

  it('says there is no race when the off-season has no standings', () => {
    const offSeason = TRMNL_SCENARIOS.find((s) => s.id === 'off-season')!;
    const html = renderTrmnlMarkup('full', {
      ...offSeason.payload,
      standings: null,
    });
    expect(html).toContain('No race scheduled.');
  });

  it('shows the whole classification, news and next race once the race is in', () => {
    const finished = TRMNL_SCENARIOS.find((s) => s.id === 'finished')!;
    const full = renderTrmnlMarkup('full', finished.payload);
    const rows = finished.payload.result!.rows;
    expect(full).toContain(`>${rows.at(-1)!.code}<`);
    expect(full).toContain('>P1<');
    expect(full).toContain('>DNF<');
    expect(full).toContain('>1:17:32.207<');
    expect(full).toContain('>+2.873<');
    expect(full).toContain('>+1 lap<');
    expect(full).toContain('Next race');
    expect(full).toContain(finished.payload.next_race!.name);
    // The weekend is over: no timeline.
    expect(full).not.toContain('>Next<');
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

describe('the Theme setting', () => {
  const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;

  it('is light unless dark is chosen', () => {
    for (const { id } of TRMNL_LAYOUTS) {
      const light = renderTrmnlMarkup(id, friday.payload);
      expect(light).not.toContain('inverse');
      expect(light).not.toContain(' invert');
      expect(light).not.toContain('<script');
    }
  });

  it('darkens every layout, its title bar and its weather icons', () => {
    for (const { id } of TRMNL_LAYOUTS) {
      const dark = renderTrmnlMarkup(id, friday.payload, 'dark');
      expect(dark).toMatch(/class="inverse bg--canvas layout /);
      expect(dark).toContain('class="title_bar inverse bg--canvas"');
      expect(dark).toMatch(/<img class="image image-dither [^"]* invert"/);
      expect(dark).toContain("view.classList.add('inverse', 'bg--canvas')");
    }
  });

  it('draws the dark logo as white bars on its own black square', () => {
    // TRMNL dithers the icon onto white: white bars alone would vanish.
    function logo(markup: string) {
      const data = markup.match(
        /<div class="title_bar[^"]*">\s*<img [^>]*src="data:image\/svg\+xml;base64,([^"]+)"/,
      )![1];
      return Buffer.from(data, 'base64').toString();
    }
    expect(logo(renderTrmnlMarkup('full', friday.payload))).toContain(
      '<g fill="#000"',
    );
    const dark = logo(renderTrmnlMarkup('full', friday.payload, 'dark'));
    expect(dark).toContain('<rect width="32" height="32" fill="#000"/>');
    expect(dark).toContain('<g fill="#fff"');
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
    diffuse?: boolean,
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

  it('quantizes unmarked images without diffusion speckle', () => {
    const inks = Array.from({ length: 16 }, (_, i) => {
      const gray = i * 17;
      return [gray, gray, gray];
    });
    const out = ditherPixels(solid([0, 146, 70], 64), 8, 8, inks, true, false);
    const colours = new Set<string>();
    for (let i = 0; i < out.length; i += 4) {
      colours.add(`${out[i]},${out[i + 1]},${out[i + 2]}`);
    }
    expect(colours.size).toBe(1);
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
