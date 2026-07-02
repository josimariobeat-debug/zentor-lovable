/*! Zentor Loader — carrega o widget sob demanda somente quando há stories para a página atual */
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

  var path = location.pathname + location.search;
  var cacheKey = 'zt:cfg:' + STORE + ':' + path;
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
    window.__ZENTOR__ = { store: STORE, config: cfg, origin: ORIGIN, path: path };
    var w = document.createElement('script');
    w.src = ORIGIN + '/widget.js?store=' + encodeURIComponent(STORE) + '&v=' + encodeURIComponent(cfg.version || '1');
    w.async = true;
    w.setAttribute('data-store', STORE);
    document.head.appendChild(w);
  }

  var cached = readCache();
  if (cached) inject(cached);

  var url = ORIGIN + '/api/public/widget?store=' + encodeURIComponent(STORE) + '&path=' + encodeURIComponent(path);
  fetch(url, { credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) return;
      writeCache(cfg);
      if (!cached) inject(cfg);
    })
    .catch(function () {});
})();
