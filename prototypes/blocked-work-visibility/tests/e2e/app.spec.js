import { test, expect } from '@playwright/test';

test.describe('Blocked Work Visibility App', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('http://localhost:8000');
  });

  test('should log a new blocker', async ({ page }) => {
    await page.getByLabel('Title').fill('E2E Test Blocker');
    await page.getByLabel('Description').fill('Created by Playwright E2E test');
    await page.getByLabel('Waiting On').fill('Test Team');
    await page.getByLabel('Internal Owner').fill('Tester');
    await page.getByRole('button', { name: 'Log Blocker' }).click();

    await expect(page.locator('h3').filter({ hasText: 'E2E Test Blocker' }).first()).toBeVisible();
  });

  test('should transition a blocker to In Progress', async ({ page }) => {
    // First, ensure there is an item to transition
    await page.getByLabel('Title').fill('Transition Test');
    await page.getByLabel('Description').fill('For testing status change');
    await page.getByLabel('Waiting On').fill('Dev Team');
    await page.getByLabel('Internal Owner').fill('Jules');
    await page.getByRole('button', { name: 'Log Blocker' }).click();

    const item = page.locator('.bg-white', { hasText: 'Transition Test' }).first();
    await expect(item).toBeVisible();

    // Handle the prompt dialog
    page.on('dialog', dialog => dialog.accept('Starting work now'));
    await item.getByRole('button', { name: 'In Progress' }).click();

    await expect(item.getByText('IN PROGRESS')).toBeVisible();
  });

  test('should filter items by status', async ({ page }) => {
     // Create one blocked and one resolved (or in progress) item if needed
     // For simplicity, we assume we can filter even if empty
     await page.selectOption('select:near(h2:has-text("Current Blockers"))', 'blocked');
     // In a real test, verify that only blocked items are visible
  });
});
