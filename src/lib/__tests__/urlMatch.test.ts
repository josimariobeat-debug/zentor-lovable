import { describe, it, expect } from 'vitest';
import { normalizePath, storyMatchesPath } from '../urlMatch';

describe('normalizePath', () => {
  it('strips protocol, host, query, hash and trailing slash', () => {
    expect(normalizePath('https://loja.com/produto/blusa/?utm=x#top')).toBe('/produto/blusa');
    expect(normalizePath('/produto/blusa/')).toBe('/produto/blusa');
    expect(normalizePath('/produto/blusa?variant=1')).toBe('/produto/blusa');
    expect(normalizePath('/PRODUTO/Blusa')).toBe('/produto/blusa');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath(null)).toBe('/');
  });
});

describe('storyMatchesPath', () => {
  it('no rules → matches every page', () => {
    expect(storyMatchesPath([], '/qualquer')).toBe(true);
    expect(storyMatchesPath(null, '/x')).toBe(true);
  });

  it('rule.all always matches', () => {
    expect(storyMatchesPath([{ type: 'all' }], '/qualquer')).toBe(true);
    expect(storyMatchesPath([{ type: 'todas' }], '/x')).toBe(true);
  });

  it('exact ignores trailing slash and query', () => {
    const rules = [{ type: 'exact', value: '/produto/blusa' }];
    expect(storyMatchesPath(rules, '/produto/blusa')).toBe(true);
    expect(storyMatchesPath(rules, '/produto/blusa/')).toBe(true);
    expect(storyMatchesPath(rules, '/produto/blusa?utm=x')).toBe(true);
    expect(storyMatchesPath(rules, '/produto/blusa/foto')).toBe(false);
  });

  it('contains works with a fragment', () => {
    const rules = [{ type: 'contains', value: '/produto/' }];
    expect(storyMatchesPath(rules, '/produto/blusa')).toBe(true);
    expect(storyMatchesPath(rules, '/categoria/x')).toBe(false);
  });

  it('home only matches root', () => {
    const rules = [{ type: 'home' }];
    expect(storyMatchesPath(rules, '/')).toBe(true);
    expect(storyMatchesPath(rules, '/produto/x')).toBe(false);
  });

  it('product/category/search/cart heuristics', () => {
    expect(storyMatchesPath([{ type: 'product' }], '/produto/blusa')).toBe(true);
    expect(storyMatchesPath([{ type: 'product' }], '/products/shirt')).toBe(true);
    expect(storyMatchesPath([{ type: 'category' }], '/collections/summer')).toBe(true);
    expect(storyMatchesPath([{ type: 'search' }], '/search')).toBe(true);
    expect(storyMatchesPath([{ type: 'cart' }], '/carrinho')).toBe(true);
    expect(storyMatchesPath([{ type: 'cart' }], '/checkout/cart')).toBe(true);
    expect(storyMatchesPath([{ type: 'cart' }], '/produto/blusa')).toBe(false);
  });

  it('multiple rules → any match wins', () => {
    const rules = [
      { type: 'exact', value: '/home' },
      { type: 'contains', value: '/produto/' },
    ];
    expect(storyMatchesPath(rules, '/home')).toBe(true);
    expect(storyMatchesPath(rules, '/produto/x')).toBe(true);
    expect(storyMatchesPath(rules, '/blog/x')).toBe(false);
  });

  it('legacy aliases (mode + pt-BR)', () => {
    expect(storyMatchesPath([{ mode: 'exato', value: '/x' }], '/x')).toBe(true);
    expect(storyMatchesPath([{ mode: 'contem', value: '/x' }], '/x/y')).toBe(true);
  });
});
