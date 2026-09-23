import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test('redirects an unauthenticated visitor from the home page to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('shows an error for invalid credentials and stays on the page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@helpdesk.local');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page.getByText('Unable to log in.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('logs in with the seeded admin account, lands on tickets, and can log out', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@helpdesk.local');
    await page.getByLabel('Password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    await expect(page.locator('.navbar-user')).toContainText('Administrator');
    await expect(page.locator('.navbar-user')).toContainText('Admin');

    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page).toHaveURL('/login');

    // Logging out must actually clear the session, not just redirect.
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('redirects back to the originally requested page after login', async ({ page }) => {
    await page.goto('/tickets/new');
    await expect(page).toHaveURL('/login');

    await page.getByLabel('Email').fill('admin@helpdesk.local');
    await page.getByLabel('Password').fill('ChangeMe123!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL('/tickets/new');
  });
});
