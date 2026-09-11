import { describe, expect, it } from 'vitest';

import {
  displayTeamName,
  formatTimingSheetName,
  pairingRoundSpanLabel,
} from './display';

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

describe('formatTimingSheetName', () => {
  it('drops the all-caps surname OpenF1 prints', () => {
    expect(formatTimingSheetName('Kimi ANTONELLI')).toBe('Kimi Antonelli');
    expect(formatTimingSheetName('George RUSSELL')).toBe('George Russell');
  });

  it('leaves mixed-case names and particles alone', () => {
    expect(formatTimingSheetName('Nyck de VRIES')).toBe('Nyck de Vries');
    expect(formatTimingSheetName('Driver 1 (fp2)')).toBe('Driver 1 (fp2)');
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
