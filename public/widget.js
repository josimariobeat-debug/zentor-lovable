/*! Zentor Widget v2 — stories/videos embeddable player */
(function () {
  'use strict';
  if (window.__ZENTOR_LOADED__) return;
  window.__ZENTOR_LOADED__ = true;

  var currentScript = document.currentScript || (function () {
    var s = document.getElementsByTagName('script');
    return s[s.length - 1];
  })();
  var STORE_ID = currentScript && currentScript.dataset && currentScript.dataset.store;
  if (!STORE_ID) { console.warn('[Zentor] data-store ausente no <script>'); return; }

  var API_BASE = (function () {
    try { return new URL(currentScript.src).origin; } catch (_) { return ''; }
  })();

  /* ── Session ── */
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

  var STORY_FLOW_LOGS_ENABLED = true;
  function flowLog(message, details) {
    if (!STORY_FLOW_LOGS_ENABLED) return;
    try { console.info('[Zentor stories:flow] ' + message, details || ''); } catch (_) {}
  }

  /* ── Shadow root ── */
  var host = document.createElement('div');
  host.id = 'zentor-widget-root';
  host.style.cssText = 'position:fixed;z-index:2147483000;left:0;bottom:0;';
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  /* ── Styles ── */
  var STYLES = [
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
    '.zt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:2147483600;animation:ztFade .18s ease;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}',
    '@keyframes ztFade{from{opacity:0}to{opacity:1}}',
    '.zt-player{position:relative;width:min(420px,100vw);height:min(92vh,780px);background:#000;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}',
    '@media(max-width:520px){.zt-player{width:100vw;height:100vh;border-radius:0}}',
    '.zt-media{flex:1;position:relative;background:#000;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}',
    '.zt-media video,.zt-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-user-drag:none}',

    '.zt-progress{position:absolute;top:10px;left:8px;right:8px;display:flex;gap:3px;z-index:10}',
    '.zt-bar{flex:1;height:2.5px;background:rgba(255,255,255,.35);border-radius:2px;overflow:hidden}',
    '.zt-bar-fill{height:100%;width:0%;background:#fff;transition:width .1s linear}',
    '.zt-top-controls{position:absolute;top:24px;right:12px;display:flex;align-items:center;gap:10px;z-index:11}',
    '.zt-ctrl-btn{background:transparent;border:0;color:#fff;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
    '.zt-ctrl-btn:hover{opacity:.8}',
    '.zt-ctrl-btn svg{width:20px;height:20px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.zt-ctrl-btn.zt-ctrl-close{width:36px;height:36px}',
    '.zt-ctrl-btn.zt-ctrl-close svg{width:28px;height:28px;stroke-width:1.5}',
    '.zt-nav{position:absolute;top:0;bottom:80px;width:30%;z-index:5;cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}',
    '.zt-nav-l{left:0}.zt-nav-r{right:0}',
    '.zt-tap-pause{position:absolute;top:0;bottom:80px;left:30%;right:30%;z-index:5;cursor:pointer;background:transparent;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}',
    '.zt-pause-indicator{position:absolute;top:0;bottom:80px;left:0;right:0;z-index:6;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:none}',
    '.zt-pause-indicator.show{display:flex}',
    '.zt-pause-indicator-inner{width:44px;height:44px;border-radius:50%;background:rgba(0,0,0,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;border:0;color:#fff;cursor:default;padding:0}',
    '.zt-pause-indicator-inner.zt-pi-sound{pointer-events:auto;cursor:pointer;width:32px;height:32px}',
    '.zt-pause-indicator-inner.zt-pi-sound:hover{background:rgba(0,0,0,.6)}',
    '.zt-pause-indicator-inner svg{width:16px;height:16px;fill:#fff;margin-left:0}',
    '.zt-pause-indicator-inner.zt-pi-sound svg{width:14px;height:14px}',

    '.zt-pause-indicator-inner.zt-pi-play svg{margin-left:2px}',
    '.zt-products{position:absolute;bottom:80px;left:12px;right:12px;z-index:8;display:flex;flex-direction:column;gap:8px;pointer-events:none}',
    '.zt-product-card{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:8px 10px;pointer-events:all;box-shadow:0 2px 12px rgba(0,0,0,.18)}',
    '.zt-product-img{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#eee;flex-shrink:0}',
    '.zt-product-info{flex:1;min-width:0}',
    '.zt-product-name{font-size:13px;font-weight:600;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zt-product-price{font-size:12px;color:#555;margin-top:2px}',
    '.zt-product-btn{background:#111;color:#fff;border:0;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:background .15s}',
    '.zt-product-btn:hover{background:#333}',
    '.zt-bottom-bar{position:absolute;bottom:0;left:0;right:0;height:68px;background:#111;display:flex;align-items:center;padding:0 14px;gap:12px;z-index:10}',
    '.zt-comment-input-btn{flex:1;background:transparent;border:1.5px solid rgba(255,255,255,.35);color:rgba(255,255,255,.65);border-radius:999px;padding:10px 16px;font-size:14px;text-align:left;cursor:pointer;transition:border-color .15s;font-family:inherit}',
    '.zt-comment-input-btn:hover{border-color:rgba(255,255,255,.6)}',
    '.zt-action-btn{background:transparent;border:0;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px;position:relative}',
    '.zt-action-btn svg{width:24px;height:24px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.zt-action-btn.liked svg{fill:#e53935;stroke:#e53935}',
    '.zt-action-count{font-size:10px;color:rgba(255,255,255,.75);line-height:1}',
    '.zt-balloon-badge{position:absolute;top:-4px;right:-4px;background:#e53935;color:#fff;font-size:9px;font-weight:700;border-radius:999px;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px}',
    '.zt-drawer{position:absolute;inset:0;background:#111;z-index:20;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1)}',
    '.zt-drawer.open{transform:translateY(0)}',
    '.zt-drawer-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.1)}',
    '.zt-drawer-title{color:#fff;font-size:15px;font-weight:700}',
    '.zt-drawer-close{background:transparent;border:0;color:rgba(255,255,255,.7);cursor:pointer;font-size:22px;line-height:1;padding:2px 6px}',
    '.zt-drawer-body{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:12px}',
    '.zt-comment-item{display:flex;flex-direction:column;gap:3px}',
    '.zt-comment-author{font-size:13px;font-weight:700;color:#fff}',
    '.zt-comment-text{font-size:13px;color:rgba(255,255,255,.75);line-height:1.45}',
    '.zt-comment-time{font-size:11px;color:rgba(255,255,255,.4)}',
    '.zt-drawer-empty{color:rgba(255,255,255,.4);font-size:14px;text-align:center;margin:auto;padding:40px 0}',
    '.zt-form-drawer{position:absolute;inset:0;background:rgba(0,0,0,.6);z-index:25;display:flex;flex-direction:column;justify-content:flex-end;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1)}',
    '.zt-form-drawer.open{transform:translateY(0)}',
    '.zt-form-sheet{background:#1a1a1a;border-radius:20px 20px 0 0;padding:20px 16px 28px}',
    '.zt-form-title{color:#fff;font-size:16px;font-weight:700;margin-bottom:16px}',
    '.zt-form-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}',
    '.zt-form-label{font-size:12px;color:rgba(255,255,255,.55);font-weight:600;text-transform:uppercase;letter-spacing:.05em}',
    '.zt-form-input{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:10px;padding:11px 13px;color:#fff;font-size:14px;outline:none;transition:border-color .15s;font-family:inherit;width:100%}',
    '.zt-form-input:focus{border-color:rgba(255,255,255,.4)}',
    '.zt-form-input::placeholder{color:rgba(255,255,255,.3)}',
    '.zt-form-textarea{resize:none;height:80px}',
    '.zt-form-submit{width:100%;margin-top:6px;background:#fff;color:#111;border:0;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;transition:background .15s;font-family:inherit}',
    '.zt-form-submit:hover{background:#e8e8e8}',
    '.zt-form-cancel{width:100%;background:transparent;border:0;color:rgba(255,255,255,.5);font-size:14px;padding:10px;cursor:pointer;margin-top:4px;font-family:inherit}',
    '.zt-share-overlay{position:absolute;inset:0;background:rgba(0,0,0,.7);z-index:30;display:flex;align-items:flex-end;opacity:0;pointer-events:none;transition:opacity .2s}',
    '.zt-share-overlay.open{opacity:1;pointer-events:all}',
    '.zt-share-sheet{background:#1a1a1a;border-radius:20px 20px 0 0;padding:20px 16px 32px;width:100%}',
    '.zt-share-title{color:#fff;font-size:15px;font-weight:700;margin-bottom:16px;text-align:center}',
    '.zt-share-options{display:flex;justify-content:center;gap:20px;flex-wrap:wrap}',
    '.zt-share-opt{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;color:#fff}',
    '.zt-share-icon{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px}',
    '.zt-share-opt-label{font-size:11px;color:rgba(255,255,255,.7)}',
    '.zt-share-cancel{display:block;width:100%;margin-top:16px;background:rgba(255,255,255,.08);border:0;color:#fff;border-radius:12px;padding:13px;font-size:15px;cursor:pointer;font-family:inherit}',
  ].join('');

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function svgIcon(d) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.innerHTML = d;
    return s;
  }

  var ICO_PAUSE   = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  var ICO_PLAY    = '<polygon points="5,3 19,12 5,21"/>';
  var ICO_SOUND   = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>';
  var ICO_MUTE    = '<polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>';
  var ICO_CLOSE   = '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  var ICO_HEART   = '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>';
  var ICO_BALLOON = '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
  var ICO_SHARE   = '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>';

  function injectStyles() {
    var st = document.createElement('style');
    st.textContent = STYLES;
    shadow.appendChild(st);
  }

  var BUBBLE_LOOP_SECONDS = 3;

  function firstVideoUrl(story) {
    if (!story) return null;
    var media = story.media && story.media.length ? story.media : null;
    if (!media) return null;
    for (var i = 0; i < media.length; i++) {
      var m = media[i];
      if (m && m.type && String(m.type).indexOf('video') !== -1 && m.url) return m.url;
    }
    return null;
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
      item.addEventListener('click', function () { openPlayer(stories, stories.indexOf(story)); });
      wrap.appendChild(item);
      track('impression', story.id);
    });
    shadow.appendChild(wrap);
  }

  function openPlayer(stories, startIdx) {
    var idx = startIdx;
    var mediaIdx = 0;
    var paused = false;
    var muted = false;
    var liked = false;
    var likeCount = 0;
    var commentCount = 0;
    var comments = [];

    var advancing = false;
    var rafId = null;
    var currentEl = null;
    var timerStartedLogged = false;
    var progressMilestone = 0;
    var mountedAt = 0;
    var videoFullAt = 0;
    var lastVideoTime = 0;
    var lastVideoTimeAt = 0;
    var uiOpenCount = 0;

    var VIDEO_READY_TIMEOUT_MS = 6000;
    var VIDEO_START_TIMEOUT_MS = 4500;
    var VIDEO_END_GRACE_MS = 1200;
    var VIDEO_FROZEN_MS = 2000;

    var overlay     = el('div', 'zt-overlay');
    var player      = el('div', 'zt-player');
    var mediaWrap   = el('div', 'zt-media');
    var progress    = el('div', 'zt-progress');

    var topCtrl   = el('div', 'zt-top-controls');
    var btnClose  = el('button', 'zt-ctrl-btn zt-ctrl-close'); btnClose.appendChild(svgIcon(ICO_CLOSE)); btnClose.title = 'Fechar';
    topCtrl.appendChild(btnClose);


    var navL = el('div', 'zt-nav zt-nav-l');
    var navR = el('div', 'zt-nav zt-nav-r');
    var tapPause = el('div', 'zt-tap-pause');
    var pauseIndicator = el('div', 'zt-pause-indicator');
    var pauseIndicatorInner = el('div', 'zt-pause-indicator-inner zt-pi-play');
    pauseIndicatorInner.appendChild(svgIcon(ICO_PLAY));
    var pauseSoundBtn = el('button', 'zt-pause-indicator-inner zt-pi-sound');
    pauseSoundBtn.appendChild(svgIcon(ICO_SOUND));
    pauseSoundBtn.title = 'Som';
    pauseIndicator.appendChild(pauseSoundBtn);
    pauseIndicator.appendChild(pauseIndicatorInner);

    var productsWrap = el('div', 'zt-products');

    var bottomBar       = el('div', 'zt-bottom-bar');
    var commentTrigger  = el('button', 'zt-comment-input-btn', 'Comentar');

    var btnLike     = el('button', 'zt-action-btn');
    btnLike.appendChild(svgIcon(ICO_HEART));
    var likeCountEl = el('span', 'zt-action-count', '');
    btnLike.appendChild(likeCountEl);

    var btnComments = el('button', 'zt-action-btn');
    btnComments.appendChild(svgIcon(ICO_BALLOON));
    var commentBadge = el('span', 'zt-balloon-badge', '');
    commentBadge.style.display = 'none';
    btnComments.appendChild(commentBadge);
    var commentCountEl = el('span', 'zt-action-count', '');
    btnComments.appendChild(commentCountEl);

    var btnShare = el('button', 'zt-action-btn');
    btnShare.appendChild(svgIcon(ICO_SHARE));

    bottomBar.appendChild(commentTrigger);
    bottomBar.appendChild(btnLike);
    bottomBar.appendChild(btnComments);
    bottomBar.appendChild(btnShare);

    /* comment list drawer */
    var commentDrawer  = el('div', 'zt-drawer');
    var drawerHeader   = el('div', 'zt-drawer-header');
    var drawerTitle    = el('span', 'zt-drawer-title', 'Comentários');
    var drawerCloseBtn = el('button', 'zt-drawer-close', '×');
    drawerHeader.appendChild(drawerTitle); drawerHeader.appendChild(drawerCloseBtn);
    var drawerBody = el('div', 'zt-drawer-body');
    commentDrawer.appendChild(drawerHeader); commentDrawer.appendChild(drawerBody);

    /* comment form drawer */
    var formDrawer = el('div', 'zt-form-drawer');
    var formSheet  = el('div', 'zt-form-sheet');
    formSheet.innerHTML =
      '<div class="zt-form-title">Deixar um comentário</div>' +
      '<div class="zt-form-field"><label class="zt-form-label">Nome</label><input class="zt-form-input" placeholder="Seu nome" id="zt-f-name"/></div>' +
      '<div class="zt-form-field"><label class="zt-form-label">E-mail</label><input class="zt-form-input" type="email" placeholder="seu@email.com" id="zt-f-email"/></div>' +
      '<div class="zt-form-field"><label class="zt-form-label">Contato (WhatsApp)</label><input class="zt-form-input" placeholder="+55 (00) 00000-0000" id="zt-f-phone"/></div>' +
      '<div class="zt-form-field"><label class="zt-form-label">Comentário</label><textarea class="zt-form-input zt-form-textarea" placeholder="Escreva seu comentário..." id="zt-f-text"></textarea></div>' +
      '<button class="zt-form-submit" id="zt-f-submit">Enviar comentário</button>' +
      '<button class="zt-form-cancel" id="zt-f-cancel">Cancelar</button>';
    formDrawer.appendChild(formSheet);

    /* share overlay */
    var shareOverlay = el('div', 'zt-share-overlay');
    shareOverlay.innerHTML =
      '<div class="zt-share-sheet">' +
        '<div class="zt-share-title">Compartilhar Story</div>' +
        '<div class="zt-share-options">' +
          '<div class="zt-share-opt" data-method="whatsapp"><div class="zt-share-icon" style="background:#25d366">💬</div><span class="zt-share-opt-label">WhatsApp</span></div>' +
          '<div class="zt-share-opt" data-method="instagram"><div class="zt-share-icon" style="background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)">📷</div><span class="zt-share-opt-label">Instagram</span></div>' +
          '<div class="zt-share-opt" data-method="copy"><div class="zt-share-icon" style="background:#444">🔗</div><span class="zt-share-opt-label">Copiar link</span></div>' +
          '<div class="zt-share-opt" data-method="native"><div class="zt-share-icon" style="background:#555">↗️</div><span class="zt-share-opt-label">Mais</span></div>' +
        '</div>' +
        '<button class="zt-share-cancel" id="zt-share-cancel">Cancelar</button>' +
      '</div>';

    player.appendChild(mediaWrap);
    player.appendChild(progress);
    player.appendChild(topCtrl);
    player.appendChild(navL);
    player.appendChild(navR);
    player.appendChild(tapPause);
    player.appendChild(pauseIndicator);
    player.appendChild(productsWrap);
    player.appendChild(bottomBar);
    player.appendChild(commentDrawer);
    player.appendChild(formDrawer);
    player.appendChild(shareOverlay);
    overlay.appendChild(player);
    shadow.appendChild(overlay);

    function cleanup() {
      if (rafId) cancelAnimationFrame(rafId);
      if (currentEl && currentEl.tagName === 'VIDEO') { try { currentEl.pause(); } catch(_){} }
    }

    function blockNativeMediaAction(e) {
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch (_) {}
      return false;
    }

    [overlay, player, mediaWrap, navL, navR, tapPause].forEach(function (node) {
      node.addEventListener('contextmenu', blockNativeMediaAction, { capture: true });
      node.addEventListener('dragstart', blockNativeMediaAction, { capture: true });
      node.addEventListener('selectstart', blockNativeMediaAction, { capture: true });
      node.addEventListener('touchstart', function () {}, { passive: false });
    });

    function destroy() {
      cleanup(); overlay.remove(); document.removeEventListener('keydown', onKey);
    }

    function pauseForUI() {
      uiOpenCount++;
      if (!paused && currentEl && currentEl.tagName === 'VIDEO') { try { currentEl.pause(); } catch(_){} }
    }

    function resumeFromUI() {
      uiOpenCount = Math.max(0, uiOpenCount - 1);
      if (uiOpenCount === 0 && !paused && currentEl && currentEl.tagName === 'VIDEO') {
        try { var p = currentEl.play(); if (p && p.catch) p.catch(function(){}); } catch(_){}
      }
    }

    function togglePause() {
      paused = !paused;
      if (paused) pauseIndicator.classList.add('show');
      else pauseIndicator.classList.remove('show');
      if (currentEl && currentEl.tagName === 'VIDEO') {
        if (paused) { try { currentEl.pause(); } catch(_){} }
        else { try { var p = currentEl.play(); if (p && p.catch) p.catch(function(){}); } catch(_){} }
      }
    }

    function toggleMute() {
      muted = !muted;
      pauseSoundBtn.innerHTML = ''; pauseSoundBtn.appendChild(svgIcon(muted ? ICO_MUTE : ICO_SOUND));

      if (currentEl && currentEl.tagName === 'VIDEO') currentEl.muted = muted;
    }
    pauseSoundBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMute(); });

    function updateLike() {
      if (liked) btnLike.classList.add('liked'); else btnLike.classList.remove('liked');
      likeCountEl.textContent = likeCount > 0 ? String(likeCount) : '';
    }

    function updateCommentCount() {
      commentCountEl.textContent = commentCount > 0 ? String(commentCount) : '';
      if (commentCount > 0) { commentBadge.textContent = String(commentCount); commentBadge.style.display = 'flex'; }
      else commentBadge.style.display = 'none';
    }

    function renderComments() {
      drawerBody.innerHTML = '';
      if (!comments.length) { drawerBody.appendChild(el('div', 'zt-drawer-empty', 'Nenhum comentário ainda. Seja o primeiro!')); return; }
      comments.forEach(function (c) {
        var item = el('div', 'zt-comment-item');
        item.appendChild(el('span', 'zt-comment-author', c.name || 'Anônimo'));
        item.appendChild(el('span', 'zt-comment-text', c.text));
        item.appendChild(el('span', 'zt-comment-time', c.time));
        drawerBody.appendChild(item);
      });
    }

    function openCommentDrawer() { pauseForUI(); renderComments(); commentDrawer.classList.add('open'); }
    function closeCommentDrawer() { commentDrawer.classList.remove('open'); resumeFromUI(); }
    function openFormDrawer() { pauseForUI(); formDrawer.classList.add('open'); setTimeout(function(){ var i=formDrawer.querySelector('#zt-f-name'); if(i) i.focus(); },100); }
    function closeFormDrawer() { formDrawer.classList.remove('open'); resumeFromUI(); }
    function openShare() { pauseForUI(); shareOverlay.classList.add('open'); }
    function closeShare() { shareOverlay.classList.remove('open'); resumeFromUI(); }

    function renderProducts(story) {
      productsWrap.innerHTML = '';
      var products = story.products || [];
      if (!products.length) return;
      products.slice(0, 3).forEach(function (prod) {
        var card = el('div', 'zt-product-card');
        var img = el('img', 'zt-product-img'); img.src = prod.image || ''; img.alt = prod.name || '';
        var info = el('div', 'zt-product-info');
        info.appendChild(el('div', 'zt-product-name', prod.name || ''));
        info.appendChild(el('div', 'zt-product-price', prod.price ? 'R$ ' + Number(prod.price).toFixed(2).replace('.', ',') : ''));
        var btn = el('button', 'zt-product-btn', 'COMPRAR');
        btn.addEventListener('click', function (e) { e.stopPropagation(); track('click', story.id); if (prod.url) { try { window.open(prod.url,'_blank','noopener'); } catch(_){} } });
        card.appendChild(img); card.appendChild(info); card.appendChild(btn);
        productsWrap.appendChild(card);
      });
    }

    function logTimerStarted(type, durationMs) {
      if (timerStartedLogged) return; timerStartedLogged = true;
      flowLog('Timer iniciado', { storyIndex: idx, mediaIndex: mediaIdx, type: type, durationMs: durationMs });
    }

    function logProgress(p) {
      var milestone = p >= 1 ? 100 : p >= 0.75 ? 75 : p >= 0.5 ? 50 : p >= 0.25 ? 25 : 0;
      if (milestone > progressMilestone) { progressMilestone = milestone; flowLog('Progresso: ' + milestone + '%', { storyIndex: idx, mediaIndex: mediaIdx }); }
    }

    function nextOnce(reason) {
      if (advancing) return; advancing = true;
      flowLog('nextStory() chamado', { storyIndex: idx, mediaIndex: mediaIdx, reason: reason });
      next();
    }

    function renderProgress(items) {
      progress.innerHTML = '';
      items.forEach(function (_, i) {
        var b = el('div', 'zt-bar'); var f = el('div', 'zt-bar-fill');
        b.appendChild(f); progress.appendChild(b);
        if (i < mediaIdx) f.style.width = '100%';
      });
    }

    function show() {
      cleanup(); rafId = null;
      var story = stories[idx];
      if (!story) { destroy(); return; }
      var items = story.media && story.media.length ? story.media : [{ url: story.cover, type: 'image' }];
      if (mediaIdx >= items.length) { nextOnce('media-index-overflow'); return; }
      var item = items[mediaIdx];
      advancing = false; timerStartedLogged = false; progressMilestone = 0;
      mountedAt = performance.now(); videoFullAt = 0; lastVideoTime = 0; lastVideoTimeAt = mountedAt;
      flowLog('Story iniciado', { storyIndex: idx, mediaIndex: mediaIdx, type: item.type || 'image' });
      mediaWrap.querySelectorAll('video,img').forEach(function (n) { n.remove(); });
      renderProgress(items);
      renderProducts(story);

      var isVideo = item.type && item.type.indexOf('video') !== -1;
      if (isVideo) {
        var v = document.createElement('video');
        v.src = item.url; v.autoplay = true; v.playsInline = true; v.controls = false; v.muted = muted;
        v.setAttribute('controlsList', 'nodownload noplaybackrate nofullscreen noremoteplayback');
        v.setAttribute('disablePictureInPicture', '');
        v.setAttribute('draggable', 'false');
        v.style.webkitUserSelect = 'none';
        v.style.userSelect = 'none';
        v.style.webkitTouchCallout = 'none';
        v.oncontextmenu = blockNativeMediaAction;
        v.ondragstart = blockNativeMediaAction;

        var bar = progress.children[mediaIdx] && progress.children[mediaIdx].firstChild;
        function tick(now) {
          try {
            if (!bar || advancing) return;
            if (paused || uiOpenCount > 0) { rafId = requestAnimationFrame(tick); return; }
            if (!v.duration || Number.isNaN(v.duration)) {
              if (now - mountedAt > VIDEO_READY_TIMEOUT_MS) nextOnce('video-ready-timeout');
              else rafId = requestAnimationFrame(tick);
              return;
            }
            var fill = Math.min(1, v.currentTime / v.duration);
            bar.style.width = (fill * 100) + '%';
            logProgress(fill);
            if (!v.paused && fill > 0) logTimerStarted('video', Math.round(v.duration * 1000));
            if (v.currentTime <= 0.1 && now - mountedAt > VIDEO_START_TIMEOUT_MS) { bar.style.width='100%'; nextOnce('video-start-timeout'); return; }
            if (v.ended || fill >= 1 || v.currentTime >= v.duration - 0.05) { bar.style.width='100%'; track('completed', story.id); nextOnce('video-ended'); return; }
            if (!v.paused) {
              if (v.currentTime !== lastVideoTime) { lastVideoTime = v.currentTime; lastVideoTimeAt = now; }
              else if (lastVideoTimeAt > 0 && now - lastVideoTimeAt > VIDEO_FROZEN_MS && v.currentTime > 0.1) { bar.style.width='100%'; track('completed', story.id); nextOnce('video-frozen'); return; }
            } else { lastVideoTimeAt = now; }
            if (fill >= 0.995) {
              if (!videoFullAt) videoFullAt = now;
              else if (now - videoFullAt > VIDEO_END_GRACE_MS) { bar.style.width='100%'; track('completed', story.id); nextOnce('video-full-bar'); return; }
            } else { videoFullAt = 0; }
            rafId = requestAnimationFrame(tick);
          } catch (err) { try { console.warn('[Zentor] tick error:', err); } catch(_){} rafId = requestAnimationFrame(tick); }
        }
        v.addEventListener('loadedmetadata', function () { if (!rafId) rafId = requestAnimationFrame(tick); });
        if (bar) rafId = requestAnimationFrame(tick);
        v.addEventListener('playing', function () { logTimerStarted('video', Number.isFinite(v.duration) ? Math.round(v.duration*1000) : undefined); });
        v.addEventListener('ended', function () { track('completed', story.id); nextOnce('video-ended-event'); });
        mediaWrap.appendChild(v); currentEl = v;
        v.play().catch(function () { v.muted = true; muted = true; pauseSoundBtn.innerHTML = ''; pauseSoundBtn.appendChild(svgIcon(ICO_MUTE)); v.play().catch(function(){}); });
      } else {
        var im = document.createElement('img'); im.src = item.url; im.draggable = false; im.style.webkitUserSelect = 'none'; im.style.userSelect = 'none'; im.style.webkitTouchCallout = 'none'; im.oncontextmenu = blockNativeMediaAction; im.ondragstart = blockNativeMediaAction; mediaWrap.appendChild(im); currentEl = im;
        var bar2 = progress.children[mediaIdx] && progress.children[mediaIdx].firstChild;
        var start = performance.now(); var DUR = 5000;
        function tick2(t) {
          try {
            if (!bar2 || advancing) return;
            if (paused || uiOpenCount > 0) { rafId = requestAnimationFrame(tick2); return; }
            logTimerStarted('image', DUR);
            var p = Math.min(1, (t - start) / DUR);
            bar2.style.width = (p * 100) + '%';
            logProgress(p);
            if (p >= 1) { track('completed', story.id); nextOnce('image-done'); return; }
            rafId = requestAnimationFrame(tick2);
          } catch (err) { try { console.warn('[Zentor] tick error:', err); } catch(_){} rafId = requestAnimationFrame(tick2); }
        }
        rafId = requestAnimationFrame(tick2);
      }
      track('view', story.id);
    }

    function next() {
      var story = stories[idx]; var items = story.media && story.media.length ? story.media : [1];
      mediaIdx++; if (mediaIdx >= items.length) { mediaIdx = 0; idx++; }
      if (idx >= stories.length) { destroy(); return; }
      show();
    }

    function prev() {
      mediaIdx--;
      if (mediaIdx < 0) { idx--; if (idx < 0) { destroy(); return; } var s = stories[idx]; mediaIdx = (s.media && s.media.length ? s.media.length : 1) - 1; }
      show();
    }

    function onKey(e) {
      if (e.key === 'Escape') destroy();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') { e.preventDefault(); togglePause(); }
    }
    document.addEventListener('keydown', onKey);

    
    btnClose.addEventListener('click', function (e) { e.stopPropagation(); destroy(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) destroy(); });
    navL.addEventListener('click', prev);
    navR.addEventListener('click', next);
    tapPause.addEventListener('click', function (e) { e.stopPropagation(); togglePause(); });

    btnLike.addEventListener('click', function (e) {
      e.stopPropagation(); liked = !liked; likeCount += liked ? 1 : -1; updateLike();
      track(liked ? 'like' : 'unlike', stories[idx] && stories[idx].id);
    });

    btnComments.addEventListener('click', function (e) { e.stopPropagation(); openCommentDrawer(); });
    drawerCloseBtn.addEventListener('click', function (e) { e.stopPropagation(); closeCommentDrawer(); });
    commentTrigger.addEventListener('click', function (e) { e.stopPropagation(); openFormDrawer(); });

    formDrawer.querySelector('#zt-f-cancel').addEventListener('click', function (e) { e.stopPropagation(); closeFormDrawer(); });
    formDrawer.querySelector('#zt-f-submit').addEventListener('click', function (e) {
      e.stopPropagation();
      var name = (formDrawer.querySelector('#zt-f-name').value || '').trim();
      var text = (formDrawer.querySelector('#zt-f-text').value || '').trim();
      if (!text) { formDrawer.querySelector('#zt-f-text').focus(); return; }
      var now = new Date();
      var time = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      comments.unshift({ name: name || 'Anônimo', text: text, time: time });
      commentCount++; updateCommentCount();
      formDrawer.querySelector('#zt-f-name').value = '';
      formDrawer.querySelector('#zt-f-email').value = '';
      formDrawer.querySelector('#zt-f-phone').value = '';
      formDrawer.querySelector('#zt-f-text').value = '';
      closeFormDrawer();
      track('comment', stories[idx] && stories[idx].id);
    });

    btnShare.addEventListener('click', function (e) { e.stopPropagation(); openShare(); });
    shareOverlay.querySelector('#zt-share-cancel').addEventListener('click', function (e) { e.stopPropagation(); closeShare(); });
    shareOverlay.querySelectorAll('.zt-share-opt').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        var method = opt.dataset.method;
        var url = encodeURIComponent(window.location.href);
        var text = encodeURIComponent('Veja esse story incrível!');
        if (method === 'whatsapp') window.open('https://wa.me/?text=' + text + '%20' + url, '_blank', 'noopener');
        else if (method === 'copy') { try { navigator.clipboard.writeText(window.location.href).catch(function(){}); } catch(_){} }
        else if (method === 'native' && navigator.share) navigator.share({ url: window.location.href, title: 'Story Zentor' }).catch(function(){});
        track('share', stories[idx] && stories[idx].id);
        closeShare();
      });
    });

    player.addEventListener('click', function (e) { e.stopPropagation(); });

    updateLike(); updateCommentCount();
    track('open', stories[startIdx].id);
    show();
  }

  /* ── URL matching ── */
  function currentPagePath() {
    try {
      var loc = window.location;
      return (loc.pathname || '/') + (loc.search || '');
    } catch (_) { return '/'; }
  }
  function currentPageFull() {
    try { return window.location.href || ''; } catch (_) { return ''; }
  }
  function normalizeRule(v) {
    if (v == null) return '';
    var s = String(v).trim();
    if (!s) return '';
    // strip protocol/host if the lojista colou uma URL completa
    s = s.replace(/^https?:\/\/[^/]+/i, '');
    if (!s) s = '/';
    return s;
  }
  function storyMatchesPage(story) {
    var urls = (story && story.urls) || [];
    if (!urls.length) return true; // legacy: mostrar em todas
    var path = currentPagePath();
    var full = currentPageFull();
    for (var i = 0; i < urls.length; i++) {
      var rule = urls[i] || {};
      var type = rule.type || 'contem';
      if (type === 'todas') return true;
      var val = normalizeRule(rule.value);
      if (!val) continue;
      if (type === 'exato') {
        if (path === val || path === val.replace(/\/$/, '') || full === rule.value) return true;
      } else { // contem
        if (path.indexOf(val) !== -1 || full.indexOf(val) !== -1) return true;
      }
    }
    return false;
  }

  function boot() {
    // Preferred path: loader.js já baixou a config unificada e filtrou por página.
    var pre = window.__ZENTOR__ && window.__ZENTOR__.config;
    if (pre && pre.store && Array.isArray(pre.stories)) {
      injectStyles();
      flowLog('preloaded', { path: currentPagePath(), total: pre.stories.length });
      if (!pre.stories.length) return;
      renderBubbles(pre.store, pre.stories);
      return;
    }
    // Fallback legado (script antigo instalado direto sem loader).
    fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID))
      .then(function (cfg) {
        injectStyles();
        return fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID) + '/stories').then(function (res) {
          var all = (res && res.stories) || [];
          var stories = all.filter(storyMatchesPage);
          flowLog('page-filter', { path: currentPagePath(), total: all.length, visible: stories.length });
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
