/*! Zentor Widget core v5 — bootstrap + bubbles + lazy viewer
 *  Aplica 100% da aba Aparência do painel nas miniaturas do widget.
 *  Fonte de verdade da lógica de match: src/lib/urlMatch.ts (mirror abaixo).
 *  Fonte de verdade do modal de reprodução: /embed/viewer (React do painel),
 *  carregado via viewer.js (iframe shim).
 */
(function () {
  'use strict';
  if (window.__ZENTOR_WIDGET__ && window.__ZENTOR_WIDGET__.update) return;

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
  host.style.cssText = 'position:fixed;z-index:2147483000;left:0;top:0;right:0;bottom:0;pointer-events:none';
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  /* ── Appearance defaults (mirror de DEFAULT_CONFIG em AppearanceEditor.tsx) ── */
  var DEFAULT_APPEARANCE = {
    useAllDevices: true,
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
    draggable: true,
    allowClose: true,
    mediaFit: 'cover',            // cover|contain
    zIndex: 9999999,
  };

  function coerceAppearance(a) {
    var out = {};
    for (var k in DEFAULT_APPEARANCE) out[k] = DEFAULT_APPEARANCE[k];
    if (a && typeof a === 'object') for (var k2 in a) if (a[k2] != null) out[k2] = a[k2];
    return out;
  }

  var CORE_STYLES = [
    ':host,*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}',
    '.zt-wrap{position:fixed;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;pointer-events:auto}',
    '.zt-item{position:absolute;pointer-events:auto}',
    '.zt-story{position:relative;cursor:pointer;display:block;pointer-events:auto;transition:transform .15s ease}',
    '.zt-story:hover{transform:translateY(-2px)}',
    '.zt-bubble{position:absolute;z-index:2;overflow:hidden;background:#d1d5db;display:block}',
    '.zt-bubble-img,.zt-bubble-video{width:100%;height:100%;display:block;background:#eee}',
    '.zt-close{position:absolute;width:18px;height:18px;border-radius:999px;background:rgba(0,0,0,.72);color:#fff;z-index:4;display:grid;place-items:center;border:0;padding:0;cursor:pointer;line-height:1}',
    '.zt-close svg{width:10px;height:10px;display:block}',
    '.zt-ring{position:absolute;background:transparent;border:0;pointer-events:none;z-index:1;animation:ztPulseRing 8s cubic-bezier(.22,.61,.36,1) infinite;will-change:box-shadow,opacity}',
    '@keyframes ztPulseRing{0%{box-shadow:0 0 0 0px var(--zt-ring);opacity:.75}15%{box-shadow:0 0 0 12px var(--zt-ring);opacity:0}100%{box-shadow:0 0 0 12px var(--zt-ring);opacity:0}}',
    '.zt-cta{position:absolute;color:#fff;line-height:1;padding:5px 10px;white-space:nowrap;box-shadow:0 6px 18px -8px rgba(0,0,0,.28);will-change:transform,opacity;transition:transform 620ms cubic-bezier(.22,.61,.36,1),opacity 620ms cubic-bezier(.22,.61,.36,1);z-index:1;font-weight:500;letter-spacing:.3px;pointer-events:none}',
    '.zt-cta[data-visible="1"]{opacity:1;transform:translateY(50%) translateX(0)}',
    '.zt-cta[data-visible="0"]{opacity:0}',
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

  function geom(appearance) {
    var width = Number(appearance.width != null ? appearance.width : 100);
    var bubbleW = appearance.shape === 'personalizado'
      ? (appearance.widthUnit === '%' ? 100 : width)
      : width;
    var bubbleH = appearance.shape === 'personalizado'
      ? Number(appearance.height != null ? appearance.height : width)
      : width;
    return { w: bubbleW, h: bubbleH };
  }

  function radiusFor(appearance) {
    var radius;
    if (appearance.shape === 'circular') radius = '50%';
    else if (appearance.shape === 'quadrado') radius = '16px';
    else radius = (appearance.borderRadius != null ? appearance.borderRadius : 0) + 'px';
    return radius;
  }

  function applyBubbleShape(bubble, img, appearance) {
    var g = geom(appearance);
    bubble.style.width = g.w + 'px';
    bubble.style.height = g.h + 'px';
    var radius = radiusFor(appearance);
    bubble.style.borderRadius = radius;
    img.style.borderRadius = radius;
    img.style.objectFit = appearance.mediaFit === 'contain' ? 'contain' : 'cover';
    if (appearance.borderStyle === 'nenhum') bubble.style.border = 'none';
    else bubble.style.border = '3px ' + (appearance.borderStyle === 'tracejado' ? 'dashed' : 'solid') + ' ' + (appearance.color || '#000');
  }

  function applyWrapPosition(wrap, appearance) {
    wrap.style.left = '0'; wrap.style.top = '0'; wrap.style.right = '0'; wrap.style.bottom = '0';
    wrap.style.width = '0'; wrap.style.height = '0';
    wrap.style.zIndex = String(appearance.zIndex || 9999999);
  }

  function posInfo(appearance) {
    var p = appearance.position || 'bottom-left';
    return { isBottom: p.indexOf('bottom') === 0, isLeft: p.indexOf('left') !== -1 };
  }

  function placeItem(item, appearance, storyIdx) {
    var g = geom(appearance);
    var p = posInfo(appearance);
    var gap = 14;
    var baseX = Number(appearance.spacingLeft != null ? appearance.spacingLeft : 20) + storyIdx * (g.w + gap);
    var baseY = Number(appearance.spacingBottom != null ? appearance.spacingBottom : 20);
    item.style.left = item.style.right = item.style.top = item.style.bottom = '';
    item.style.width = g.w + 'px';
    item.style.height = g.h + 'px';
    if (p.isBottom) item.style.bottom = baseY + 'px'; else item.style.top = baseY + 'px';
    if (p.isLeft) item.style.left = baseX + 'px'; else item.style.right = baseX + 'px';
  }

  function applyClose(close, appearance) {
    var g = geom(appearance);
    var badge = 18;
    var offX = appearance.shape === 'circular' ? -badge / 2 : 2;
    var offY = appearance.shape === 'circular' ? -badge / 2 : 2;
    close.style.left = (g.w - badge + offX) + 'px';
    close.style.top = offY + 'px';
  }

  function createRing(appearance, delay) {
    var ring = el('div', 'zt-ring');
    var g = geom(appearance);
    ring.style.width = g.w + 'px';
    ring.style.height = g.h + 'px';
    ring.style.borderRadius = radiusFor(appearance);
    ring.style.setProperty('--zt-ring', appearance.color || '#000');
    ring.style.animationDelay = delay;
    return ring;
  }

  function applyCta(cta, appearance) {
    var g = geom(appearance);
    var p = posInfo(appearance);
    var outer = appearance.shape === 'circular' ? 999 : (appearance.shape === 'quadrado' ? 12 : Number(appearance.borderRadius || 0));
    cta.style.left = p.isLeft ? g.w + 'px' : '';
    cta.style.right = p.isLeft ? '' : g.w + 'px';
    cta.style.top = (g.h / 2) + 'px';
    cta.style.background = appearance.color || '#000';
    cta.style.fontSize = Math.max(9, Number(appearance.ctaSize || 15) - 5) + 'px';
    cta.style.borderRadius = p.isLeft ? ('0 ' + outer + 'px ' + outer + 'px 0') : (outer + 'px 0 0 ' + outer + 'px');
    cta.style.transform = 'translateY(50%) translateX(' + (p.isLeft ? '-100%' : '100%') + ')';
  }

  var currentWrap = null;
  var lastVersion = '';

  function renderBubbles(cfg, stories, version) {
    if (currentWrap && currentWrap.parentNode) currentWrap.parentNode.removeChild(currentWrap);
    currentWrap = null;
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
      var item = el('div', 'zt-item');
      placeItem(item, appearance, storyIdx);
      var storyBtn = el('div', 'zt-story');
      storyBtn.style.width = item.style.width;
      storyBtn.style.height = item.style.height;

      if (appearance.borderStyle === 'pulsar') {
        item.appendChild(createRing(appearance, '0s'));
        item.appendChild(createRing(appearance, '2.66s'));
        item.appendChild(createRing(appearance, '5.33s'));
      }

      var bubble = el('div', 'zt-bubble');
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
      bubble.appendChild(mediaEl);

      applyBubbleShape(bubble, mediaEl, appearance);
      storyBtn.appendChild(bubble);

      if (appearance.allowClose) {
        var close = el('button', 'zt-close');
        close.type = 'button';
        close.setAttribute('aria-label', 'Fechar stories');
        close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
        applyClose(close, appearance);
        close.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); try { host.style.display = 'none'; } catch (_) {} });
        item.appendChild(close);
      }

      if (appearance.cta) {
        var cta = el('div', 'zt-cta', appearance.cta);
        applyCta(cta, appearance);
        cta.dataset.visible = '1';
        var hideDelay = Math.max(0, Number(appearance.ctaDuration || 0)) * 1000;
        if (hideDelay > 0) window.setTimeout(function () { cta.dataset.visible = '0'; }, hideDelay);
        storyBtn.addEventListener('mouseenter', function () { cta.dataset.visible = '1'; });
        storyBtn.addEventListener('mouseleave', function () { cta.dataset.visible = '0'; });
        storyBtn.addEventListener('focusin', function () { cta.dataset.visible = '1'; });
        storyBtn.addEventListener('focusout', function () { cta.dataset.visible = '0'; });
        item.appendChild(cta);
      }

      storyBtn.addEventListener('pointerenter', preloadViewer, { once: true });
      storyBtn.addEventListener('touchstart', preloadViewer, { once: true, passive: true });
      storyBtn.addEventListener('click', function () { openViewer(stories, stories.indexOf(story)); track('click', story.id); });
      item.appendChild(storyBtn);
      wrap.appendChild(item);
      track('impression', story.id);
    });
    shadow.appendChild(wrap);
    currentWrap = wrap;
    lastVersion = version || '';
  }

  function update(cfg) {
    if (!cfg) return;
    var stories = (cfg && cfg.stories) || [];
    if ((cfg.version || '') === lastVersion && currentWrap) return;
    injectCoreStylesOnce();
    renderBubbles(cfg.store, stories, cfg.version || '');
  }

  var stylesInjected = false;
  function injectCoreStylesOnce() {
    if (stylesInjected) return;
    stylesInjected = true;
    injectCoreStyles();
  }

  function boot() {
    var pre = window.__ZENTOR__ && window.__ZENTOR__.config;
    if (pre && pre.store && Array.isArray(pre.stories)) {
      update(pre);
      return;
    }
    // Fallback: busca o payload agregado direto.
    fetchJSON(API_BASE + '/api/public/widget?store=' + encodeURIComponent(STORE_ID) +
              '&path=' + encodeURIComponent(window.location.pathname + window.location.search))
      .then(function (res) {
        update(res);
      })
      .catch(function (err) { console.warn('[Zentor] failed to load:', err && err.message); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.__ZENTOR_WIDGET__ = { update: update };
})();
