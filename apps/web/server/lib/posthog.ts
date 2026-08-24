const DEFAULT_POSTHOG_HOST = 'https://eu.i.posthog.com';

type ServerAnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Best-effort server-side product analytics. Callers must never make a product
 * workflow depend on PostHog availability.
 */
export async function captureServerAnalyticsEvent(params: {
  event: string;
  distinctId: string;
  insertId?: string;
  properties?: ServerAnalyticsProperties;
}): Promise<boolean> {
  const apiKey =
    process.env.POSTHOG_PROJECT_KEY ?? process.env.VITE_POSTHOG_KEY;
  if (!apiKey) {
    return false;
  }

  const host = (
    process.env.POSTHOG_INGEST_HOST ?? DEFAULT_POSTHOG_HOST
  ).replace(/\/$/, '');

  try {
    const response = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: params.event,
        properties: {
          distinct_id: params.distinctId,
          $insert_id: params.insertId,
          platform: 'server',
          ...params.properties,
        },
      }),
    });
    if (!response.ok) {
      console.warn('[posthog] server_capture_failed', {
        event: params.event,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch {
    console.warn('[posthog] server_capture_failed', {
      event: params.event,
      status: 'network_error',
    });
    return false;
  }
}
