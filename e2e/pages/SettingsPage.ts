/**
 * Page Object: Settings — منصة المحامي الرقمية
 *
 * الـ tab "الإعدادات والضبط العام" يفتح SettingsPanel.
 * الـ Settings Panel فيه قسم "تحميل نسخة احتياطية" + "استيراد".
 * الـ backup الفعلي يوجد في BackupRestorePanel (داخل الإعدادات).
 */

import type { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly sidebarLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarLink = page.locator('#sidebar-link-settings');
  }

  async goto() {
    await this.sidebarLink.click();
    // Settings panel is lazy-loaded
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    // The settings panel header text is unique
    await this.page.getByText('لوحة الإعدادات والتهيئة').first().waitFor({ state: 'visible' });
  }
}
