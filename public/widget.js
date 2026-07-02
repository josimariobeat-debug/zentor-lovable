/*! Zentor Widget compatibility shim — redirects legacy installs to the unified loader */
(function () {
  'use strict';

  var currentScript = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var src;
  try { src = currentScript && currentScript.src ? new URL(currentScript.src) : null; } catch (_) { src = null; }
  var store = (currentScript && currentScript.dataset && currentScript.dataset.store) ||
    (src && src.searchParams.get('store')) ||
    (window.__ZENTOR__ && window.__ZENTOR__.store);

  if (!store) {
    try { console.warn('[Zentor] data-store/store ausente no script do widget'); } catch (_) {}
    return;
  }

  var origin = src ? src.origin : (window.__ZENTOR__ && window.__ZENTOR__.origin) || '';
  if (!origin) return;

  // The old /widget.js implementation used a separate vanilla modal. Keeping this
  // file as a shim makes existing e-commerce installs use /loader.js + /widget/core.js,
  // which opens the React iframe that reuses the exact admin preview components.
  window.__ZENTOR__ = Object.assign({}, window.__ZENTOR__ || {}, { store: store, origin: origin });

  var loaderSrc = origin + '/loader.js?store=' + encodeURIComponent(store) + '&legacy=widget-js';
  var existing = Array.prototype.slice.call(document.getElementsByTagName('script')).some(function (script) {
    try {
      var u = new URL(script.src);
      return u.origin === origin && u.pathname === '/loader.js' &&
        (u.searchParams.get('store') || (script.dataset && script.dataset.store)) === store;
    } catch (_) { return false; }
  });
  if (existing || window.__ZENTOR_LOADER__) return;

  var loader = document.createElement('script');
  loader.src = loaderSrc;
  loader.async = true;
  loader.setAttribute('data-store', store);
  (document.head || document.documentElement).appendChild(loader);
})();
