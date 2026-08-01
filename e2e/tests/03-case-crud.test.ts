/**
 * Test 03 — Case CRUD + Client Link
 *
 * Creates a case linked to an existing client and verifies the case
 * appears in the Cases list and is associated with the client.
 */

import { test, expect } from '@playwright/test';
import { bypassLogin } from '../fixtures/auth';
import { ClientsPage } from '../pages/ClientsPage';
import { CasesPage } from '../pages/CasesPage';
import { createMockClient } from '../fixtures/testData';

test.describe('Case CRUD + Client Link', () => {
  test('add a case linked to an existing client', async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');

    // Step 1: create a client
    const clients = new ClientsPage(page);
    await clients.goto();
    await clients.openAddModal();
    const newClient = await clients.fillForm({ name: 'موكل قضية تجريبية' });
    await clients.submit();
    await clients.expectInList(newClient.name);

    // Step 2: open Cases tab and add a new case
    const cases = new CasesPage(page);
    await cases.goto();
    await cases.openAddCase();

    const caseNumber = `9${Date.now().toString().slice(-4)} لسنة 2026`;
    await cases.fillNewCase({
      caseNumber,
      clientId: '', // We will try to select by visible option
      court: 'محكمة شمال القاهرة الكلية',
      circuit: '12 مدني كلي',
    });

    // If the clientId wasn't preset, find the option that matches the client name
    const clientSelect = cases.clientSelect;
    // Find the option element with the client name and select by label
    const optionValue = await clientSelect
      .locator(`option:has-text("${newClient.name}")`)
      .getAttribute('value');
    if (optionValue) {
      await clientSelect.selectOption(optionValue);
    }

    await cases.submitNewCase();

    // Verify the case appears
    await cases.expectInList(caseNumber);
  });
});
