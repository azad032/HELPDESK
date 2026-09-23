import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

// This whole flow runs as a single freshly-registered customer so the pages'
// customer-only rendering (no Requester column, no status/priority/assign/delete
// controls) can be observed the way a real customer would see them.
test.describe('Customer flow: register, empty tickets list, create a ticket, view it', () => {
  test('covers registration, an empty ticket list, ticket creation, and the non-staff ticket view', async ({
    page,
  }) => {
    const unique = randomUUID();
    const email = `customer-${unique}@e2e.test`;
    const displayName = `E2E Customer ${unique.slice(0, 8)}`;
    const ticketTitle = `E2E ticket ${unique.slice(0, 8)}`;

    // --- Register page ---
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

    await page.getByLabel('Name').fill(displayName);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Password123');
    await page.getByRole('button', { name: 'Register' }).click();

    // --- Redirected home, authenticated as the new customer ---
    await expect(page).toHaveURL('/');
    await expect(page.locator('.navbar-user')).toContainText(displayName);
    await expect(page.locator('.navbar-user')).toContainText('Customer');

    // --- Tickets list: empty state, and no Requester column for a customer ---
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    await expect(page.getByText('No tickets yet.')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Requester' })).toHaveCount(0);

    // --- New ticket page ---
    await page.getByRole('link', { name: 'New Ticket' }).click();
    await expect(page).toHaveURL('/tickets/new');
    await expect(page.getByRole('heading', { name: 'New ticket' })).toBeVisible();

    await page.getByLabel('Title').fill(ticketTitle);
    await page.getByLabel('Description').fill('Created by the Playwright customer-flow E2E test.');
    await page.getByLabel('Priority').selectOption('High');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    // --- Redirected to the new ticket's detail page ---
    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();
    await expect(page.getByText('Created by the Playwright customer-flow E2E test.')).toBeVisible();
    await expect(page.locator('.ticket-meta').getByText(displayName)).toBeVisible(); // requester name

    // A customer must never see staff-only ticket controls.
    await expect(page.getByLabel('Status')).toHaveCount(0);
    await expect(page.getByLabel('Priority')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Assign to me' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete ticket' })).toHaveCount(0);

    // --- A customer can still comment on their own ticket ---
    await page.getByLabel('Add a comment').fill('Any update on this?');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByText('Any update on this?')).toBeVisible();

    // --- Back on the tickets list, the new ticket appears, still with no Requester column ---
    await page.getByRole('link', { name: 'Tickets' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: ticketTitle })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Requester' })).toHaveCount(0);
  });
});
