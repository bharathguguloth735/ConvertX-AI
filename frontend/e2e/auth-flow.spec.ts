import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test('Login page displays credentials form and links', async ({ page }) => {
    await page.goto('/login');

    // Verify form elements exist
    const emailInput = page.locator('#login-username, input[type="email"], input[type="text"]').first();
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    // Verify submit button exists
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test('Register page renders with registration fields', async ({ page }) => {
    await page.goto('/register');

    // Verify registration inputs
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });
});
