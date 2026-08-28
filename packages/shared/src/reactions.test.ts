import { describe, expect, it } from 'vitest';

import { REACTION_TYPES, reactionOptionsFor } from './reactions';

describe('reactionOptionsFor', () => {
  it('keeps "Great pick" where there is a pick', () => {
    const fire = reactionOptionsFor('pick').find((o) => o.type === 'fire');
    expect(fire).toMatchObject({ emoji: '🔥', label: 'Great pick' });
  });

  it('calls it Spicy on news, where no pick was made', () => {
    // A grid penalty has no pick in it to call great.
    const fire = reactionOptionsFor('news').find((o) => o.type === 'fire');
    expect(fire).toMatchObject({ emoji: '🌶️', label: 'Spicy' });
  });

  it('does not change the stored type', () => {
    // The override is presentation only. Renaming the key would be a data
    // migration and would strand every reaction already counted as `fire`.
    expect(reactionOptionsFor('news').map((o) => o.type)).toEqual([
      ...REACTION_TYPES,
    ]);
  });

  it('leaves the reactions that still make sense alone', () => {
    const news = reactionOptionsFor('news');
    for (const type of ['wow', 'funny', 'oof', 'nice'] as const) {
      expect(news.find((o) => o.type === type)).toEqual(
        reactionOptionsFor('pick').find((o) => o.type === type),
      );
    }
  });
});
