import { describe, expect, it } from 'vitest';

import {
  ANTONELLI_MONZA_PENALTY_BODY,
  ARON_MONZA_FP1_BODY,
  BROWNING_WILLIAMS_FP1_BODY,
  COLAPINTO_ALPINE_UPGRADE_BODY,
  FERRARI_ENGINE_UPGRADE_BODY,
  HADJAR_DUTCH_GP_LINEUP_NOTE,
  HADJAR_MONZA_ABSENCE_BODY,
  HERTA_MONZA_FP1_BODY,
  IWASA_MONZA_FP1_BODY,
  MERCEDES_MONZA_TOW_BODY,
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

  it('keeps Hadjar and Iwasa as separate race and FP1 stories', () => {
    expect(HADJAR_MONZA_ABSENCE_BODY).toBe(
      "Hadjar will miss a second race with the left-wrist injury that kept him out at Zandvoort. Lawson stays alongside Verstappen at Red Bull, while Tsunoda stays alongside Lindblad at Racing Bulls. Red Bull is giving Hadjar more recovery time rather than risking the wrist on Monza's kerbs.",
    );
    expect(IWASA_MONZA_FP1_BODY).toBe(
      'Iwasa replaces Verstappen in FP1 as Red Bull fulfils a rookie-session requirement. Verstappen returns for FP2 and remains in the race line-up.',
    );
    expect(HADJAR_DUTCH_GP_LINEUP_NOTE).toContain(
      'Hadjar will also miss Monza',
    );
  });

  it('keeps the four FP1 bodies from repeating each other', () => {
    expect(HERTA_MONZA_FP1_BODY).toBe(
      'It is Herta\u2019s third FP1 of the season for Cadillac, after Barcelona and Hungary. Perez is back in the car from FP2, so Friday morning is not a read on his pace.',
    );
    expect(ARON_MONZA_FP1_BODY).toBe(
      'Gasly is back in the car from FP2 and the rest of the weekend. Aron then works the Enstone simulator that evening to help fine-tune the set-up.',
    );

    // Monza carries four FP1 cards. They cannot avoid sharing the fact that
    // the race driver is back for FP2, but the sentence carrying it should not
    // be the same sentence four times: a reader who has met it twice stops
    // reading the third and fourth cards.
    const openers = [
      HERTA_MONZA_FP1_BODY,
      ARON_MONZA_FP1_BODY,
      IWASA_MONZA_FP1_BODY,
    ].map((body) => body.split('. ')[0]);
    expect(new Set(openers).size).toBe(openers.length);
  });

  it('leaves the Alpine upgrade to its own card', () => {
    // The source says both Alpines run the Zandvoort package and that Aron
    // does simulator work afterwards. It does not say Alpine wants his read on
    // the package, and `colapinto-alpine-upgrade` already tells that story.
    expect(ARON_MONZA_FP1_BODY).not.toMatch(/upgrade|package|floor|diffuser/i);
  });

  it('reports the news before it addresses a pick', () => {
    // The write-up page renders these bodies under "What changed this
    // weekend", so each card opens on what happened. The sentence about how
    // to read the session comes second where it is worth keeping at all, and
    // the two bodies that closed with an instruction no longer do: the
    // section's scoring note and each card's "How these are scored" link
    // already carry that.
    expect(ANTONELLI_MONZA_PENALTY_BODY).not.toMatch(
      /Qualifying picks use|Treat Russell/,
    );
    expect(BROWNING_WILLIAMS_FP1_BODY).not.toMatch(/Use FP2/);
    expect(HERTA_MONZA_FP1_BODY.split('. ')[0]).toMatch(/third FP1/);
  });

  it('keeps the qualifying tow off the penalty card', () => {
    // One sourceUrl per record. The penalty item cites Motorsport.com, which
    // does not carry the Thursday tow quotes, so the tow is its own item with
    // its own F1.com source and its own narrower affectsSessions.
    expect(ANTONELLI_MONZA_PENALTY_BODY).not.toMatch(/tow|slipstream/i);
    expect(MERCEDES_MONZA_TOW_BODY).toMatch(/tow for Russell in qualifying/);
    expect(MERCEDES_MONZA_TOW_BODY).toMatch(/straight mode/);
    // 2026 terminology: there is no DRS to name.
    expect(MERCEDES_MONZA_TOW_BODY).not.toMatch(/DRS/);
  });
});
