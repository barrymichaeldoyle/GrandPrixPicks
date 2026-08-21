import { describe, expect, it } from 'vitest';

import { isNotificationArrival } from './notificationArrival';

describe('isNotificationArrival', () => {
  it('recognises the results email link', () => {
    expect(
      isNotificationArrival(
        '?time=weekend&raceId=k1&utm_source=email&utm_medium=email&utm_campaign=results',
      ),
    ).toBe(true);
  });

  it('recognises a push deep link', () => {
    expect(
      isNotificationArrival(
        '?utm_source=push&utm_medium=push&utm_campaign=session_locked',
      ),
    ).toBe(true);
  });

  it('leaves an organic visitor alone', () => {
    expect(isNotificationArrival('')).toBe(false);
    expect(isNotificationArrival('?')).toBe(false);
    expect(isNotificationArrival('?raceId=k1')).toBe(false);
  });

  it('leaves other campaigns alone', () => {
    // A shared link or a social post reaches people without accounts. Opening
    // sign-in on them would gate the very visitors we want to convert.
    expect(isNotificationArrival('?utm_source=twitter')).toBe(false);
    expect(isNotificationArrival('?utm_source=reddit')).toBe(false);
  });

  it('does not match a source that merely contains a trigger word', () => {
    expect(isNotificationArrival('?utm_source=emailer')).toBe(false);
    expect(isNotificationArrival('?utm_source=pushover')).toBe(false);
  });
});
