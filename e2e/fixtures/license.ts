/**
 * License Activation Fixture — منصة المحامي الرقمية
 *
 * License gate is Electron-only. In dev/web mode the App skips the gate
 * (licenseChecked is initialized to true when isElectron is false).
 *
 * Therefore in E2E we don't need to *trigger* a real license flow — the
 * component is never rendered. We expose a helper that asserts the
 * activation screen is NOT visible and returns a synthetic license payload
 * that matches the LicensePayload interface for any caller that needs it.
 */

import type { Page } from '@playwright/test';

export interface MockLicense {
  id: string;
  customer: string;
  plan: 'trial' | 'pro' | 'firm' | 'enterprise';
  issuedAt: number;
  expiresAt: number;
  maxCases: number;
  maxFiles: number;
  features: string[];
}

export const MOCK_TRIAL_LICENSE: MockLicense = {
  id: 'lic_e2e_mock_trial',
  customer: 'مكتب المحامي - بيئة اختبار E2E',
  plan: 'trial',
  issuedAt: Date.now() - 1000 * 60 * 60,
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 14,
  maxCases: 9999,
  maxFiles: 9999,
  features: ['cases', 'clients', 'calendar', 'financials', 'backup', 'docket', 'search'],
};

/**
 * Asserts the LicenseActivation screen is NOT visible (dev mode skips it).
 * In Electron production the activation form would be present, but the
 * Vite dev server is web-only, so this should always pass.
 */
export async function expectNoLicenseGate(page: Page): Promise<void> {
  // The component is full-screen and shows the brand "منصة المحامي الرقمية"
  // in the activation card. We assert it is hidden when expected.
  const activationHeading = page.getByText('نسخة تجارية مرخصة');
  // In dev mode the LicenseActivation component is not rendered at all
  // (the App returns null for licenseChecked when not in Electron),
  // so the heading must not be visible.
  const visible = await activationHeading.isVisible().catch(() => false);
  if (visible) {
    throw new Error(
      'LicenseActivation gate is visible in dev mode — expected it to be skipped. ' +
        'Check App.tsx licenseChecked initialization.',
    );
  }
}

/**
 * Seeds a fake "logged in" session in localStorage so the LoginScreen is
 * bypassed on next page load. The application reads:
 *   - lawfirm_logged_in === 'true'
 *   - lawfirm_user_role
 *   - lawfirm_user_name
 */
export async function seedAuthSession(
  page: Page,
  opts: { role?: string; name?: string } = {},
): Promise<void> {
  await page.addInitScript(({ role, name }) => {
    try {
      localStorage.setItem('lawfirm_logged_in', 'true');
      localStorage.setItem('lawfirm_user_role', role);
      localStorage.setItem('lawfirm_user_name', name);
    } catch {
      /* localStorage may be unavailable in some contexts; tests will fall through to login */
    }
  }, { role: opts.role ?? 'مدير المكتب', name: opts.name ?? 'مكتب المستشار / أحمد منصور المحامي' });
}
