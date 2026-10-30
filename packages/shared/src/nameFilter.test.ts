import { describe, expect, it } from 'vitest';

import { isObjectionableName } from './nameFilter';

describe('isObjectionableName', () => {
  it.each([
    'fuck',
    'F_U_C_K',
    'xXfuckXx',
    'fuuuuck_off',
    'sh1t_driver',
    'b1tch',
    'my ass',
    'big-dick',
    'kys',
  ])('rejects %s', (name) => {
    expect(isObjectionableName(name)).toBe(true);
  });

  it.each([
    'lando_fan',
    'hamilton44',
    'cockpit_view',
    'sussex_racing',
    'race_analysis',
    'spice_girl',
    'emily dickinson',
    'Scrutineering',
    'Grand Prix Picks',
    'cassidy',
  ])('allows %s', (name) => {
    expect(isObjectionableName(name)).toBe(false);
  });
});
