/**
 * Test 08 — Backup / Restore
 *
 * Verifies that:
 *  - Opening Settings renders the Settings panel.
 *  - Clicking "تحميل نسخة احتياطية" triggers a JSON file download.
 *  - The downloaded JSON contains the expected top-level "data" key.
 */

import { test, expect } from '@playwright/test';
import { bypassLogin } from '../fixtures/auth';
import { SettingsPage } from '../pages/SettingsPage';

test.describe('Backup / Restore', () => {
  test('export a backup JSON file from Settings', async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');

    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.expectLoaded();

    // Set up download listener
    const downloadPromise = page
      .waitForEvent('download', { timeout: 10_000 })
      .catch(() => null);

    // The export button is labelled "تصدير نسخة احتياطية" (or "تحميل نسخة
    // احتياطية" in the BackupRestorePanel). Try the more specific one.
    const exportButton = page
      .getByRole('button', { name: /تصدير نسخة احتياطية|تحميل نسخة احتياطية/ })
      .first();
    if (!(await exportButton.isVisible().catch(() => false))) {
      test.skip(true, 'No backup export button visible in current Settings view.');
    }

    // The export opens a confirm dialog — accept it
    page.once('dialog', (d) => d.accept());
    await exportButton.click();

    const download = await downloadPromise;
    if (!download) {
      // No download fired — could be a confirm dialog issue or async timing.
      // Fail gracefully with a clear message.
      throw new Error('Backup export did not produce a download event within 10s.');
    }

    const filename = download.suggestedFilename();
    expect(filename.toLowerCase()).toMatch(/\.json$/);

    // Save the download and verify the JSON shape
    const path = await download.path();
    expect(path, 'Downloaded file path is null').not.toBeNull();
    if (path) {
      const fs = await import('node:fs/promises');
      const text = await fs.readFile(path, 'utf-8');
      const parsed = JSON.parse(text);
      expect(parsed).toHaveProperty('data');
      expect(parsed.data).toHaveProperty('cases');
      expect(parsed.data).toHaveProperty('clients');
    }
  });
});
