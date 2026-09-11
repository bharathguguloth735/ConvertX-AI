import { test, expect } from '@playwright/test';

test.describe('Home Page & Catalog Navigation', () => {
  test('landing page renders correctly with hero elements', async ({ page }) => {
    await page.goto('/');

    // Check title or document element
    await expect(page).toHaveTitle(/DocuFlow|ConvertX/i);

    // Verify main navigation bar exists
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Verify presence of main CTA or tools links
    const toolsLink = page.locator('a[href*="/tools"]').first();
    await expect(toolsLink).toBeVisible();
  });

  test('navigates to tools catalog successfully', async ({ page }) => {
    await page.goto('/tools');

    // Verify the tools catalog page loads
    await expect(page.locator('main')).toBeVisible();

    // Verify tool categories or cards exist
    const toolCards = page.locator('a[href*="/tools/"]');
    await expect(toolCards.first()).toBeVisible();
  });
});
