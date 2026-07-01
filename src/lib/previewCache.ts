/**
 * Cache module-level (persiste entre montagens de componentes) com TTL
 * para produtos e modelos de medidas usados nos modais de preview.
 *
 * Objetivo: ao reabrir o modal, reutilizar dados ainda "frescos" sem
 * disparar novas requisições ao backend. Entradas expiradas são
 * transparentemente ignoradas e re-buscadas.
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

// TTL padrão: 5 minutos. Suficiente para reaberturas rápidas do mesmo
// modal sem ficar servindo dados antigos por muito tempo.
export const PREVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
// TTL para "não encontrado" — mais curto (30s) para permitir recuperação
// rápida se o produto for criado logo depois.
export const NOT_FOUND_TTL_MS = 30 * 1000;

type Entry<T> = { value: T; expiresAt: number };

function makeStore<T>(ttl: number) {
  const map = new Map<string, Entry<T>>();
  return {
    get(key: string): T | undefined {
      const e = map.get(key);
      if (!e) return undefined;
      if (e.expiresAt < Date.now()) { map.delete(key); return undefined; }
      return e.value;
    },
    has(key: string): boolean {
      return this.get(key) !== undefined;
    },
    set(key: string, value: T, ttlOverride?: number) {
      map.set(key, { value, expiresAt: Date.now() + (ttlOverride ?? ttl) });
    },
    delete(key: string) { map.delete(key); },
    clear() { map.clear(); },
    /** Snapshot dos ids ainda válidos. Não copia valores. */
    validKeys(): string[] {
      const now = Date.now();
      const out: string[] = [];
      map.forEach((e, k) => { if (e.expiresAt >= now) out.push(k); });
      return out;
    },
  };
}

export const productsStore = makeStore<CachedProduct>(PREVIEW_CACHE_TTL_MS);
export const measuresStore = makeStore<CachedMeasure>(PREVIEW_CACHE_TTL_MS);
// Marca de "confirmado ausente" com TTL curto — evita bombardear o backend
// com IDs que sabidamente não existem, mas se recupera rapidamente.
export const productsNotFoundStore = makeStore<true>(NOT_FOUND_TTL_MS);

/** Invalida uma entrada específica (ex.: após edição/criação). */
export function invalidateProduct(id: string) {
  productsStore.delete(id);
  productsNotFoundStore.delete(id);
}
export function invalidateMeasure(id: string) {
  measuresStore.delete(id);
}

/** Bulk seed — usado após listagens (loadProductsCache, prefetch etc.). */
export function seedProducts(items: CachedProduct[]) {
  items.forEach((p) => productsStore.set(p.id, p));
}
export function seedMeasures(items: CachedMeasure[]) {
  items.forEach((m) => measuresStore.set(m.id, m));
}
