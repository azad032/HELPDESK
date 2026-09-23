import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

test.use({ storageState: path.join(import.meta.dirname, '../playwright/.auth/admin.json') });

test.describe('Admin ticket flow: staff-only list/detail controls, full ticket lifecycle', () => {
  test('covers the staff tickets list, ticket creation, status/priority/assign controls, comments, and delete', async ({
    page,
  }) => {
    const unique = randomUUID();
    const ticketTitle = `E2E admin ticket ${unique.slice(0, 8)}`;

    // --- Tickets list: staff sees the Requester column ---
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Requester' })).toBeVisible();

    // --- New ticket page ---
    await page.getByRole('link', { name: 'New Ticket' }).click();
    await expect(page).toHaveURL('/tickets/new');

    await page.getByLabel('Title').fill(ticketTitle);
    await page.getByLabel('Description').fill('Created by the Playwright admin-flow E2E test.');
    await page.getByLabel('Priority').selectOption('Low');
    await page.getByRole('button', { name: 'Create ticket' }).click();

    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();

    // --- Staff controls are visible, ticket starts Open/Low and unassigned ---
    const statusSelect = page.getByLabel('Status');
    const prioritySelect = page.getByLabel('Priority');
    await expect(statusSelect).toHaveValue('Open');
    await expect(prioritySelect).toHaveValue('Low');
    await expect(page.locator('.ticket-meta')).toContainText('Unassigned');

    // --- Change status and priority ---
    await statusSelect.selectOption('InProgress');
    await expect(page.locator('.badge.status-inprogress')).toBeVisible();

    await prioritySelect.selectOption('Urgent');
    await expect(page.locator('.badge.priority-urgent')).toBeVisible();

    // --- Assign to me ---
    await page.getByRole('button', { name: 'Assign to me' }).click();
    await expect(page.locator('.ticket-meta')).toContainText('Administrator');
    await expect(page.getByRole('button', { name: 'Assign to me' })).toHaveCount(0);

    // --- Add a comment ---
    await page.getByLabel('Add a comment').fill('Looking into this now.');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByText('Looking into this now.')).toBeVisible();

    // --- Delete (admin-only), confirming the browser dialog ---
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete ticket' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: ticketTitle })).toHaveCount(0);
  });
});
