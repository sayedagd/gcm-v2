import { expect, test } from '@playwright/test';
import { createSmokeCompany, deleteSmokeCompany, loginAsAdmin, smokeMutationMode } from './helpers';

test.describe('dashboard smoke', () => {
  test('dashboard remains reachable after authentication and cookie write', async ({ page }) => {
    await loginAsAdmin(page, '/dashboard');

    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /(Command Center|مركز القيادة)/i })).toBeVisible();
    await expect(page.getByText(/Internal Operations Dashboard|لوحة العمليات الداخلية/i)).toBeVisible();
  });

  test('company write smoke creates and cleans up a temporary record', async ({ page }) => {
    test.skip(!smokeMutationMode, 'Set SMOKE_ENABLE_MUTATIONS=true to run write smoke checks');

    await loginAsAdmin(page, '/dashboard');

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const companyId = `SMOKE-${suffix}`;
    const companyName = `Smoke Company ${suffix}`;

    try {
      const createResult = await createSmokeCompany(page, companyId, companyName);
      expect(createResult.ok, `company create should succeed: ${JSON.stringify(createResult.json)}`).toBeTruthy();

      const companiesResponse = await page.request.get('/api/v1/companies');
      expect(companiesResponse.ok()).toBeTruthy();

      const companies = (await companiesResponse.json()) as Array<{ company_id?: string; company_name?: string }>;
      expect(companies.some((company) => company.company_id === companyId || company.company_name === companyName)).toBeTruthy();

      const deleteResult = await deleteSmokeCompany(page, companyId);
      expect(deleteResult.ok, `company delete should succeed: ${JSON.stringify(deleteResult.json)}`).toBeTruthy();
    } finally {
      await deleteSmokeCompany(page, companyId).catch(() => null);
    }
  });
});