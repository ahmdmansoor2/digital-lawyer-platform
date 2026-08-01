/**
 * Test 04 — Session CRUD + Docket Appearance
 *
 * Adds a session to a case and verifies it appears in the Docket.
 */

import { test } from '@playwright/test';
import { bypassLogin } from '../fixtures/auth';
import { ClientsPage } from '../pages/ClientsPage';
import { CasesPage } from '../pages/CasesPage';

test.describe('Session CRUD + Docket', () => {
  test('add session to a case and verify it shows in the Docket', async ({ page }) => {
    await bypassLogin(page);
    await page.goto('/');

    // Bootstrap: client → case
    const clients = new ClientsPage(page);
    await clients.goto();
    await clients.openAddModal();
    const newClient = await clients.fillForm({ name: 'موكل جلسة تجريبية' });
    await clients.submit();
    await clients.expectInList(newClient.name);

    const cases = new CasesPage(page);
    await cases.goto();
    await cases.openAddCase();
    const caseNumber = `7${Date.now().toString().slice(-4)} لسنة 2026`;
    await cases.fillNewCase({
      caseNumber,
      clientId: '',
      court: 'محكمة شمال القاهرة',
      circuit: '5 مدني',
    });
    const clientOptionValue = await cases.clientSelect
      .locator(`option:has-text("${newClient.name}")`)
      .getAttribute('value');
    if (clientOptionValue) await cases.clientSelect.selectOption(clientOptionValue);
    await cases.submitNewCase();
    await cases.expectInList(caseNumber);

    // Open the case card to reveal the inline "add session" UI
    await cases.openFirstCase();

    // Add a session
    await cases.addInlineSessionButton.waitFor({ state: 'visible', timeout: 5_000 });
    await cases.addInlineSessionButton.click();

    // The form appears below — fill date + objective
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 21);
    const dateStr = futureDate.toISOString().split('T')[0];

    await cases.inlineSessionDateInput.fill(dateStr);
    await cases.inlineSessionObjective.fill('جلسة تجريبية E2E للمرافعة');

    // Submit (button text: "تأكيد ورصد")
    const confirmButton = page.getByRole('button', { name: 'تأكيد ورصد' });
    await confirmButton.click();
    // Wait for the form to close
    await page.waitForTimeout(500);

    // Navigate to the Docket and verify the session shows up
    await page.locator('#sidebar-link-docket').click();
    await page.waitForLoadState('networkidle');

    // The Docket should show the case number or the objective text
    const matches = await page
      .locator(`text=${caseNumber}, text=جلسة تجريبية E2E للمرافعة`)
      .count();
    if (matches === 0) {
      // Some implementations may show only the date — check that too
      const dateMatches = await page.locator(`text=${dateStr}`).count();
      if (dateMatches === 0) {
        throw new Error('Session was not found in the Docket after creation.');
      }
    }
  });
});
