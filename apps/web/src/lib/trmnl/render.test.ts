import { describe, expect, it } from 'vitest';

import {
  qrCodeSvg,
  renderTrmnlMarkup,
  TRMNL_LAYOUTS,
  trmnlScreenDocument,
} from './render';
import { TRMNL_SCENARIOS } from './scenarios';

describe('TRMNL layouts', () => {
  for (const scenario of TRMNL_SCENARIOS) {
    for (const layout of TRMNL_LAYOUTS) {
      it(`renders ${scenario.id} at ${layout.id}`, () => {
        const html = renderTrmnlMarkup(layout.id, scenario.payload);

        // Every layout carries the lead, or says there is no race.
        const lead = scenario.payload.lead;
        expect(html).toContain(lead ? lead.value : 'No race scheduled.');
        // An unrendered tag means a template the engine did not know.
        expect(html).not.toMatch(/{%|{{/);
        // A variable a layout forgot to pass. liquidjs renders some missing
        // names as 0 where TRMNL's Ruby Liquid renders nothing, so this is
        // also where the page and the device would quietly disagree.
        expect(html).not.toMatch(/class="[^"]*\b(0|undefined|null)\b/);
      });
    }
  }

  it('puts the QR code on every layout whenever there is a race', () => {
    for (const scenario of TRMNL_SCENARIOS) {
      for (const layout of TRMNL_LAYOUTS) {
        const html = renderTrmnlMarkup(layout.id, scenario.payload);
        expect(
          html.includes('class="qr-code"'),
          `${scenario.id} at ${layout.id}`,
        ).toBe(scenario.payload.has_race);
      }
    }
  });

  it('marks the next session on the timeline', () => {
    const friday = TRMNL_SCENARIOS.find((s) => s.id === 'friday')!;
    expect(renderTrmnlMarkup('full', friday.payload)).toContain('>Next<');
  });
});

describe('trmnlScreenDocument', () => {
  it("renders each device with the Framework's own profile", () => {
    // Without these the Framework draws its default 1-bit 800x480 screen,
    // which is neither device.
    const { payload } = TRMNL_SCENARIOS[0];
    expect(trmnlScreenDocument('full', payload, 'og')).toContain(
      'class="screen screen--ogv2 screen--md screen--2bit"',
    );
    expect(trmnlScreenDocument('full', payload, 'x')).toContain(
      'class="screen screen--v2 screen--lg screen--density-2x screen--4bit"',
    );
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
