import { describe, expect, it } from 'vitest';

import { displayTeamName, pairingRoundSpanLabel } from './display';

describe('displayTeamName', () => {
  it('applies known short names', () => {
    expect(displayTeamName('Red Bull Racing')).toBe('Red Bull');
  });

  it('keeps unknown names unchanged', () => {
    expect(displayTeamName('McLaren')).toBe('McLaren');
  });

  it('returns empty string for nullish/empty values', () => {
    expect(displayTeamName('')).toBe('');
    expect(displayTeamName(null)).toBe('');
    expect(displayTeamName(undefined)).toBe('');
  });
});

describe('pairingRoundSpanLabel', () => {
  it('names a closed multi-round stint as an inclusive span', () => {
    expect(pairingRoundSpanLabel(1, 11)).toBe('Rounds 1–11');
  });

  it('names an open stint from a mid-season swap', () => {
    expect(pairingRoundSpanLabel(12)).toBe('Round 12 onwards');
  });

  it('names a single-round stint without a plural', () => {
    expect(pairingRoundSpanLabel(12, 12)).toBe('Round 12');
  });

  it('names an unbroken season pairing', () => {
    expect(pairingRoundSpanLabel(1)).toBe('All season');
  });
});
