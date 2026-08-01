/**
 * Page Object: Financials — منصة المحامي الرقمية
 *
 * الـ tab "الحسابات والمالية" يفتح Financials.
 * إضافة معاملة → #btn-add-tx-trigger → #add-custom-tx-modal → #submit-tx-btn.
 */

import type { Page, Locator } from '@playwright/test';

export class FinancialsPage {
  readonly page: Page;
  readonly sidebarLink: Locator;
  readonly addTxButton: Locator;
  readonly addTxModal: Locator;
  readonly caseSelect: Locator;
  readonly amountInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarLink = page.locator('#sidebar-link-financials');
    this.addTxButton = page.locator('#btn-add-tx-trigger');
    this.addTxModal = page.locator('#add-custom-tx-modal');
    this.caseSelect = this.addTxModal.locator('select').nth(1); // 0=type, 1=case
    this.amountInput = page.locator('#input-add-tx-amount');
    this.descriptionInput = page.locator('#input-add-tx-desc');
    this.submitButton = page.locator('#submit-tx-btn');
  }

  async goto() {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async openAddTx() {
    await this.addTxButton.click();
    await this.addTxModal.waitFor({ state: 'visible' });
  }

  /**
   * Fill the Add Transaction modal. The defaults (أتعاب / وارد) match
   * the form's initial state.
   */
  async fillTx(opts: { caseId?: string; amount: number; description: string }) {
    if (opts.caseId) {
      await this.caseSelect.selectOption(opts.caseId);
    }
    await this.amountInput.fill(String(opts.amount));
    await this.descriptionInput.fill(opts.description);
  }

  async submit() {
    await this.submitButton.click();
    await this.addTxModal.waitFor({ state: 'hidden', timeout: 8_000 });
  }

  async expectDescriptionInList(description: string) {
    await this.page
      .locator(`text=${description}`)
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
  }
}
