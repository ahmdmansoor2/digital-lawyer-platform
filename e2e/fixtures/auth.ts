/**
 * Auth Helper — منصة المحامي الرقمية
 *
 * Two strategies to reach the Dashboard:
 *  1. **Fast path (default)**: pre-seed `lawfirm_logged_in=true` via
 *     `addInitScript` so the LoginScreen is skipped on first load.
 *  2. **Login screen path**: type `admin` / `admin123` into the form.
 *
 * Use `loginViaScreen` to explicitly exercise the LoginScreen flow.
 */

import type { Page } from '@playwright/test';
import { seedAuthSession } from './license';

export async function bypassLogin(page: Page) {
  await seedAuthSession(page);
}

export async function loginViaScreen(page: Page, username = 'admin', password = 'admin123') {
  // The login form has placeholders admin / ••••••••
  const userInput = page.locator('input[placeholder="admin"]');
  await userInput.waitFor({ state: 'visible', timeout: 10_000 });
  await userInput.fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  // Wait for the sidebar to appear (= the main app)
  await page.locator('#major-app-sidebar').waitFor({ state: 'visible', timeout: 15_000 });
}
