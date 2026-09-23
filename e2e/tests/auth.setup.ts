import { test as setup, expect } from '@playwright/test';
import path from 'node:path';

const adminAuthFile = path.join(import.meta.dirname, '../playwright/.auth/admin.json');

setup('authenticate as seeded admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@helpdesk.local');
  await page.getByLabel('Password').fill('ChangeMe123!');
  await page.getByRole('button', { name: 'Log in' }).click();

  await page.waitForURL('/');
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  await page.context().storageState({ path: adminAuthFile });
});
