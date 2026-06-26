import { test, expect } from '@playwright/test';
import { APP_UUID_URL_RE, login } from './helpers';

test.describe('Stories app /app/:appId text-key fallback', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('text key "stories-videos" resolves to installed_apps.id (UUID) and redirects', async ({ page }) => {
    await page.goto('/app/stories-videos');
    await page.waitForURL(APP_UUID_URL_RE, { timeout: 10_000 });
    expect(page.url()).toMatch(APP_UUID_URL_RE);
  });

  test('preserves query params and hash after redirect', async ({ page }) => {
    await page.goto('/app/stories-videos?tab=galeria&foo=bar#anchor');
    await page.waitForURL(APP_UUID_URL_RE, { timeout: 10_000 });
    const url = new URL(page.url());
    expect(url.pathname).toMatch(APP_UUID_URL_RE);
    expect(url.searchParams.get('tab')).toBe('galeria');
    expect(url.searchParams.get('foo')).toBe('bar');
    expect(url.hash).toBe('#anchor');
  });

  test('invalid text key redirects to / and shows an error message', async ({ page }) => {
    await page.goto('/app/invalid-key-xyz');
    await page.waitForURL(/http:\/\/[^/]+\/?$/, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.getByText(/não encontrado|invalid-key-xyz/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
