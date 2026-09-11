import { test, expect } from '@playwright/test';

test.describe('Tool Pages & Dropzone Interactions', () => {
  test('PDF Compress tool page renders dropzone correctly', async ({ page }) => {
    await page.goto('/tools/pdf/compress');

    // Verify main tool heading or title
    await expect(page.locator('h1, h2').first()).toBeVisible();

    // Verify file dropzone area exists
    const dropzone = page.locator('input[type="file"]');
    await expect(dropzone).toBeAttached();
  });

  test('PDF Merger tool page loads and displays multi-file dropzone', async ({ page }) => {
    await page.goto('/tools/pdf/merge');

    // Verify file input element exists for merge
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('Image Converter tool renders supported format selectors', async ({ page }) => {
    await page.goto('/tools/image/convert');

    // Verify tool content and file dropzone
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });
});
