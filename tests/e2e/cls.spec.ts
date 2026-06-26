import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers';

/**
 * Measure Cumulative Layout Shift via PerformanceObserver.
 * Resolves with the sum of layout-shift entries (excluding user-initiated)
 * after `settleMs` of network/DOM quiet.
 */
async function measureCLS(page: Page, settleMs = 2500): Promise<number> {
  return await page.evaluate(
    (settle) =>
      new Promise<number>((resolve) => {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as PerformanceEntry[]) {
            // Layout-shift entries have `value` and `hadRecentInput`.
            const e = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
            if (!e.hadRecentInput) cls += e.value;
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(Math.round(cls * 10000) / 10000);
        }, settle);
      }),
    settleMs,
  );
}

// Google's "good" threshold is 0.1. We assert below 0.1 per route.
const CLS_BUDGET = 0.1;

const ROUTES_PUBLIC = ['/login', '/register'];
const ROUTES_AUTH = ['/', '/loja', '/perfil', '/assinaturas'];

test.describe('Web Vitals - CLS', () => {
  for (const route of ROUTES_PUBLIC) {
    test(`CLS budget on public route ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'networkidle' });
      const cls = await measureCLS(page);
      console.log(`CLS ${route} = ${cls}`);
      expect(cls, `CLS for ${route} exceeded ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
    });
  }

  test('CLS budget on authenticated routes', async ({ page }) => {
    await login(page);
    for (const route of ROUTES_AUTH) {
      await page.goto(route, { waitUntil: 'networkidle' });
      const cls = await measureCLS(page);
      console.log(`CLS ${route} = ${cls}`);
      expect(cls, `CLS for ${route} exceeded ${CLS_BUDGET}`).toBeLessThan(CLS_BUDGET);
    }
  });
});
