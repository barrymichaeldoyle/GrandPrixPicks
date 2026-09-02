import { createServerFn } from '@tanstack/react-start';

/**
 * The gate on the creator-poll POC (`docs/creator-poll-poc.md`).
 *
 * The page is a working proposal for someone who has not been asked yet, so it
 * must not be findable before he has seen it: `noindex`, absent from the
 * sitemap, no inbound link, and this key on top. Someone googling their own
 * name should not turn up a product built for them without their knowledge.
 *
 * **Fails closed.** The first version keyed the dev escape hatch off
 * `process.env.NODE_ENV !== 'production'`, which is open whenever NODE_ENV is
 * unset — and nothing in this repo sets it for the deployed worker, so an
 * unlucky runtime default would have published his page to the internet.
 * `import.meta.env.DEV` is a compile-time constant Vite replaces with `false`
 * in every production build, so the escape hatch cannot survive one.
 *
 * In production the page is therefore unreachable until
 * `CREATOR_POLL_PREVIEW_KEY` is set on the deployment, and then only with a
 * matching `?k=`.
 *
 * The comparison runs on the server so the key never reaches the bundle.
 */
const checkPreviewKey = createServerFn({ method: 'GET' })
  .inputValidator((key: string) => key)
  .handler(async ({ data: key }): Promise<boolean> => {
    if (import.meta.env.DEV) {
      return true;
    }

    const expected = process.env.CREATOR_POLL_PREVIEW_KEY;
    if (!expected) {
      return false;
    }

    return key === expected;
  });

export async function isCreatorPollPreviewAllowed(
  key: string | undefined,
): Promise<boolean> {
  return await checkPreviewKey({ data: key ?? '' });
}
