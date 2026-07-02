/*! Zentor Widget core v4 — bootstrap + bubbles + lazy viewer
 *  Aplica 100% da aba Aparência do painel nas miniaturas do widget.
 *  Fonte de verdade da lógica de match: src/lib/urlMatch.ts (mirror abaixo).
 *  Fonte de verdade do modal de reprodução: /embed/viewer (React do painel),
 *  carregado via viewer.js (iframe shim).
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
  var VIEWER_URL = API_BASE + '/widget/viewer.js?v=6';

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
  host.style.cssText = 'position:fixed;z-index:2147483000;left:0;top:0;right:0;bottom:0;pointer-events:none';
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  /* ── Appearance defaults (mirror de DEFAULT_CONFIG em AppearanceEditor.tsx) ── */
  var DEFAULT_APPEARANCE = {
    shape: 'circular',            // 'circular' | 'quadrado' | 'personalizado'
    width: 100, widthUnit: 'px',  // 'px' | '%'
    height: 100,
    borderRadius: 100,
    position: 'bottom-left',      // bottom-left|bottom-right|top-left|top-right
    spacingBottom: 20,
    spacingLeft: 20,
    cta: 'Detalhes',
    ctaSize: 15,
    borderStyle: 'pulsar',        // pulsar|solido|tracejado|nenhum
    ctaDuration: 5,
    color: '#000000',
    hideStories: false,
    mediaFit: 'cover',            // cover|contain
    zIndex: 2147483000,
  };

  function coerceAppearance(a) {
    var out = {};
    for (var k in DEFAULT_APPEARANCE) out[k] = DEFAULT_APPEARANCE[k];
    if (a && typeof a === 'object') for (var k2 in a) if (a[k2] != null) out[k2] = a[k2];
    return out;
  }

  var CORE_STYLES = [
    ':host,*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}',
    '.zt-wrap{position:fixed;display:flex;align-items:flex-end;gap:14px;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;pointer-events:auto}',
    '.zt-story{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:transform .15s ease;pointer-events:auto}',
    '.zt-story:hover{transform:translateY(-2px)}',
    '.zt-bubble{padding:2.5px;display:flex;align-items:center;justify-content:center;position:relative;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)}',
    '.zt-bubble-inner{width:100%;height:100%;background:#fff;padding:2px;overflow:hidden;display:block;position:relative}',
    '.zt-bubble-img,.zt-bubble-video{width:100%;height:100%;display:block;background:#eee}',
    /* border style variants */
    '.zt-border-solido .zt-bubble{background:currentColor}',
    '.zt-border-tracejado .zt-bubble{background:transparent;border:2px dashed currentColor;padding:2px}',
    '.zt-border-nenhum .zt-bubble{background:transparent;padding:0}',
    '.zt-border-pulsar .zt-bubble::before{content:"";position:absolute;inset:-3px;border-radius:inherit;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);z-index:-1;animation:ztPulse 1.8s ease-out infinite}',
    '@keyframes ztPulse{0%{opacity:.75;transform:scale(1)}70%{opacity:0;transform:scale(1.25)}100%{opacity:0;transform:scale(1.25)}}',
    /* label */
    '.zt-label{font-size:12px;color:#111;max-width:120px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}',
    /* cta pill */
    '.zt-cta{position:absolute;left:50%;transform:translate(-50%,-50%);top:0;background:#111;color:#fff;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.18);opacity:0;transition:opacity .25s ease}',
    '.zt-story:hover .zt-cta,.zt-story:focus-within .zt-cta{opacity:1}',
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

  var preloadStarted = false;
  function preloadViewer() {
    if (preloadStarted) return;
    preloadStarted = true;
    ensureViewer().catch(function(){ preloadStarted = false; });
    // Pré-aquece o iframe do viewer (documento HTML + bundle) sem custo de render.
    try {
      var lk = document.createElement('link');
      lk.rel = 'preload'; lk.as = 'document'; lk.href = API_BASE + '/embed/viewer';
      document.head.appendChild(lk);
    } catch (_) {}
  }

  function openViewer(stories, idx) {
    ensureViewer().then(function (V) {
      V.open({
        stories: stories,
        startIdx: idx,
        apiBase: API_BASE,
        shadow: shadow,
        track: track,
        storeId: STORE_ID,
      });
    }).catch(function (err) { console.warn('[Zentor] viewer:', err && err.message); });
  }

  /* ── Bubble rendering com aparência aplicada ── */

  function unit(n, u) { return (n == null ? 100 : n) + (u === '%' ? '%' : 'px'); }

  function applyBubbleShape(bubble, inner, img, appearance) {
    var w = unit(appearance.width, appearance.widthUnit);
    var h = (appearance.height != null ? appearance.height : appearance.width) + 'px';
    bubble.style.width = w;
    bubble.style.height = h;
    var radius;
    if (appearance.shape === 'circular') radius = '50%';
    else if (appearance.shape === 'quadrado') radius = '12px';
    else radius = (appearance.borderRadius != null ? appearance.borderRadius : 0) + '%';
    bubble.style.borderRadius = radius;
    inner.style.borderRadius = radius;
    img.style.borderRadius = radius;
    img.style.objectFit = appearance.mediaFit === 'contain' ? 'contain' : 'cover';
  }

  function applyWrapPosition(wrap, appearance) {
    // reset
    wrap.style.left = wrap.style.right = wrap.style.top = wrap.style.bottom = '';
    var sx = (appearance.spacingLeft != null ? appearance.spacingLeft : 20) + 'px';
    var sy = (appearance.spacingBottom != null ? appearance.spacingBottom : 20) + 'px';
    switch (appearance.position) {
      case 'bottom-right': wrap.style.right = sx; wrap.style.bottom = sy; break;
      case 'top-left':     wrap.style.left  = sx; wrap.style.top    = sy; break;
      case 'top-right':    wrap.style.right = sx; wrap.style.top    = sy; break;
      case 'bottom-left':
      default:             wrap.style.left  = sx; wrap.style.bottom = sy; break;
    }
    wrap.style.zIndex = String(appearance.zIndex || 2147483000);
  }

  function renderBubbles(cfg, stories) {
    if (!stories.length) return;

    // Aparência global do widget = a do primeiro story configurado, com fallback nos defaults.
    var firstWithAppearance = null;
    for (var i = 0; i < stories.length; i++) if (stories[i].appearance) { firstWithAppearance = stories[i].appearance; break; }
    var globalAppearance = coerceAppearance(firstWithAppearance);

    if (globalAppearance.hideStories) return;

    var wrap = el('div', 'zt-wrap');
    applyWrapPosition(wrap, globalAppearance);

    stories.forEach(function (story, storyIdx) {
      var appearance = coerceAppearance(story.appearance || firstWithAppearance);
      var item = el('div', 'zt-story');
      item.classList.add('zt-border-' + (appearance.borderStyle || 'pulsar'));
      item.style.color = appearance.color || '#000';
      if (appearance.borderStyle === 'pulsar') item.style.setProperty('color', appearance.color || '#000');

      var bubble = el('div', 'zt-bubble');
      var inner = el('div', 'zt-bubble-inner');
      var videoUrl = storyIdx === 0 ? firstVideoUrl(story) : null;
      var mediaEl;
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
        mediaEl = v;
      } else {
        mediaEl = el('img', 'zt-bubble-img');
        mediaEl.loading = 'lazy'; mediaEl.alt = story.title || '';
        if (story.cover) mediaEl.src = story.cover;
      }
      inner.appendChild(mediaEl);
      bubble.appendChild(inner);

      applyBubbleShape(bubble, inner, mediaEl, appearance);

      // CTA pill (aparece no hover)
      if (appearance.cta) {
        var cta = el('div', 'zt-cta', appearance.cta);
        cta.style.fontSize = (appearance.ctaSize || 13) + 'px';
        item.appendChild(cta);
      }

      item.appendChild(bubble);
      if (story.title) item.appendChild(el('div', 'zt-label', story.title));

      item.addEventListener('pointerenter', preloadViewer, { once: true });
      item.addEventListener('touchstart', preloadViewer, { once: true, passive: true });
      item.addEventListener('click', function () { openViewer(stories, stories.indexOf(story)); track('click', story.id); });
      wrap.appendChild(item);
      track('impression', story.id);
    });
    shadow.appendChild(wrap);
  }

  function boot() {
    var pre = window.__ZENTOR__ && window.__ZENTOR__.config;
    if (pre && pre.store && Array.isArray(pre.stories)) {
      injectCoreStyles();
      renderBubbles(pre.store, pre.stories);
      return;
    }
    // Fallback: busca o payload agregado direto.
    fetchJSON(API_BASE + '/api/public/widget?store=' + encodeURIComponent(STORE_ID) +
              '&path=' + encodeURIComponent(window.location.pathname + window.location.search))
      .then(function (res) {
        injectCoreStyles();
        renderBubbles(res && res.store, (res && res.stories) || []);
      })
      .catch(function (err) { console.warn('[Zentor] failed to load:', err && err.message); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
