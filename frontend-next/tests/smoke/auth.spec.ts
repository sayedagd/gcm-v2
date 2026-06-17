import { expect, test } from '@playwright/test';
import { loginAsAdmin, smokeCredentials } from './helpers';

test.describe('authentication smoke', () => {
  test('invalid credentials stay on login and surface an error', async ({ page }) => {
    await page.goto('/login?next=%2Fdashboard');

    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('wrong-password');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid login credentials|بيانات الدخول غير صحيحة|unable to sign in right now|unable to reach the server/i)).toBeVisible();
  });

  test('admin login navigates to the requested dashboard', async ({ page }) => {
    await loginAsAdmin(page, '/dashboard');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /(Command Center|مركز القيادة)/i })).toBeVisible();
  });

  test('smoke credentials are configured', () => {
    expect(smokeCredentials.email).toBeTruthy();
    expect(smokeCredentials.password).toBeTruthy();
  });
});
