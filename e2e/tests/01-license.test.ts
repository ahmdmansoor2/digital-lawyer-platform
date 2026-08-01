/**
 * Test 01 — License Activation
 *
 * Verifies that:
 *  - In dev mode (non-Electron), the LicenseActivation gate is NOT shown.
 *  - A fresh, un-authenticated user is taken straight to the LoginScreen
 *    after the dev-mode license gate is bypassed.
 *  - After authenticating, the Dashboard loads correctly.
 */

import { test, expect } from '@playwright/test';
import { expectNoLicenseGate } from '../fixtures/license';
import { loginViaScreen } from '../fixtures/auth';

test.describe('License Activation', () => {
  test('license gate is bypassed in dev mode and Dashboard loads after login', async ({ page }) => {
    // Start with a clean storage state — no pre-seeded auth
    await page.goto('/');

    // The LicenseActivation component must NOT be visible in dev mode
    await expectNoLicenseGate(page);

    // In dev mode the App goes directly to the LoginScreen
    const loginHeading = page.getByText('تسجيل الدخول');
    await loginHeading.waitFor({ state: 'visible', timeout: 10_000 });

    // Complete the login form
    await loginViaScreen(page);

    // Dashboard sidebar should be visible
    await page.locator('#major-app-sidebar').waitFor({ state: 'visible' });
    await page.locator('#sidebar-link-dashboard').waitFor({ state: 'visible' });
  });
});
