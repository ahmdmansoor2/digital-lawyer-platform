/**
 * Page Object: Calendar — منصة المحامي الرقمية
 *
 * الـ tab "جدول الجلسات" يفتح CalendarView.
 */

import type { Page, Locator } from '@playwright/test';

export class CalendarPage {
  readonly page: Page;
  readonly sidebarLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarLink = page.locator('#sidebar-link-calendar');
  }

  async goto() {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await this.sidebarLink.waitFor({ state: 'visible' });
    // The calendar view renders navigation buttons (prev/next)
    await this.page.waitForTimeout(500);
  }
}
