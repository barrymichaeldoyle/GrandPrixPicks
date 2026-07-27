import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import {
  describeClassificationChange,
  resolveOfficialClassification,
} from './classificationDiff';

function driver(code: string): Id<'drivers'> {
  return code as unknown as Id<'drivers'>;
}

const VER = driver('VER');
const NOR = driver('NOR');
const PIA = driver('PIA');
const LEC = driver('LEC');
const HAM = driver('HAM');
const RUS = driver('RUS');
const ANT = driver('ANT');
const SAI = driver('SAI');

// VER solo, NOR+PIA McLaren, LEC+HAM Ferrari, RUS+ANT Mercedes, SAI Williams.
const teams = new Map<Id<'drivers'>, string | undefined>([
  [VER, 'Red Bull Racing'],
  [NOR, 'McLaren'],
  [PIA, 'McLaren'],
  [LEC, 'Ferrari'],
  [HAM, 'Ferrari'],
  [RUS, 'Mercedes'],
  [ANT, 'Mercedes'],
  [SAI, 'Williams'],
]);

const BASE = [VER, NOR, PIA, LEC, HAM, RUS, ANT, SAI];

describe('describeClassificationChange', () => {
  it('reports no change for identical orderings', () => {
    const change = describeClassificationChange(BASE, [...BASE], teams);

    expect(change.changed).toBe(false);
    expect(change.affectsScoring).toBe(false);
    expect(change.movements).toEqual([]);
  });

  it('flags a Top 5 change when a post-race penalty reorders the podium', () => {
    // NOR drops from P2 to P4 behind PIA and LEC.
    const official = [VER, PIA, LEC, NOR, HAM, RUS, ANT, SAI];
    const change = describeClassificationChange(BASE, official, teams);

    expect(change.changed).toBe(true);
    expect(change.driverSetMatches).toBe(true);
    expect(change.affectsTopFive).toBe(true);
    expect(change.affectsScoring).toBe(true);
    expect(change.movements).toContainEqual({ driverId: NOR, from: 2, to: 4 });
  });

  it('flags an H2H change when teammates swap outside the Top 5', () => {
    // RUS and ANT swap at P6/P7 — invisible to Top 5, decisive for H2H.
    const official = [VER, NOR, PIA, LEC, HAM, ANT, RUS, SAI];
    const change = describeClassificationChange(BASE, official, teams);

    expect(change.affectsTopFive).toBe(false);
    expect(change.affectsH2H).toBe(true);
    expect(change.affectsScoring).toBe(true);
  });

  it('treats a reorder that scores nothing as a silent correction', () => {
    // SAI moves ahead of ANT: different teams, both outside the Top 5.
    const official = [VER, NOR, PIA, LEC, HAM, RUS, SAI, ANT];
    const change = describeClassificationChange(BASE, official, teams);

    expect(change.changed).toBe(true);
    expect(change.affectsTopFive).toBe(false);
    expect(change.affectsH2H).toBe(false);
    expect(change.affectsScoring).toBe(false);
  });

  it('counts a driver dropping out of the Top 5 by one place as a Top 5 change', () => {
    // A P5 → P6 demotion changes who the fifth classified driver is.
    const official = [VER, NOR, PIA, LEC, RUS, HAM, ANT, SAI];
    const change = describeClassificationChange(BASE, official, teams);

    expect(change.affectsTopFive).toBe(true);
    // HAM and LEC are Ferrari teammates and HAM fell behind LEC either way.
    expect(change.affectsH2H).toBe(false);
  });

  it('refuses to match when the official feed lists a different driver set', () => {
    const official = [VER, NOR, PIA, LEC, HAM, RUS, ANT];
    const change = describeClassificationChange(BASE, official, teams);

    expect(change.changed).toBe(true);
    expect(change.driverSetMatches).toBe(false);
    expect(change.movements).toContainEqual({
      driverId: SAI,
      from: 8,
      to: null,
    });
  });

  it('ignores drivers with no team when checking H2H impact', () => {
    const teamless = new Map(teams);
    teamless.set(RUS, undefined);
    teamless.set(ANT, undefined);
    const official = [VER, NOR, PIA, LEC, HAM, ANT, RUS, SAI];

    expect(
      describeClassificationChange(BASE, official, teamless).affectsH2H,
    ).toBe(false);
  });
});

describe('resolveOfficialClassification', () => {
  it('keeps unranked non-starters behind the official order', () => {
    // Official results rank finishers and DNFs but omit DNS drivers entirely.
    const stored = [VER, NOR, PIA, LEC, HAM, RUS, ANT, SAI];
    const official = [VER, PIA, NOR, LEC, HAM, RUS];

    const resolved = resolveOfficialClassification(stored, official);

    expect(resolved).toEqual({
      ok: true,
      classification: [VER, PIA, NOR, LEC, HAM, RUS, ANT, SAI],
      unranked: [ANT, SAI],
    });
  });

  it('reports no drift when only the unranked tail is missing', () => {
    const stored = [VER, NOR, PIA, LEC, HAM, RUS, ANT, SAI];
    const official = [VER, NOR, PIA, LEC, HAM, RUS];

    const resolved = resolveOfficialClassification(stored, official);
    expect(resolved.ok).toBe(true);

    const change = describeClassificationChange(
      stored,
      resolved.ok ? resolved.classification : [],
      teams,
    );
    expect(change.changed).toBe(false);
  });

  it('passes through when every driver is ranked', () => {
    const official = [VER, PIA, NOR, LEC, HAM, RUS, ANT, SAI];

    expect(resolveOfficialClassification(BASE, official)).toEqual({
      ok: true,
      classification: official,
      unranked: [],
    });
  });

  it('refuses an official driver we do not have', () => {
    const resolved = resolveOfficialClassification(
      [VER, NOR, PIA],
      [VER, NOR, PIA, driver('MYSTERY')],
    );

    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.reason).toContain(
      'missing from our result',
    );
  });

  it('refuses a driver dropped from mid-order rather than the tail', () => {
    // NOR vanishing from P2 is a data problem, not a non-start.
    const resolved = resolveOfficialClassification(BASE, [
      VER,
      PIA,
      LEC,
      HAM,
      RUS,
      ANT,
      SAI,
    ]);

    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.reason).toContain('mid-order');
  });

  it('refuses a repeated driver in the official order', () => {
    const resolved = resolveOfficialClassification(BASE, [VER, VER, NOR]);

    expect(resolved.ok).toBe(false);
    expect(resolved.ok === false && resolved.reason).toContain('repeats');
  });
});
