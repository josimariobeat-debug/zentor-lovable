/*! Zentor Loader v3 — bootstrap paralelo: core + fetch em paralelo,
 *  render imediato quando cache existe, sem esperar window.load.
 *  Novo em v3:
 *   - core.js baixa em paralelo com o fetch de config (não sequencial).
 *   - Config atual é exposto via `__ZENTOR__.config` (cache) e via
 *     `__ZENTOR__.configPromise` (rede) — core consome o que chegar primeiro.
 *   - <link rel=preconnect> para o origin do CDN, reduzindo TLS/TCP inicial.
 */
(function () {
  if (window.__ZENTOR_LOADER__) return;
  window.__ZENTOR_LOADER__ = true;

  var s = document.currentScript;
  if (!s) { var all = document.getElementsByTagName('script'); s = all[all.length - 1]; }
  var src;
  try { src = new URL(s.src); } catch (e) { return; }
  var STORE = src.searchParams.get('store') || (s.dataset && s.dataset.store);
  if (!STORE) { console.warn('[Zentor] loader: parâmetro store ausente'); return; }
  var ORIGIN = src.origin;

  // Preconnect ao CDN antes de qualquer request — economiza handshake TLS/TCP.
  try {
    var pc = document.createElement('link');
    pc.rel = 'preconnect'; pc.href = ORIGIN; pc.crossOrigin = '';
    document.head.appendChild(pc);
  } catch (_) {}

  function normalizePath(input) {
    if (!input) return '/';
    var v = String(input).trim();
    v = v.replace(/^https?:\/\/[^/]+/i, '');
    var q = v.indexOf('?'); if (q !== -1) v = v.slice(0, q);
    var h = v.indexOf('#'); if (h !== -1) v = v.slice(0, h);
    v = v.toLowerCase();
    if (!v) return '/';
    if (v.length > 1 && v.charAt(v.length - 1) === '/') v = v.slice(0, -1);
    if (v.charAt(0) !== '/') v = '/' + v;
    return v;
  }

  var rawPath = location.pathname + location.search;
  var normPath = normalizePath(location.pathname);
  var cacheKey = 'zt:cfg:' + STORE + ':' + normPath;
  var TTL = 60 * 1000;

  function readCache() {
    try {
      var raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || (Date.now() - p.t) > TTL) return null;
      return p.v;
    } catch (_) { return null; }
  }
  function writeCache(v) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: v })); } catch (_) {}
  }

  // Estado compartilhado com o core.
  var initial = { store: STORE, origin: ORIGIN, path: rawPath };
  var cached = readCache();
  if (cached) initial.config = cached;
  window.__ZENTOR__ = initial;

  // Dispara fetch e injeção do core EM PARALELO — não esperamos um pelo outro.
  var url = ORIGIN + '/api/public/widget?store=' + encodeURIComponent(STORE) + '&path=' + encodeURIComponent(rawPath);
  var fetchP = fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg) writeCache(cfg);
      return cfg;
    })
    .catch(function () { return null; });
  window.__ZENTOR__.configPromise = fetchP;

  // Só injeta o core se: já temos cache (renderiza imediato) OU o fetch trouxe
  // stories (para páginas sem stories mapeados, não polui o DOM).
  function inject(version) {
    if (window.__ZENTOR_RUNTIME__) return;
    window.__ZENTOR_RUNTIME__ = true;
    var w = document.createElement('script');
    w.src = ORIGIN + '/widget/core.js?store=' + encodeURIComponent(STORE) + '&v=' + encodeURIComponent(version || '11');
    w.async = true;
    w.setAttribute('data-store', STORE);
    document.head.appendChild(w);
  }

  if (cached && cached.stories && cached.stories.length) {
    // Fast path: render imediato baseado em cache; fetch atualiza em background.
    inject(cached.version);
    fetchP.then(function (cfg) {
      if (!cfg) return;
      window.__ZENTOR__.config = cfg;
    });
  } else {
    // Sem cache útil: aguarda fetch, injeta core em paralelo assim que
    // souber que há stories para esta página.
    fetchP.then(function (cfg) {
      if (!cfg || !cfg.stories || !cfg.stories.length) return;
      window.__ZENTOR__.config = cfg;
      inject(cfg.version);
    });
  }
})();

