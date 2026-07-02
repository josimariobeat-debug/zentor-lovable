/*! Zentor Widget core v3 — bootstrap + bubbles + lazy viewer
 *  Payload mínimo (~8 KB). Player é carregado sob demanda no 1º clique.
 *  Fonte de verdade da lógica de match: src/lib/urlMatch.ts (mirror abaixo).
 */
(function () {
  'use strict';
  if (window.__ZENTOR_LOADED__) return;
  window.__ZENTOR_LOADED__ = true;

  var currentScript = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var STORE_ID = (currentScript && currentScript.dataset && currentScript.dataset.store) ||
                 (window.__ZENTOR__ && window.__ZENTOR__.store);
  try { if (!STORE_ID && currentScript) STORE_ID = new URL(currentScript.src).searchParams.get('store'); } catch (_) {}
  if (!STORE_ID) { console.warn('[Zentor] data-store ausente'); return; }

  var API_BASE = (function () {
    try { return new URL(currentScript.src).origin; } catch (_) { return ''; }
  })();
  var VIEWER_URL = API_BASE + '/widget/viewer.js';

  /* ── URL match (mirror de src/lib/urlMatch.ts) ── */
  var PRODUCT_HINTS = ['/produto/', '/produtos/', '/products/', '/product/', '/p/'];
  var CATEGORY_HINTS = ['/categoria/', '/categorias/', '/collections/', '/collection/', '/c/', '/cat/'];
  var SEARCH_HINTS = ['/busca', '/buscar', '/search', '/pesquisa'];
  var CART_HINTS = ['/carrinho', '/cart', '/checkout/cart', '/sacola'];

  function normalizePath(input) {
    if (!input) return '/';
    var s = String(input).trim();
    if (!s) return '/';
    s = s.replace(/^https?:\/\/[^/]+/i, '');
    var q = s.indexOf('?'); if (q !== -1) s = s.slice(0, q);
    var h = s.indexOf('#'); if (h !== -1) s = s.slice(0, h);
    s = s.toLowerCase();
    if (!s) return '/';
    if (s.length > 1 && s.charAt(s.length - 1) === '/') s = s.slice(0, -1);
    if (s.charAt(0) !== '/') s = '/' + s;
    return s;
  }
  function ruleType(r) {
    var raw = String(r.type || r.mode || 'contains').toLowerCase();
    if (raw === 'exato') return 'exact';
    if (raw === 'contem' || raw === 'contém') return 'contains';
    if (raw === 'todas' || raw === 'todos') return 'all';
    return raw;
  }
  function ruleMatches(rule, np) {
    var t = ruleType(rule);
    if (t === 'all') return true;
    if (t === 'home') return np === '/';
    function anyHint(list) { for (var i = 0; i < list.length; i++) if (np.indexOf(list[i]) !== -1) return true; return false; }
    if (t === 'product') return anyHint(PRODUCT_HINTS);
    if (t === 'category') return anyHint(CATEGORY_HINTS);
    if (t === 'search') return anyHint(SEARCH_HINTS);
    if (t === 'cart') return anyHint(CART_HINTS);
    var v = normalizePath(rule.value);
    if (!v || v === '/') return false;
    if (t === 'exact') return np === v;
    return np.indexOf(v) !== -1;
  }
  function storyMatchesPage(story) {
    var urls = (story && story.urls) || [];
    if (!urls.length) return true;
    var np = normalizePath(window.location.pathname + window.location.search);
    for (var i = 0; i < urls.length; i++) if (urls[i] && ruleMatches(urls[i], np)) return true;
    return false;
  }

  /* ── Session + tracking ── */
  var SESSION_KEY = 'zt_session';
  var sessionId = '';
  try {
    sessionId = sessionStorage.getItem(SESSION_KEY) || '';
    if (!sessionId) {
      sessionId = 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch (_) { sessionId = 's_' + Date.now(); }

  function track(event_type, story_id) {
    try {
      var payload = JSON.stringify({ store_id: STORE_ID, story_id: story_id || null, event_type: event_type, session_id: sessionId });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API_BASE + '/api/public/track', new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(API_BASE + '/api/public/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(function(){});
      }
    } catch (_) {}
  }

  function fetchJSON(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  }

  /* ── Shadow root ── */
  var host = document.createElement('div');
  host.id = 'zentor-widget-root';
  host.style.cssText = 'position:fixed;z-index:2147483000;left:0;bottom:0;';
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var CORE_STYLES = [
    ':host,*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}',
    '.zt-wrap{position:fixed;display:flex;gap:10px;padding:14px;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif}',
    '.zt-pos-bottom-left{left:0;bottom:0}',
    '.zt-pos-bottom-right{right:0;bottom:0}',
    '.zt-pos-top-left{left:0;top:0}',
    '.zt-pos-top-right{right:0;top:0}',
    '.zt-story{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:transform .15s ease}',
    '.zt-story:hover{transform:translateY(-2px)}',
    '.zt-bubble{width:64px;height:64px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center}',
    '.zt-bubble-inner{width:100%;height:100%;border-radius:50%;background:#fff;padding:2px;overflow:hidden;display:block;position:relative}',
    '.zt-bubble-img,.zt-bubble-video{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;background:#eee}',
    '.zt-label{font-size:11px;color:#111;max-width:72px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zt-dark .zt-label{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}',
  ].join('');

  function injectCoreStyles() {
    var st = document.createElement('style');
    st.textContent = CORE_STYLES;
    shadow.appendChild(st);
  }

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  var BUBBLE_LOOP_SECONDS = 3;

  function firstVideoUrl(story) {
    var media = story && story.media && story.media.length ? story.media : null;
    if (!media) return null;
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m && m.type && String(m.type).indexOf('video') !== -1 && m.url) return m.url;
    }
    return null;
  }

  /* ── Lazy viewer loader ── */
  var viewerLoading = null;
  function ensureViewer() {
    if (window.__ZENTOR_VIEWER__ && window.__ZENTOR_VIEWER__.open) {
      return Promise.resolve(window.__ZENTOR_VIEWER__);
    }
    if (viewerLoading) return viewerLoading;
    viewerLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = VIEWER_URL;
      s.async = true;
      s.onload = function () {
        if (window.__ZENTOR_VIEWER__ && window.__ZENTOR_VIEWER__.open) resolve(window.__ZENTOR_VIEWER__);
        else reject(new Error('viewer_missing_api'));
      };
      s.onerror = function () { viewerLoading = null; reject(new Error('viewer_load_failed')); };
      document.head.appendChild(s);
    });
    return viewerLoading;
  }

  // Preload viewer no primeiro hover em qualquer miniatura — sem custo pra quem só passa o olho.
  var preloadStarted = false;
  function preloadViewer() {
    if (preloadStarted) return;
    preloadStarted = true;
    ensureViewer().catch(function(){ preloadStarted = false; });
  }

  function openViewer(stories, idx) {
    ensureViewer().then(function (V) {
      V.open({
        stories: stories,
        startIdx: idx,
        shadow: shadow,
        track: track,
        storeId: STORE_ID,
      });
    }).catch(function (err) { console.warn('[Zentor] viewer:', err && err.message); });
  }

  function renderBubbles(cfg, stories) {
    var wrap = el('div', 'zt-wrap zt-pos-' + (cfg.theme && cfg.theme.position || 'bottom-left'));
    if (cfg.theme && cfg.theme.mode === 'dark') wrap.classList.add('zt-dark');
    stories.forEach(function (story, storyIdx) {
      var item = el('div', 'zt-story');
      var bubble = el('div', 'zt-bubble');
      var inner = el('div', 'zt-bubble-inner');
      var videoUrl = storyIdx === 0 ? firstVideoUrl(story) : null;
      if (videoUrl) {
        var v = document.createElement('video');
        v.className = 'zt-bubble-video';
        v.src = videoUrl; v.muted = true; v.defaultMuted = true; v.autoplay = true;
        v.loop = false; v.playsInline = true;
        v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
        v.preload = 'auto';
        if (story.cover) v.poster = story.cover;
        v.addEventListener('timeupdate', function () {
          if (v.currentTime >= BUBBLE_LOOP_SECONDS) {
            try { v.currentTime = 0; } catch (_) {}
            var p = v.play(); if (p && p.catch) p.catch(function(){});
          }
        });
        v.addEventListener('loadedmetadata', function () {
          var p = v.play(); if (p && p.catch) p.catch(function(){});
        });
        inner.appendChild(v);
      } else {
        var img = el('img', 'zt-bubble-img');
        img.loading = 'lazy'; img.alt = story.title || '';
        if (story.cover) img.src = story.cover;
        inner.appendChild(img);
      }
      bubble.appendChild(inner); item.appendChild(bubble);
      item.appendChild(el('div', 'zt-label', story.title || ''));
      item.addEventListener('pointerenter', preloadViewer, { once: true });
      item.addEventListener('touchstart', preloadViewer, { once: true, passive: true });
      item.addEventListener('click', function () { openViewer(stories, stories.indexOf(story)); });
      wrap.appendChild(item);
      track('impression', story.id);
    });
    shadow.appendChild(wrap);
  }

  function boot() {
    var pre = window.__ZENTOR__ && window.__ZENTOR__.config;
    if (pre && pre.store && Array.isArray(pre.stories)) {
      injectCoreStyles();
      if (!pre.stories.length) return;
      renderBubbles(pre.store, pre.stories);
      return;
    }
    // Fallback legado: script antigo direto sem loader.
    fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID))
      .then(function (cfg) {
        injectCoreStyles();
        return fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID) + '/stories').then(function (res) {
          var all = (res && res.stories) || [];
          var stories = all.filter(storyMatchesPage);
          if (!stories.length) return;
          renderBubbles(cfg, stories);
        });
      })
      .catch(function (err) { console.warn('[Zentor] failed to load:', err && err.message); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
