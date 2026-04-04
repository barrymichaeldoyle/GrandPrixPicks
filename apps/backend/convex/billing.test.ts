import { describe, expect, it } from 'vitest';

import { isTerminalPaddleWebhookEventStatus } from './billing';

describe('isTerminalPaddleWebhookEventStatus', () => {
  it('treats processed events as terminal duplicates', () => {
    expect(isTerminalPaddleWebhookEventStatus('processed')).toBe(true);
  });

  it('allows ignored user-not-found events to be retried', () => {
    expect(isTerminalPaddleWebhookEventStatus('ignored_user_not_found')).toBe(
      false,
    );
  });
});
