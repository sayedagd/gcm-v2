import { expect, test } from '@playwright/test';
import { expectApiHealthy } from './helpers';

test.describe('public smoke', () => {
  test('root redirects to landing', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/landing$/);
  });

  test('landing page renders and hydrates public config', async ({ page }) => {
    await expectApiHealthy(page);

    await page.goto('/landing');

    await expect(page.getByRole('heading', { level: 1, name: /(Sustainable Environmental Solutions|حلول بيئية)/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /(Our Specialized Environmental Services|خدماتنا البيئية المتخصصة)/i })).toBeVisible();
  });

  test('store page stays public and loads its hero copy', async ({ page }) => {
    await page.goto('/store');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1, name: /(Environmental Equipment Store|متجر الأجهزة البيئية)/i })).toBeVisible();
  });

  test('unauthenticated dashboard requests redirect to login with next', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard|\/login\?next=\/dashboard/);
    await expect(page.getByRole('button', { name: /Sign In|دخول للنظام/i })).toBeVisible();
  });
});
