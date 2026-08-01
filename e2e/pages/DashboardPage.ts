/**
 * Page Object: Dashboard — منصة المحامي الرقمية
 *
 * الـ Dashboard يعرض بطاقات KPI سريعة + الإجراءات السريعة.
 * يتم تحميله عند الـ login الناجح.
 */

import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // الـ sidebar
  readonly sidebar: Locator;
  readonly sidebarLinkDashboard: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('#major-app-sidebar');
    this.sidebarLinkDashboard = page.locator('#sidebar-link-dashboard');
  }

  async goto() {
    await this.sidebarLinkDashboard.click();
    await this.page.waitForLoadState('networkidle');
  }

  async expectLoaded() {
    await this.sidebar.waitFor({ state: 'visible' });
    await this.sidebarLinkDashboard.waitFor({ state: 'visible' });
  }
}
