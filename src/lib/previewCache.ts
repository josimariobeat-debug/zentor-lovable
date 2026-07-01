/**
 * Cache module-level (persiste entre montagens de componentes) com TTL
 * para produtos e modelos de medidas usados nos modais de preview.
 *
 * Persistência: além do Map em memória, cada store espelha suas entradas
 * em Web Storage (sessionStorage por padrão; localStorage para dados que
 * devem sobreviver ao fechamento da aba). Ao inicializar, o módulo
 * re-hidrata as entradas ainda válidas — dados sobrevivem a F5 e a
 * navegações completas sem novo fetch enquanto dentro do TTL.
 */

export type CachedProduct = {
  id: string;
  name: string;
  price: string;
  image?: string | null;
  url?: string | null;
};

export type CachedMeasure = {
  id: string;
  name: string;
  rows: Array<{ id: string; tamanho: string; medida: string; valor: string }>;
};

// TTL padrão: 5 minutos.
export const PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
// TTL para "não encontrado" — 30s.
export const NOT_FOUND_TTL_MS = 30 * 1000;

// Versão do schema persistido — bump para invalidar caches antigos.
const CACHE_VERSION = 'v1';

type Entry<T> = { value: T; expiresAt: number };

type StorageKind = 'session' | 'local';

function tryStorage(s: Storage | undefined | null): Storage | null {
  if (!s) return null;
  try {
    const k = '__zc_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

/**
 * Resolve o storage preferido com fallback automático.
 * - 'session' → tenta sessionStorage, cai para localStorage se indisponível
 *   (ex.: Safari em modo privado antigo, iframes com storage bloqueado,
 *   contextos sem sessionStorage). Retorna null se ambos falharem.
 * - 'local'   → tenta localStorage, cai para sessionStorage.
 */
function getStorage(kind: StorageKind): { storage: Storage; kind: StorageKind } | null {
  if (typeof window === 'undefined') return null;
  const primary = kind === 'local' ? window.localStorage : window.sessionStorage;
  const secondary = kind === 'local' ? window.sessionStorage : window.localStorage;
  const p = tryStorage(primary);
  if (p) return { storage: p, kind };
  const s = tryStorage(secondary);
  if (s) return { storage: s, kind: kind === 'local' ? 'session' : 'local' };
  return null;
}

function storageKey(namespace: string) {
  return `zentor:previewCache:${CACHE_VERSION}:${namespace}`;
}

function makeStore<T>(ttl: number, namespace: string, storageKind: StorageKind = 'session') {
  const map = new Map<string, Entry<T>>();
  const storage = getStorage(storageKind);
  const sKey = storageKey(namespace);

  // Hidrata do storage descartando expirados.
  if (storage) {
    try {
      const raw = storage.getItem(sKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Entry<T>>;
        const now = Date.now();
        Object.entries(parsed).forEach(([k, e]) => {
          if (e && typeof e.expiresAt === 'number' && e.expiresAt >= now) {
            map.set(k, e);
          }
        });
      }
    } catch {
      // storage corrompido — ignora e recomeça.
      try { storage.removeItem(sKey); } catch { /* noop */ }
    }
  }

  // Persistência com debounce leve (coalesce writes na mesma tick).
  let flushScheduled = false;
  function scheduleFlush() {
    if (!storage || flushScheduled) return;
    flushScheduled = true;
    const run = () => {
      flushScheduled = false;
      try {
        const now = Date.now();
        const obj: Record<string, Entry<T>> = {};
        map.forEach((e, k) => { if (e.expiresAt >= now) obj[k] = e; });
        storage.setItem(sKey, JSON.stringify(obj));
      } catch {
        // Quota ou outra falha — melhor perder o cache silenciosamente
        // do que quebrar a UI.
      }
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(run);
    else Promise.resolve().then(run);
  }

  return {
    get(key: string): T | undefined {
      const e = map.get(key);
      if (!e) return undefined;
      if (e.expiresAt < Date.now()) { map.delete(key); scheduleFlush(); return undefined; }
      return e.value;
    },
    has(key: string): boolean {
      return this.get(key) !== undefined;
    },
    set(key: string, value: T, ttlOverride?: number) {
      map.set(key, { value, expiresAt: Date.now() + (ttlOverride ?? ttl) });
      scheduleFlush();
    },
    delete(key: string) {
      map.delete(key);
      scheduleFlush();
    },
    clear() {
      map.clear();
      if (storage) { try { storage.removeItem(sKey); } catch { /* noop */ } }
    },
    validKeys(): string[] {
      const now = Date.now();
      const out: string[] = [];
      map.forEach((e, k) => { if (e.expiresAt >= now) out.push(k); });
      return out;
    },
  };
}

// Produtos e medidas — sessionStorage é suficiente (aba); troque para
// 'local' se quiser sobrevivência entre janelas/reboots do browser.
export const productsStore = makeStore<CachedProduct>(PREVIEW_CACHE_TTL_MS, 'products', 'session');
export const measuresStore = makeStore<CachedMeasure>(PREVIEW_CACHE_TTL_MS, 'measures', 'session');
export const productsNotFoundStore = makeStore<true>(NOT_FOUND_TTL_MS, 'products_not_found', 'session');

export function invalidateProduct(id: string) {
  productsStore.delete(id);
  productsNotFoundStore.delete(id);
}
export function invalidateMeasure(id: string) {
  measuresStore.delete(id);
}

export function seedProducts(items: CachedProduct[]) {
  items.forEach((p) => productsStore.set(p.id, p));
}
export function seedMeasures(items: CachedMeasure[]) {
  items.forEach((m) => measuresStore.set(m.id, m));
}

/** Limpa todos os caches de preview (útil em logout). */
export function clearPreviewCache() {
  productsStore.clear();
  measuresStore.clear();
  productsNotFoundStore.clear();
}
