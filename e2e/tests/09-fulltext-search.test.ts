/**
 * Test 09 — Full-Text Search (Ctrl+K)
 *
 * Verifies that:
 *  - Pressing Ctrl+K opens the SearchModal.
 *  - Typing a query returns at least one result.
 */

import { test, expect } from '@playwright/test';
import { bypassLogin } from '../fixtures/auth';
import { SearchModalHelper } from '../pages/SearchModalHelper';

test.describe('Full-Text Search (Ctrl+K)', () => {
  test('Ctrl+K opens search and returns results', async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');

    const search = new SearchModalHelper(page);
    await search.open();

    // Search for a generic Arabic term that matches mock data
    await search.search('قضية');

    // The result rows show type labels (قضية, موكل, جلسة, ...). Verify
    // at least one type label is visible inside the open modal.
    await search.expectResults();

    // Close
    await search.close();
  });
});
