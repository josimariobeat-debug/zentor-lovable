/*! Zentor Loader v2 — carrega o core sob demanda somente quando há stories para a página atual */
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

  // Normalização (mirror de src/lib/urlMatch.ts) — usada só para o cache key.
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

  function inject(cfg) {
    if (!cfg || !cfg.stories || !cfg.stories.length) return;
    if (window.__ZENTOR_RUNTIME__) return;
    window.__ZENTOR_RUNTIME__ = true;
    window.__ZENTOR__ = { store: STORE, config: cfg, origin: ORIGIN, path: rawPath };
    var w = document.createElement('script');
    w.src = ORIGIN + '/widget/core.js?store=' + encodeURIComponent(STORE) + '&v=' + encodeURIComponent(cfg.version || '3');
    w.async = true;
    w.setAttribute('data-store', STORE);
    document.head.appendChild(w);
  }

  var cached = readCache();
  if (cached) inject(cached);

  var url = ORIGIN + '/api/public/widget?store=' + encodeURIComponent(STORE) + '&path=' + encodeURIComponent(rawPath);
  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) return;
      writeCache(cfg);
      if (!cached) inject(cfg);
    })
    .catch(function () {});
})();
