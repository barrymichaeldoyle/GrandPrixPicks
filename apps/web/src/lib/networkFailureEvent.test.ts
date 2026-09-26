import { describe, expect, it } from 'vitest';

import { classifyNetworkFailureEvent } from './networkFailureEvent';

function event(type: string, value: string, component?: string) {
  return {
    exception: { values: [{ type, value }] },
    tags: component ? { component } : undefined,
  };
}

describe('classifyNetworkFailureEvent', () => {
  it('drops a failed fetch while the browser is offline', () => {
    expect(
      classifyNetworkFailureEvent(event('TypeError', 'Failed to fetch'), false),
    ).toBe('drop');
  });

  it('downgrades a failed fetch that reached the error page', () => {
    expect(
      classifyNetworkFailureEvent(
        event('TypeError', 'Failed to fetch', 'ErrorFallback'),
        true,
      ),
    ).toBe('downgrade');
    expect(
      classifyNetworkFailureEvent(
        event('TypeError', 'Load failed', 'ErrorFallback'),
        true,
      ),
    ).toBe('downgrade');
  });

  it('keeps everything else', () => {
    expect(
      classifyNetworkFailureEvent(event('TypeError', 'Failed to fetch'), true),
    ).toBe('keep');
    expect(
      classifyNetworkFailureEvent(
        event('Error', 'Not authenticated', 'ErrorFallback'),
        false,
      ),
    ).toBe('keep');
  });
});
