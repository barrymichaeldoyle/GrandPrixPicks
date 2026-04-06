import { createClerkClient } from '@clerk/backend';
import type { Page } from '@playwright/test';
import { ensureE2EEnvLoaded } from './env.ts';

type E2EClerkIdentity = {
  userId: string;
  email: string;
  displayName: string;
};

const E2E_APP_ORIGIN = process.env.E2E_APP_ORIGIN ?? 'http://127.0.0.1:3000';
const identityCache = new Map<string, Promise<E2EClerkIdentity>>();

function getRequiredEnv(name: string): string {
  ensureE2EEnvLoaded();
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getClerkClient() {
  const secretKey = getRequiredEnv('CLERK_SECRET_KEY');
  const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
  const jwtKey = process.env.CLERK_JWT_KEY;

  return createClerkClient({
    secretKey,
    ...(publishableKey ? { publishableKey } : {}),
    ...(jwtKey ? { jwtKey } : {}),
  });
}

async function withClerkRetries<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === 3) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Clerk request failed');
}

export async function createE2EClerkIdentity(
  namespace: string,
): Promise<E2EClerkIdentity> {
  const cached = identityCache.get(namespace);
  if (cached) {
    return await cached;
  }

  const promise = createOrLoadE2EClerkIdentity(namespace);
  identityCache.set(namespace, promise);

  try {
    return await promise;
  } catch (error) {
    identityCache.delete(namespace);
    throw error;
  }
}

async function createOrLoadE2EClerkIdentity(
  namespace: string,
): Promise<E2EClerkIdentity> {
  const clerk = getClerkClient();
  const email = `${namespace}@example.com`;
  const displayName = 'Scenario Primary';
  const externalId = namespace;
  const username = namespace
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);

  const existingUsers = await withClerkRetries(() =>
    clerk.users.getUserList({
      externalId: [externalId],
      limit: 1,
    }),
  );
  const existing = existingUsers.data[0] ?? null;

  const user =
    existing ??
    (await withClerkRetries(() =>
      clerk.users.createUser({
        externalId,
        emailAddress: [email],
        username,
        firstName: 'Scenario',
        lastName: 'Primary',
        skipPasswordRequirement: true,
        skipLegalChecks: true,
      }),
    ));

  return {
    userId: user.id,
    email,
    displayName,
  };
}

export async function createE2EClerkSignInTokenUrl(
  userId: string,
  redirectPath = '/',
) {
  const clerk = getClerkClient();
  const token = await clerk.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 300,
  });
  const url = new URL(token.url);
  url.searchParams.set('redirect_url', new URL(redirectPath, E2E_APP_ORIGIN).toString());
  return url.toString();
}

export async function signInE2EClerkIdentity(
  page: Page,
  identity: E2EClerkIdentity,
  targetPath = '/',
) {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const signInTokenUrl = await createE2EClerkSignInTokenUrl(
        identity.userId,
        targetPath,
      );

      await page.goto(signInTokenUrl, {
        waitUntil: 'commit',
        timeout: 20_000,
      });
      await page.waitForFunction(
        () => {
          const href = window.location.href;
          return (
            href.includes('127.0.0.1:3000') ||
            href.includes('localhost:3000') ||
            href.includes('accounts.dev/default-redirect')
          );
        },
        undefined,
        { timeout: 20_000 },
      );

      if (!page.url().startsWith(E2E_APP_ORIGIN)) {
        await page.goto(targetPath, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        });
      }

      await page.waitForFunction(
        () => {
          const clerkWindow = window as Window & {
            Clerk?: {
              loaded?: boolean;
              user?: { id?: string | null } | null;
            };
          };

          return (
            clerkWindow.Clerk?.loaded === true &&
            Boolean(clerkWindow.Clerk?.user?.id)
          );
        },
        undefined,
        { timeout: 20_000 },
      );

      return;
    } catch (error) {
      lastError = error;

      if (attempt === 3) {
        break;
      }

      await page.context().clearCookies().catch(() => null);
      await page.goto('about:blank').catch(() => null);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to sign in E2E Clerk identity');
}
