/**
 * Métricas de transição entre stories.
 *
 * Mede o gap perceptível entre o fim de um story e a apresentação do primeiro
 * frame do próximo, além de indicar se o próximo já estava pré-carregado.
 *
 * Marcadores por transição (idx N → idx M):
 *  - end:        chamada do goNext (story atual encerra).
 *  - ready:      próximo elemento de mídia sinaliza que tem dados suficientes
 *                para começar a renderizar (img.onload OU video.loadeddata).
 *  - firstFrame: primeiro frame realmente pintado na tela
 *                (video.requestVideoFrameCallback OU video.playing OU
 *                img.onload + rAF; whichever vier primeiro).
 *
 * Também loga o estado de pré-carregamento da URL alvo: `preloaded=true` se o
 * preloader oculto já havia disparado `loadeddata`/`onload` antes do `end`.
 *
 * Exposto em `window.__storyMetrics` para inspeção manual; cada transição é
 * impressa via `console.info('[stories]', ...)` para registro contínuo.
 */

export interface TransitionRecord {
  from: number;
  to: number;
  /** "video" | "image" — tipo da próxima mídia */
  kind: 'video' | 'image';
  url: string;
  /** Estava pré-carregada antes de iniciar a transição? */
  preloaded: boolean;
  /** ms entre end e ready (mídia anunciou dados suficientes). */
  endToReadyMs: number | null;
  /** ms entre end e firstFrame (primeiro frame visível). */
  endToFirstFrameMs: number | null;
  /** timestamp absoluto do end (performance.now). */
  endAt: number;
}

type PreloadStatus = { loadedAt: number | null };

const MAX_HISTORY = 50;

class StoryMetrics {
  private preloads = new Map<string, PreloadStatus>();
  private pending: {
    from: number;
    to: number;
    kind: 'video' | 'image';
    url: string;
    preloaded: boolean;
    endAt: number;
    readyAt: number | null;
    firstFrameAt: number | null;
  } | null = null;
  history: TransitionRecord[] = [];

  /** Chamado quando um preloader oculto sinaliza que carregou (loadeddata/onload). */
  markPreloaded(url: string) {
    if (!url) return;
    this.preloads.set(url, { loadedAt: performance.now() });
  }

  /** Limpa entrada de preload (ex.: ao desmontar StoryViewer). */
  clearPreload(url: string) {
    this.preloads.delete(url);
  }

  /** Story atual termina → transição para `to`. */
  markEnd(from: number, to: number, kind: 'video' | 'image', url: string) {
    // Se existir uma transição anterior sem firstFrame, finaliza com o que tem.
    if (this.pending) this.flush();
    const pre = this.preloads.get(url);
    this.pending = {
      from,
      to,
      kind,
      url,
      preloaded: !!pre?.loadedAt,
      endAt: performance.now(),
      readyAt: null,
      firstFrameAt: null,
    };
  }

  markReady(url: string) {
    if (!this.pending || this.pending.url !== url) return;
    if (this.pending.readyAt != null) return;
    this.pending.readyAt = performance.now();
    this.maybeFlush();
  }

  markFirstFrame(url: string) {
    if (!this.pending || this.pending.url !== url) return;
    if (this.pending.firstFrameAt != null) return;
    this.pending.firstFrameAt = performance.now();
    // Garante que ready foi marcado (pode chegar junto com firstFrame).
    if (this.pending.readyAt == null) this.pending.readyAt = this.pending.firstFrameAt;
    this.maybeFlush();
  }

  private maybeFlush() {
    if (!this.pending) return;
    if (this.pending.firstFrameAt != null && this.pending.readyAt != null) this.flush();
  }

  private flush() {
    if (!this.pending) return;
    const p = this.pending;
    const record: TransitionRecord = {
      from: p.from,
      to: p.to,
      kind: p.kind,
      url: p.url,
      preloaded: p.preloaded,
      endAt: p.endAt,
      endToReadyMs: p.readyAt != null ? Math.round(p.readyAt - p.endAt) : null,
      endToFirstFrameMs: p.firstFrameAt != null ? Math.round(p.firstFrameAt - p.endAt) : null,
    };
    this.history.push(record);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.pending = null;

    // Log compacto e legível no console — visível em mobile via remote inspector.
    // Critério "Instagram-like": endToFirstFrame < 50ms é instantâneo; 50-150ms ok; >150ms travada.
    const verdict =
      record.endToFirstFrameMs == null
        ? '???'
        : record.endToFirstFrameMs < 50
          ? 'instant'
          : record.endToFirstFrameMs < 150
            ? 'ok'
            : 'STUTTER';
    // eslint-disable-next-line no-console
    console.info(
      `[stories] ${record.from}→${record.to} ${record.kind} preloaded=${record.preloaded} ready=${record.endToReadyMs}ms firstFrame=${record.endToFirstFrameMs}ms [${verdict}]`,
    );
  }

  reset() {
    this.preloads.clear();
    this.pending = null;
    this.history = [];
  }

  summary() {
    const ff = this.history.map((h) => h.endToFirstFrameMs).filter((x): x is number => x != null);
    if (!ff.length) return { count: 0, avg: 0, p95: 0, max: 0, stutters: 0 };
    const sorted = [...ff].sort((a, b) => a - b);
    const avg = Math.round(ff.reduce((a, b) => a + b, 0) / ff.length);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const max = sorted[sorted.length - 1];
    const stutters = ff.filter((x) => x >= 150).length;
    return { count: ff.length, avg, p95, max, stutters };
  }
}

export const storyMetrics = new StoryMetrics();

if (typeof window !== 'undefined') {
  (window as Window & { __storyMetrics?: StoryMetrics }).__storyMetrics = storyMetrics;
}
