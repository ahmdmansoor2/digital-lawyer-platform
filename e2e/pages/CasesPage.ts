/**
 * Page Object: Cases — منصة المحامي الرقمية
 *
 * الـ tab "إدارة القضايا" يفتح CasesList.
 * إضافة قضية → #add-case-modal + #submit-new-case-btn.
 * تعديل قضية → #edit-case-modal + #submit-edit-case-btn.
 * إضافة جلسة inline من داخل القضية → #btn-add-inline-session.
 */

import type { Page, Locator } from '@playwright/test';

export class CasesPage {
  readonly page: Page;
  readonly sidebarLink: Locator;
  readonly addCaseButton: Locator;
  readonly addCaseModal: Locator;
  readonly caseNumberInput: Locator;
  readonly courtInput: Locator;
  readonly circuitInput: Locator;
  readonly clientSelect: Locator;
  readonly submitCaseButton: Locator;
  readonly editCaseModal: Locator;
  readonly editCaseNumberInput: Locator;
  readonly submitEditCaseButton: Locator;
  readonly addInlineSessionButton: Locator;
  readonly inlineSessionDateInput: Locator;
  readonly inlineSessionObjective: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarLink = page.locator('#sidebar-link-cases');
    this.addCaseButton = page.locator('#btn-add-case-panel');
    this.addCaseModal = page.locator('#add-case-modal');
    this.caseNumberInput = page.locator('#input-add-case-number');
    this.courtInput = this.addCaseModal.locator('input[placeholder*="محكمة"]').first();
    this.circuitInput = this.addCaseModal.locator('input[placeholder*="الدائرة"]').first();
    this.clientSelect = this.addCaseModal.locator('select').first();
    this.submitCaseButton = page.locator('#submit-new-case-btn');
    this.editCaseModal = page.locator('#edit-case-modal');
    this.editCaseNumberInput = page.locator('#input-edit-case-number');
    this.submitEditCaseButton = page.locator('#submit-edit-case-btn');
    this.addInlineSessionButton = page.locator('#btn-add-inline-session');
    this.inlineSessionDateInput = page.locator('input[type="date"]').first();
    this.inlineSessionObjective = page.locator('textarea[placeholder*="المرافعة"]').first();
    this.searchInput = page.locator('input[placeholder*="ابحث برقم"]').first();
  }

  async goto() {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async openAddCase() {
    await this.addCaseButton.click();
    await this.addCaseModal.waitFor({ state: 'visible' });
  }

  async fillNewCase(opts: { caseNumber: string; clientId: string; court: string; circuit: string }) {
    await this.clientSelect.selectOption(opts.clientId);
    await this.caseNumberInput.fill(opts.caseNumber);
    await this.courtInput.fill(opts.court);
    await this.circuitInput.fill(opts.circuit);
  }

  async submitNewCase() {
    await this.submitCaseButton.click();
    await this.addCaseModal.waitFor({ state: 'hidden', timeout: 8_000 });
  }

  async expectInList(caseNumber: string) {
    await this.page
      .locator(`text=${caseNumber}`)
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
  }

  async search(text: string) {
    await this.searchInput.fill(text);
  }

  /**
   * Open the first case card in the cases list. Use after navigating
   * to the cases tab.
   */
  async openFirstCase() {
    // Click the first case card (cards are buttons inside the list)
    const cards = this.page.locator('button').filter({ hasText: /لسنة/ });
    await cards.first().click();
    await this.page.waitForTimeout(300);
  }
}
