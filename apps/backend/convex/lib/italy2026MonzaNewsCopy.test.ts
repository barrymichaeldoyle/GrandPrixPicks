import { describe, expect, it } from 'vitest';

import {
  ARON_ALPINE_FP1_BODY,
  ARON_ALPINE_FP1_HEADLINE,
  COLAPINTO_ALPINE_UPGRADE_BODY,
  FERRARI_ENGINE_UPGRADE_BODY,
} from './italy2026MonzaNewsCopy';

describe('italy2026MonzaNewsCopy', () => {
  it('uses the approved Alpine body without coaching from FP1', () => {
    expect(COLAPINTO_ALPINE_UPGRADE_BODY).toBe(
      "Gasly was the only Alpine driver with the new floor, diffuser, sidepods and rear wing at Zandvoort. Colapinto gets the same package at Monza. Gasly was six to nine tenths quicker in Friday practice and sprint qualifying, because he had the new parts. Saturday qualifying was only about two tenths, around what Alpine thought those parts were worth. They'll both have them this weekend, so expect Gasly and Colapinto to be closer.",
    );
    expect(COLAPINTO_ALPINE_UPGRADE_BODY).not.toMatch(
      /Compare them again from FP1/,
    );
    expect(COLAPINTO_ALPINE_UPGRADE_BODY).not.toMatch(/0\.6/);
  });

  it('drops the reported lap-time gain from the Ferrari body', () => {
    expect(FERRARI_ENGINE_UPGRADE_BODY).toBe(
      'Ferrari will run its ADUO2 power unit in both cars at Monza without grid penalties. Motorsport.com reports a gain of about 15 horsepower. Leclerc and Hamilton also get a more efficient rear wing and other Monza-specific changes.',
    );
    expect(FERRARI_ENGINE_UPGRADE_BODY).not.toMatch(/two tenths per lap/);
  });

  it('uses the approved Aron FP1 headline and body', () => {
    expect(ARON_ALPINE_FP1_HEADLINE).toBe(
      "Paul Aron replaces Gasly in Alpine's FP1",
    );
    expect(ARON_ALPINE_FP1_BODY).toBe(
      "Alpine reserve Paul Aron drives Gasly's car in FP1. Gasly returns for FP2. Use FP2 for your first look at Gasly with the Monza upgrade package both he and Colapinto are running.",
    );
    expect(ARON_ALPINE_FP1_BODY).not.toMatch(/Colapinto gets the same package/);
  });
});
