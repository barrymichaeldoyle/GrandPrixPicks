import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test as setup } from '@playwright/test';

import {
  createE2EClerkIdentity,
  signInE2EClerkIdentity,
} from './helpers/clerk';
import { PLAYWRIGHT_AUTH_NAMESPACE } from './helpers/smoke';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.resolve(__dirname, '.auth/user.json');

setup('authenticate playwright clerk user', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const identity = await createE2EClerkIdentity(PLAYWRIGHT_AUTH_NAMESPACE);
  await signInE2EClerkIdentity(page, identity, '/');
  await expect(page.getByTestId('header-user-authenticated')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
