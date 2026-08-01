/**
 * Page Object: Clients — منصة المحامي الرقمية
 *
 * الـ tab "موكلين المكتب" يفتح ClientsList.
 * إضافة عميل يفتح AddEditClientModal (#add-client-modal).
 */

import type { Page, Locator } from '@playwright/test';
import { createMockClient, type MockClientOverrides } from '../fixtures/testData';
import type { Client } from '../../src/types';

export class ClientsPage {
  readonly page: Page;
  readonly sidebarLink: Locator;
  readonly addButton: Locator;
  readonly modal: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly nationalIdInput: Locator;
  readonly fileNumberInput: Locator;
  readonly addressInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebarLink = page.locator('#sidebar-link-clients');
    this.addButton = page.locator('button', { hasText: /إضافة عميل|تسجيل موكل/ }).first();
    this.modal = page.locator('#add-client-modal');
    this.nameInput = page.locator('#input-add-client-name');
    this.phoneInput = page.locator('#input-add-client-phone');
    this.nationalIdInput = page.locator('#input-add-client-national-id');
    this.fileNumberInput = page.locator('#input-add-client-file-number');
    this.addressInput = page.locator('#input-add-client-address');
    // Submit button is inside the modal — locate by id
    this.submitButton = this.modal.locator('#submit-client-btn');
    this.cancelButton = this.modal.getByRole('button', { name: 'إلغاء' });
  }

  async goto() {
    await this.sidebarLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  async openAddModal() {
    // The "add" trigger button text varies; use the modal open via clicking the
    // first matching button in the clients header.
    await this.addButton.click();
    await this.modal.waitFor({ state: 'visible' });
  }

  /**
   * Fill the Add Client modal with the provided overrides. The phone
   * input requires a valid 14-digit national id which createMockClient
   * generates automatically.
   */
  async fillForm(overrides: MockClientOverrides = {}) {
    const client = createMockClient(overrides);
    await this.nameInput.fill(client.name);
    await this.phoneInput.fill(client.phone);
    await this.nationalIdInput.fill(client.nationalId);
    if (client.fileNumber) {
      await this.fileNumberInput.fill(client.fileNumber);
    }
    // The address input is optional but stable selector
    const addr = await this.addressInput.count();
    if (addr > 0) {
      await this.addressInput.fill(client.address);
    }
    return client;
  }

  async submit() {
    await this.submitButton.click();
    // Wait for modal to close
    await this.modal.waitFor({ state: 'hidden', timeout: 5_000 });
  }

  /**
   * Asserts a client with the given name is visible somewhere in the
   * current view (list, card, or table).
   */
  async expectInList(name: string) {
    await this.page
      .locator('text=' + name)
      .first()
      .waitFor({ state: 'visible', timeout: 5_000 });
  }

  async expectNotInList(name: string) {
    // Best effort: wait for a moment then assert absent
    await this.page.waitForTimeout(300);
    const count = await this.page.locator(`text=${name}`).count();
    if (count > 0) {
      throw new Error(`Client "${name}" should be deleted but is still visible.`);
    }
  }
}
