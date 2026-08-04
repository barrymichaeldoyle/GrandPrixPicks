import type { PropsWithChildren } from 'react';

import type { FunctionReference } from 'convex/server';
import { getFunctionName } from 'convex/server';

import { resolveStorybookQuery, useStorybookMockState } from './mockAppRuntime';

type AnyFunctionReference = FunctionReference<
  'query' | 'mutation' | 'action',
  'public' | 'internal',
  Record<string, unknown>,
  unknown
>;

export class ConvexReactClient {
  constructor(_url: string) {}
}

export function ConvexProvider({
  children,
}: PropsWithChildren<{ client: unknown }>) {
  return <>{children}</>;
}

export function useConvexAuth() {
  const { auth } = useStorybookMockState();
  return {
    isLoading: !auth.isLoaded,
    isAuthenticated: auth.isAuthenticated,
  };
}

export function useQuery<Query extends AnyFunctionReference>(
  reference: Query,
  args?: unknown,
) {
  const { convex } = useStorybookMockState();
  return resolveStorybookQuery(convex, reference, (args ?? {}) as never);
}

export function useMutation<Mutation extends AnyFunctionReference>(
  reference: Mutation,
) {
  const { convex } = useStorybookMockState();
  const functionName = getFunctionName(reference);
  const handler = convex.mutations[functionName];

  return async (args: unknown) => {
    if (!handler) {
      return null;
    }
    return await handler(args);
  };
}

export const useAction = useMutation;

export function useConvexConnectionState() {
  return useStorybookMockState().convex.connectionState;
}

/*
 * Everything below exists because `convex/react` is aliased to this file for
 * the whole graph, node_modules included. Any export the real module has and
 * this one lacks is a hard MISSING_EXPORT at build time even when no story
 * renders the code path — `storybook build` is stricter than `storybook dev`.
 * Adding a Convex hook to the app means adding it here too.
 */

/** Used by `__root.tsx`. Stories mount providers themselves, so this is a
 *  passthrough like {@link ConvexProvider}. */
export function ConvexProviderWithAuth({
  children,
}: PropsWithChildren<{ client: unknown; useAuth: unknown }>) {
  return <>{children}</>;
}

export function useConvex() {
  return new ConvexReactClient('storybook');
}

export function useQueries(_queries: Record<string, unknown>) {
  return {};
}

/**
 * Mirrors the real shape so a paginated list renders from a plain array in a
 * story: mock the query with the page and it lands in `results`, already
 * exhausted so the component does not try to load more.
 */
export function usePaginatedQuery<Query extends AnyFunctionReference>(
  reference: Query,
  args?: unknown,
  _options?: { initialNumItems: number },
) {
  const { convex } = useStorybookMockState();
  const resolved = resolveStorybookQuery(
    convex,
    reference,
    (args ?? {}) as never,
  );
  const results = Array.isArray(resolved) ? resolved : [];

  return {
    results,
    status:
      resolved === undefined
        ? ('LoadingFirstPage' as const)
        : ('Exhausted' as const),
    isLoading: resolved === undefined,
    loadMore: (_numItems: number) => {},
  };
}

/** Optimistic-update helper. Stories have no local store to update. */
export function optimisticallyUpdateValueInPaginatedQuery(
  _localStore: unknown,
  _query: unknown,
  _args: unknown,
  _updateValue: unknown,
) {}
