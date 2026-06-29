import { test, expect, chromium } from '@playwright/test';

/**
 * E2E: valida o auto-advance do StoryViewer.
 *
 * - Abre a rota dev `/dev/story-viewer` (não exige login).
 * - Monitora `window.__storyMetrics.history` para confirmar a transição
 *   0 → 1 (story 1 avançou para story 2) e em seguida 1 → 0 (loop voltou
 *   para a story 1) — tudo sem nenhum toque/clique manual.
 */

test.use({
  // Permite autoplay com som em headless Chromium e simula gesto do usuário,
  // para que os <video> dos stories iniciem sem interação.
  launchOptions: {
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test.describe('StoryViewer auto-advance', () => {
  test('avança da story 1 para a 2 e dá loop de volta para a 1', async ({ page }) => {
    test.setTimeout(120_000);

    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[stories]')) consoleLogs.push(text);
    });

    await page.goto('/dev/story-viewer');

    // O player deve estar montado.
    await expect(page.getByTestId('dev-story-root')).toBeVisible();

    // Garante que as métricas globais foram inicializadas.
    await page.waitForFunction(
      () => typeof (window as any).__storyMetrics?.history !== 'undefined',
      undefined,
      { timeout: 10_000 },
    );

    // Aguarda a transição 0 → 1 (story 1 avançou automaticamente para a 2).
    await page.waitForFunction(
      () =>
        ((window as any).__storyMetrics.history as Array<{ from: number; to: number }>)
          .some((t) => t.from === 0 && t.to === 1),
      undefined,
      { timeout: 90_000 },
    );

    // Em seguida, aguarda o loop 1 → 0 (volta para a story 1).
    await page.waitForFunction(
      () =>
        ((window as any).__storyMetrics.history as Array<{ from: number; to: number }>)
          .some((t) => t.from === 1 && t.to === 0),
      undefined,
      { timeout: 90_000 },
    );

    const history = await page.evaluate(
      () => (window as any).__storyMetrics.history as Array<{ from: number; to: number }>,
    );

    // Confere a ordem: a transição 0→1 acontece antes do loop 1→0.
    const firstForward = history.findIndex((t) => t.from === 0 && t.to === 1);
    const firstLoop = history.findIndex((t) => t.from === 1 && t.to === 0);
    expect(firstForward).toBeGreaterThanOrEqual(0);
    expect(firstLoop).toBeGreaterThan(firstForward);

    // Sanidade: pelo menos uma transição foi logada via console.info.
    expect(consoleLogs.some((l) => /\[stories\]\s+0→1/.test(l))).toBe(true);
    expect(consoleLogs.some((l) => /\[stories\]\s+1→0/.test(l))).toBe(true);
  });
});

// Evita warning "unused import" caso eslint pegue. `chromium` deixa o autodetect
// do Playwright explícito caso a config seja sobrescrita no futuro.
void chromium;
