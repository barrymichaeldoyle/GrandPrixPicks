import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '../routes/ingest/[...path]';

function call(path: string) {
  return handler({ req: new Request(`https://grandprixpicks.com${path}`) });
}

describe('/ingest PostHog proxy', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards event paths to the PostHog API host', async () => {
    await call('/ingest/e/?ip=1');

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://eu.i.posthog.com/e/?ip=1',
    );
  });

  it('forwards static bundles to the PostHog asset host', async () => {
    await call('/ingest/static/array.js');

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://eu-assets.i.posthog.com/static/array.js',
    );
  });

  it('refuses a protocol-relative path instead of proxying an arbitrary host', async () => {
    const response = await call('/ingest//attacker.example/x');

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses backslash paths, which the URL parser folds into "//"', async () => {
    const response = await call('/ingest/\\\\attacker.example/x');

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never lets fetch follow a redirect on its own', async () => {
    await call('/ingest/e/');

    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
  });

  it('rewrites a PostHog redirect back through the proxy', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://eu.i.posthog.com/i/v0/e/?ver=2' },
      }),
    );

    const response = await call('/ingest/e/');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/ingest/i/v0/e/?ver=2');
  });

  it('drops a redirect that points off PostHog', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: 'https://attacker.example/x' },
      }),
    );

    const response = await call('/ingest/e/');

    expect(response.status).toBe(204);
    expect(response.headers.get('location')).toBeNull();
  });

  it('drops a redirect whose path would route back to the other PostHog host', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        // /static/ is served by the asset host, so this pairing is inconsistent.
        headers: { location: 'https://eu.i.posthog.com/static/array.js' },
      }),
    );

    const response = await call('/ingest/e/');

    expect(response.status).toBe(204);
  });

  it('passes 304 straight through rather than treating it as a redirect', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 304 }));

    const response = await call('/ingest/static/array.js');

    expect(response.status).toBe(304);
  });
});
