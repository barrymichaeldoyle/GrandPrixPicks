import { describe, expect, it } from 'vitest';

import {
  pairingAnchorAliases,
  pairingAnchorIds,
  surnameSlug,
} from './pairingAnchors';

function driver(displayName: string) {
  return { displayName };
}

describe('surnameSlug', () => {
  it('strips diacritics rather than dropping the letter', () => {
    expect(surnameSlug('Nico Hülkenberg')).toBe('hulkenberg');
  });

  it('uses the surname, not the full name', () => {
    expect(surnameSlug('Max Verstappen')).toBe('verstappen');
  });

  it('never returns an empty fragment', () => {
    // A driver whose name survives normalisation as nothing would otherwise
    // produce `#` — a link to the top of the page rather than to the pairing.
    expect(surnameSlug('???')).toBe('pairing');
    expect(surnameSlug('')).toBe('pairing');
  });
});

describe('pairingAnchorIds', () => {
  it('names a pairing after both drivers', () => {
    const ids = pairingAnchorIds([
      {
        matchupId: 'm1',
        drivers: [driver('Max Verstappen'), driver('Isack Hadjar')],
      },
    ]);
    expect(ids.get('m1')).toBe('hadjar-verstappen');
  });

  it('keeps the same anchor when the duel flips', () => {
    // This is the whole point. The page sorts drivers by who is ahead, so the
    // day Hadjar goes in front the array order reverses. If the anchor followed
    // that order, every link already made to the pairing would break.
    const leading = pairingAnchorIds([
      {
        matchupId: 'm1',
        drivers: [driver('Max Verstappen'), driver('Isack Hadjar')],
      },
    ]);
    const flipped = pairingAnchorIds([
      {
        matchupId: 'm1',
        drivers: [driver('Isack Hadjar'), driver('Max Verstappen')],
      },
    ]);
    expect(flipped.get('m1')).toBe(leading.get('m1'));
  });

  it('separates two pairings of the same drivers over different rounds', () => {
    const ids = pairingAnchorIds([
      {
        matchupId: 'm1',
        fromRound: 1,
        drivers: [driver('Liam Lawson'), driver('Arvid Lindblad')],
      },
      {
        matchupId: 'm2',
        fromRound: 12,
        drivers: [driver('Liam Lawson'), driver('Arvid Lindblad')],
      },
    ]);
    expect(ids.get('m1')).toBe('lawson-lindblad');
    expect(ids.get('m2')).toBe('lawson-lindblad-r12');
    expect(new Set(ids.values()).size).toBe(2);
  });

  it('gives every pairing on a real grid a distinct anchor', () => {
    const grid = [
      ['Lando Norris', 'Oscar Piastri'],
      ['Max Verstappen', 'Isack Hadjar'],
      ['Charles Leclerc', 'Lewis Hamilton'],
      ['Kimi Antonelli', 'George Russell'],
      ['Fernando Alonso', 'Lance Stroll'],
      ['Nico Hülkenberg', 'Gabriel Bortoleto'],
      ['Pierre Gasly', 'Franco Colapinto'],
      ['Alexander Albon', 'Carlos Sainz'],
      ['Oliver Bearman', 'Esteban Ocon'],
      ['Valtteri Bottas', 'Sergio Pérez'],
    ].map((names, index) => ({
      matchupId: `m${index}`,
      drivers: names.map(driver),
    }));

    const ids = pairingAnchorIds(grid);
    expect(new Set(ids.values()).size).toBe(grid.length);
    // And they are readable, which is the reason for doing any of this.
    expect([...ids.values()]).toContain('hadjar-verstappen');
    expect([...ids.values()]).toContain('bortoleto-hulkenberg');
  });
});

describe('pairingAnchorAliases', () => {
  const verstappenHadjar = [
    {
      matchupId: 'm1',
      drivers: [driver('Max Verstappen'), driver('Isack Hadjar')],
    },
  ];

  it('resolves the order a person would actually write', () => {
    const aliases = pairingAnchorAliases(verstappenHadjar);
    // The canonical anchor is alphabetical, but nobody quoting "Verstappen
    // leads Hadjar 24-6" types it that way round.
    expect(aliases.get('verstappen-hadjar')).toBe('hadjar-verstappen');
  });

  it('maps every canonical id to itself', () => {
    const aliases = pairingAnchorAliases(verstappenHadjar);
    expect(aliases.get('hadjar-verstappen')).toBe('hadjar-verstappen');
  });

  it('never lets an alias shadow a real heading', () => {
    // Both pairings reverse to spellings that collide with the other's bare
    // form. The canonical ids must win, or a link to the rounds 1-11 duel
    // would land on the rounds 12+ one.
    const aliases = pairingAnchorAliases([
      {
        matchupId: 'm1',
        fromRound: 1,
        drivers: [driver('Liam Lawson'), driver('Arvid Lindblad')],
      },
      {
        matchupId: 'm2',
        fromRound: 12,
        drivers: [driver('Arvid Lindblad'), driver('Liam Lawson')],
      },
    ]);
    const ids = pairingAnchorIds([
      {
        matchupId: 'm1',
        fromRound: 1,
        drivers: [driver('Liam Lawson'), driver('Arvid Lindblad')],
      },
      {
        matchupId: 'm2',
        fromRound: 12,
        drivers: [driver('Arvid Lindblad'), driver('Liam Lawson')],
      },
    ]);

    for (const id of ids.values()) {
      expect(aliases.get(id), `canonical ${id} must resolve to itself`).toBe(
        id,
      );
    }
    expect(aliases.get('lawson-lindblad')).toBe('lawson-lindblad');
    expect(aliases.get('lindblad-lawson-r12')).toBe('lawson-lindblad-r12');
  });

  it('does not invent an alias for a pairing that is not on the page', () => {
    const aliases = pairingAnchorAliases(verstappenHadjar);
    expect(aliases.get('norris-piastri')).toBeUndefined();
    expect(aliases.get('')).toBeUndefined();
  });

  it('gives both orders of every real pairing a home', () => {
    const grid = [
      ['Lando Norris', 'Oscar Piastri'],
      ['Max Verstappen', 'Isack Hadjar'],
      ['Nico Hülkenberg', 'Gabriel Bortoleto'],
      ['Valtteri Bottas', 'Sergio Pérez'],
    ].map((names, index) => ({
      matchupId: `m${index}`,
      drivers: names.map(driver),
    }));
    const aliases = pairingAnchorAliases(grid);
    const ids = pairingAnchorIds(grid);

    for (const team of grid) {
      const slugs = team.drivers.map((d) => surnameSlug(d.displayName));
      const canonical = ids.get(team.matchupId);
      expect(aliases.get(slugs.join('-'))).toBe(canonical);
      expect(aliases.get([...slugs].reverse().join('-'))).toBe(canonical);
    }
  });
});
