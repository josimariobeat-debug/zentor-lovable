/*! Zentor Loader v5 — alias neutro para evitar bloqueadores por nome de rota */
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
  var TTL = 5 * 1000;
  var lastVersion = '';

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
    if (!cfg) return;
    window.__ZENTOR__ = { store: STORE, config: cfg, origin: ORIGIN, path: rawPath };
    if (window.__ZENTOR_WIDGET__ && window.__ZENTOR_WIDGET__.update) {
      window.__ZENTOR_WIDGET__.update(cfg);
      lastVersion = cfg.version || lastVersion;
      return;
    }
    if (!cfg.stories || !cfg.stories.length) return;
    if (window.__ZENTOR_RUNTIME__) return;
    window.__ZENTOR_RUNTIME__ = true;
    var w = document.createElement('script');
    w.src = ORIGIN + '/zt/core.js?store=' + encodeURIComponent(STORE) + '&v=' + encodeURIComponent(cfg.version || '8');
    w.async = true;
    w.setAttribute('data-store', STORE);
    document.head.appendChild(w);
    lastVersion = cfg.version || lastVersion;
  }

  var cached = readCache();
  if (cached) inject(cached);

  function sync() {
    var url = ORIGIN + '/api/public/zt-cfg?store=' + encodeURIComponent(STORE) +
      '&path=' + encodeURIComponent(rawPath) + '&_t=' + Date.now();
    fetch(url, { credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg) return;
        writeCache(cfg);
        if ((cfg.version || '') !== lastVersion || !window.__ZENTOR_RUNTIME__) inject(cfg);
      })
      .catch(function () {});
  }

  sync();
  window.setInterval(sync, 4000);
})();