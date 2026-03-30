import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
} from 'convex/server';
import { getFunctionName } from 'convex/server';
import type { PropsWithChildren, ReactNode } from 'react';
import { createContext, useContext } from 'react';

type ClerkMockAuthState = {
  isLoaded?: boolean;
  isSignedIn?: boolean;
  isAuthenticated?: boolean;
  userId?: string | null;
  sessionId?: string | null;
  fetchAccessToken?: () => Promise<string | null>;
  getToken?: () => Promise<string | null>;
};

type ClerkMockUser = {
  id: string;
  fullName?: string | null;
  username?: string | null;
  primaryEmailAddress?: {
    emailAddress: string;
  } | null;
};

type QueryResolver = unknown | ((args: unknown) => unknown);
type MutationResolver = (args: unknown) => unknown | Promise<unknown>;
type AnyFunctionReference = FunctionReference<
  'query' | 'mutation' | 'action',
  'public' | 'internal',
  Record<string, unknown>,
  unknown
>;

export type StorybookConvexMocks = {
  queries?: Record<string, QueryResolver>;
  mutations?: Record<string, MutationResolver>;
  connectionState?: {
    isWebSocketConnected: boolean;
    hasEverConnected: boolean;
  };
};

type StorybookMockState = {
  auth: Required<
    Pick<
      ClerkMockAuthState,
      | 'isLoaded'
      | 'isSignedIn'
      | 'isAuthenticated'
      | 'userId'
      | 'sessionId'
      | 'fetchAccessToken'
      | 'getToken'
    >
  >;
  user: ClerkMockUser | null;
  convex: Required<Pick<StorybookConvexMocks, 'queries' | 'mutations'>> & {
    connectionState: NonNullable<StorybookConvexMocks['connectionState']>;
  };
};

const DEFAULT_AUTH: StorybookMockState['auth'] = {
  isLoaded: true,
  isSignedIn: false,
  isAuthenticated: false,
  userId: null,
  sessionId: null,
  fetchAccessToken: async () => null,
  getToken: async () => null,
};

const DEFAULT_USER: ClerkMockUser = {
  id: 'storybook-user',
  fullName: 'Storybook User',
  username: 'storybook',
  primaryEmailAddress: {
    emailAddress: 'storybook@example.com',
  },
};

const DEFAULT_CONVEX: StorybookMockState['convex'] = {
  queries: {},
  mutations: {},
  connectionState: {
    isWebSocketConnected: true,
    hasEverConnected: true,
  },
};

const StorybookMockContext = createContext<StorybookMockState>({
  auth: DEFAULT_AUTH,
  user: null,
  convex: DEFAULT_CONVEX,
});

export function StorybookMockProviders({
  children,
  auth,
  user,
  convex,
}: PropsWithChildren<{
  auth?: ClerkMockAuthState;
  user?: ClerkMockUser | null;
  convex?: StorybookConvexMocks;
}>) {
  const isSignedIn = auth?.isSignedIn ?? DEFAULT_AUTH.isSignedIn;
  const mergedAuth: StorybookMockState['auth'] = {
    ...DEFAULT_AUTH,
    ...auth,
    isSignedIn,
    isAuthenticated: auth?.isAuthenticated ?? isSignedIn,
    userId: auth?.userId ?? (isSignedIn ? DEFAULT_USER.id : null),
  };

  const value: StorybookMockState = {
    auth: mergedAuth,
    user: isSignedIn ? (user ?? DEFAULT_USER) : null,
    convex: {
      queries: convex?.queries ?? DEFAULT_CONVEX.queries,
      mutations: convex?.mutations ?? DEFAULT_CONVEX.mutations,
      connectionState:
        convex?.connectionState ?? DEFAULT_CONVEX.connectionState,
    },
  };

  return (
    <StorybookMockContext.Provider value={value}>
      {children}
    </StorybookMockContext.Provider>
  );
}

export function useStorybookMockState() {
  return useContext(StorybookMockContext);
}

export function buildStorybookConvexMocks({
  queries = [],
  mutations = [],
  connectionState,
}: {
  queries?: Array<readonly [AnyFunctionReference, QueryResolver]>;
  mutations?: Array<readonly [AnyFunctionReference, MutationResolver]>;
  connectionState?: StorybookConvexMocks['connectionState'];
}): StorybookConvexMocks {
  return {
    queries: Object.fromEntries(
      queries.map(([reference, resolver]) => [
        getFunctionName(reference),
        resolver,
      ]),
    ),
    mutations: Object.fromEntries(
      mutations.map(([reference, resolver]) => [
        getFunctionName(reference),
        resolver,
      ]),
    ),
    connectionState,
  };
}

export function resolveStorybookQuery<Query extends AnyFunctionReference>(
  mocks: StorybookConvexMocks | StorybookMockState['convex'],
  reference: Query,
  args: FunctionArgs<Query> | 'skip',
): FunctionReturnType<Query> | undefined {
  if (args === 'skip') {
    return undefined;
  }

  const resolver = (mocks.queries ?? {})[getFunctionName(reference)];
  if (typeof resolver === 'function') {
    return resolver(args) as FunctionReturnType<Query>;
  }
  return resolver as FunctionReturnType<Query> | undefined;
}

export function renderSignedInOnly(isSignedIn: boolean, children: ReactNode) {
  return isSignedIn ? children : null;
}
