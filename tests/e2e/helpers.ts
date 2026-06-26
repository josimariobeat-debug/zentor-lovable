import { expect, type Page } from '@playwright/test';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const APP_UUID_URL_RE = /\/app\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function login(page: Page) {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('TEST_EMAIL/TEST_PASSWORD env vars are required for e2e tests');
  }
  await page.goto('/login');
  await page.locator('input[type=email]').first().fill(email);
  await page.locator('input[type=password]').first().fill(password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}
