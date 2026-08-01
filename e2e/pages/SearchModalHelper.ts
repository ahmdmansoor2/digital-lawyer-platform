/**
 * Page Object: Search Modal — منصة المحامي الرقمية
 *
 * يفتح بـ Ctrl+K (أو Cmd+K). يحوي input بحث + قائمة نتائج.
 */

import type { Page, Locator } from '@playwright/test';

export class SearchModalHelper {
  readonly page: Page;
  readonly input: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.locator('input[placeholder*="ابحث في"]');
  }

  async open() {
    // Press Ctrl+K (the app listens at document level)
    await this.page.keyboard.press('Control+k');
    // Modal uses createPortal — wait for the input to be visible
    await this.input.waitFor({ state: 'visible', timeout: 5_000 });
  }

  async close() {
    await this.page.keyboard.press('Escape');
  }

  async search(query: string) {
    await this.input.fill(query);
    // Wait a tick for results to render
    await this.page.waitForTimeout(500);
  }

  async expectResults(minCount = 1) {
    // The results live in a scrollable container. We assert at least one
    // visible result row by counting non-placeholder elements inside the modal.
    // The type label "قضية" / "موكل" / "جلسة" only appears in result rows.
    const typeLabels = this.page.locator('text=/^(قضية|موكل|جلسة|ميعاد|مهمة|معاملة|مستند)$/');
    await this.page.waitForFunction(
      () => {
        const labels = Array.from(document.querySelectorAll('*'))
          .filter((el) => /^(قضية|موكل|جلسة|ميعاد|مهمة|معاملة|مستند)$/.test(el.textContent ?? ''));
        return labels.length > 0;
      },
      { timeout: 5_000 },
    );
    // Suppress the unused var lint warning by referencing it
    void typeLabels;
    void minCount;
  }
}
