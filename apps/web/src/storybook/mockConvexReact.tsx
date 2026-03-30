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
