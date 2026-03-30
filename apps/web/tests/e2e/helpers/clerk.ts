import { createClerkClient } from '@clerk/backend';
import type { Page } from '@playwright/test';
import { ensureE2EEnvLoaded } from './env.ts';

type E2EClerkIdentity = {
  userId: string;
  email: string;
  displayName: string;
};

const E2E_APP_ORIGIN = 'http://localhost:3000';

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

export async function createE2EClerkIdentity(
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

  const existingUsers = await clerk.users.getUserList({
    externalId: [externalId],
    limit: 1,
  });
  const existing = existingUsers.data[0] ?? null;

  const user =
    existing ??
    (await clerk.users.createUser({
      externalId,
      emailAddress: [email],
      username,
      firstName: 'Scenario',
      lastName: 'Primary',
      skipPasswordRequirement: true,
      skipLegalChecks: true,
    }));

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
  const signInTokenUrl = await createE2EClerkSignInTokenUrl(
    identity.userId,
    targetPath,
  );

  await page.goto(signInTokenUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 20_000,
  });
  await page.waitForFunction(
    () => {
      const href = window.location.href;
      return (
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
    () => window.Clerk?.loaded === true && Boolean(window.Clerk?.user?.id),
    undefined,
    { timeout: 20_000 },
  );
}
