/**
 * URL normalization + story-visibility rule matching.
 * Used by:
 *   - server: src/routes/api/public/widget.ts
 *   - client (loader): logic mirrored inline in public/loader.js
 *   - client (widget core): logic mirrored inline in public/widget/core.js
 *
 * Keep this file the single source of truth for rule semantics.
 * If you extend it, update the two mirrored copies.
 */

export type UrlRuleType =
  | 'exact'      // path === value
  | 'contains'   // path.includes(value)
  | 'all'        // sempre true
  | 'home'       // path === '/'
  | 'product'    // heurística de página de produto
  | 'category'   // heurística de página de categoria/coleção
  | 'search'     // página de busca
  | 'cart'       // carrinho / checkout
  // aliases legados vindos do banco:
  | 'exato'
  | 'contem'
  | 'todas';

export interface UrlRule {
  type?: UrlRuleType | string;
  mode?: UrlRuleType | string; // alias antigo
  value?: string | null;
}

const PRODUCT_HINTS = ['/produto/', '/produtos/', '/products/', '/product/', '/p/'];
const CATEGORY_HINTS = ['/categoria/', '/categorias/', '/collections/', '/collection/', '/c/', '/cat/'];
const SEARCH_HINTS = ['/busca', '/buscar', '/search', '/pesquisa'];
const CART_HINTS = ['/carrinho', '/cart', '/checkout/cart', '/sacola'];

/**
 * Normaliza um path/URL para comparação:
 *  - remove protocolo/host se vier URL completa,
 *  - remove querystring inteira,
 *  - remove #hash,
 *  - remove barra final (exceto raiz),
 *  - lowercase.
 */
export function normalizePath(input: string | null | undefined): string {
  if (!input) return '/';
  let s = String(input).trim();
  if (!s) return '/';
  // strip protocol + host
  s = s.replace(/^https?:\/\/[^/]+/i, '');
  // strip query & hash
  const qIdx = s.indexOf('?');
  if (qIdx !== -1) s = s.slice(0, qIdx);
  const hIdx = s.indexOf('#');
  if (hIdx !== -1) s = s.slice(0, hIdx);
  s = s.toLowerCase();
  if (!s) return '/';
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  if (!s.startsWith('/')) s = '/' + s;
  return s;
}

/** Normaliza o valor da regra (o que o lojista digitou) da mesma forma que o path. */
export function normalizeRuleValue(v: string | null | undefined): string {
  return normalizePath(v);
}

function ruleType(rule: UrlRule): string {
  const raw = (rule.type ?? rule.mode ?? 'contains').toString().toLowerCase();
  // aliases pt-BR do modelo antigo
  if (raw === 'exato') return 'exact';
  if (raw === 'contem' || raw === 'contém') return 'contains';
  if (raw === 'todas' || raw === 'todos') return 'all';
  return raw;
}

/** True se o path bate com UMA regra. */
export function ruleMatches(rule: UrlRule, normalizedPath: string): boolean {
  const type = ruleType(rule);
  if (type === 'all') return true;
  if (type === 'home') return normalizedPath === '/';
  if (type === 'product') return PRODUCT_HINTS.some((h) => normalizedPath.includes(h));
  if (type === 'category') return CATEGORY_HINTS.some((h) => normalizedPath.includes(h));
  if (type === 'search') return SEARCH_HINTS.some((h) => normalizedPath.includes(h));
  if (type === 'cart') return CART_HINTS.some((h) => normalizedPath.includes(h));

  const v = normalizeRuleValue(rule.value);
  if (!v || v === '/') {
    // valor vazio: só considera se for regra "all"; contains "/" bateria em tudo,
    // o que não é o que o lojista quer. Ignora.
    return false;
  }
  if (type === 'exact') return normalizedPath === v;
  // default: contains
  return normalizedPath.includes(v);
}

/**
 * True se o story deve aparecer nesta página.
 * Sem regras (`urls` vazio/ausente) = mostrar em todas (comportamento legado).
 */
export function storyMatchesPath(urls: unknown, path: string): boolean {
  if (!Array.isArray(urls) || urls.length === 0) return true;
  const normalized = normalizePath(path);
  for (const r of urls as UrlRule[]) {
    if (!r) continue;
    if (ruleMatches(r, normalized)) return true;
  }
  return false;
}
