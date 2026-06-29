/*! Zentor Widget v1 — stories/videos embeddable player */
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

  // Session id (sticky per tab)
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

  // Host + shadow root for full style isolation
  var host = document.createElement('div');
  host.id = 'zentor-widget-root';
  host.style.cssText = 'position:fixed;z-index:2147483000;left:0;bottom:0;';
  document.documentElement.appendChild(host);
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;

  var STYLES = [
    ':host,*{box-sizing:border-box}',
    '.zt-wrap{position:fixed;display:flex;gap:10px;padding:14px;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif}',
    '.zt-pos-bottom-left{left:0;bottom:0}',
    '.zt-pos-bottom-right{right:0;bottom:0}',
    '.zt-pos-top-left{left:0;top:0}',
    '.zt-pos-top-right{right:0;top:0}',
    '.zt-story{cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;transition:transform .15s ease}',
    '.zt-story:hover{transform:translateY(-2px)}',
    '.zt-bubble{width:64px;height:64px;border-radius:50%;padding:2px;background:linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);display:flex;align-items:center;justify-content:center}',
    '.zt-bubble-inner{width:100%;height:100%;border-radius:50%;background:#fff;padding:2px;overflow:hidden;display:block}',
    '.zt-bubble-img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;background:#eee}',
    '.zt-label{font-size:11px;color:#111;max-width:72px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.zt-dark .zt-label{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.4)}',
    '.zt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:2147483600;animation:ztFade .18s ease}',
    '@keyframes ztFade{from{opacity:0}to{opacity:1}}',
    '.zt-player{position:relative;width:min(420px,100vw);height:min(92vh,750px);background:#000;border-radius:14px;overflow:hidden;display:flex;flex-direction:column}',
    '.zt-media{flex:1;display:flex;align-items:center;justify-content:center;background:#000;position:relative}',
    '.zt-media video,.zt-media img{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:cover}',
    '.zt-progress{position:absolute;top:8px;left:8px;right:8px;display:flex;gap:4px;z-index:2}',
    '.zt-bar{flex:1;height:3px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden}',
    '.zt-bar-fill{height:100%;width:0%;background:#fff;transition:width .1s linear}',
    '.zt-close{position:absolute;top:14px;right:14px;background:rgba(0,0,0,.4);color:#fff;border:0;border-radius:50%;width:32px;height:32px;cursor:pointer;font-size:18px;line-height:1;z-index:3}',
    '.zt-nav{position:absolute;top:0;bottom:0;width:40%;z-index:1;cursor:pointer}',
    '.zt-nav-l{left:0}.zt-nav-r{right:0}',
    '.zt-cta{position:absolute;left:16px;right:16px;bottom:18px;z-index:3;background:#fff;color:#111;border:0;border-radius:999px;padding:12px 16px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.3)}',
    '@media(max-width:520px){.zt-player{width:100vw;height:100vh;border-radius:0}}',
  ].join('');

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function injectStyles() {
    var st = document.createElement('style'); st.textContent = STYLES; shadow.appendChild(st);
  }

  function renderBubbles(cfg, stories) {
    var wrap = el('div', 'zt-wrap zt-pos-' + (cfg.theme && cfg.theme.position || 'bottom-left'));
    if (cfg.theme && cfg.theme.mode === 'dark') wrap.classList.add('zt-dark');
    stories.forEach(function (story) {
      var item = el('div', 'zt-story');
      var bubble = el('div', 'zt-bubble');
      var inner = el('div', 'zt-bubble-inner');
      var img = el('img', 'zt-bubble-img');
      img.loading = 'lazy';
      img.alt = story.title || '';
      if (story.cover) img.src = story.cover;
      inner.appendChild(img); bubble.appendChild(inner); item.appendChild(bubble);
      var label = el('div', 'zt-label', story.title || ''); item.appendChild(label);
      item.addEventListener('click', function () { openPlayer(stories, stories.indexOf(story)); });
      wrap.appendChild(item);
      track('impression', story.id);
    });
    shadow.appendChild(wrap);
  }

  function openPlayer(stories, startIdx) {
    var idx = startIdx;
    var mediaIdx = 0;
    var overlay = el('div', 'zt-overlay');
    var player = el('div', 'zt-player');
    var media = el('div', 'zt-media');
    var progress = el('div', 'zt-progress');
    var close = el('button', 'zt-close'); close.innerHTML = '&times;';
    var navL = el('div', 'zt-nav zt-nav-l');
    var navR = el('div', 'zt-nav zt-nav-r');
    var ctaBtn = null;
    var rafId = null;
    var currentEl = null;
    var advancing = false;
    var timerStartedLogged = false;
    var progressMilestone = 0;
    var mountedAt = 0;
    var videoFullAt = 0;
    var lastVideoTime = 0;
    var lastVideoTimeAt = 0;
    var VIDEO_READY_TIMEOUT_MS = 6000;
    var VIDEO_END_GRACE_MS = 1200;
    var VIDEO_FROZEN_MS = 2000;

    function cleanup() { if (rafId) cancelAnimationFrame(rafId); if (currentEl && currentEl.tagName === 'VIDEO') { try { currentEl.pause(); } catch(_){} } }
    function destroy() { cleanup(); overlay.remove(); document.removeEventListener('keydown', onKey); }

    function logTimerStarted(type, durationMs) {
      if (timerStartedLogged) return;
      timerStartedLogged = true;
      flowLog('Timer iniciado', { storyIndex: idx, mediaIndex: mediaIdx, type: type, durationMs: durationMs });
    }

    function logProgress(p) {
      var milestone = p >= 1 ? 100 : p >= 0.75 ? 75 : p >= 0.5 ? 50 : p >= 0.25 ? 25 : 0;
      if (milestone > progressMilestone) {
        progressMilestone = milestone;
        flowLog('Progresso: ' + milestone + '%', { storyIndex: idx, mediaIndex: mediaIdx });
      }
    }

    function nextOnce(reason) {
      if (advancing) {
        flowLog('nextStory() ignorado: avanço já em andamento', { storyIndex: idx, mediaIndex: mediaIdx, reason: reason });
        return;
      }
      advancing = true;
      flowLog('nextStory() chamado', { storyIndex: idx, mediaIndex: mediaIdx, reason: reason });
      next();
    }

    function renderProgress(items) {
      progress.innerHTML = '';
      items.forEach(function (_, i) {
        var b = el('div', 'zt-bar'); var f = el('div', 'zt-bar-fill'); b.appendChild(f); progress.appendChild(b);
        if (i < mediaIdx) f.style.width = '100%';
      });
    }

    function show() {
      cleanup();
      rafId = null;
      var story = stories[idx];
      if (!story) { destroy(); return; }
      var items = story.media && story.media.length ? story.media : [{ url: story.cover, type: 'image' }];
      if (mediaIdx >= items.length) { nextOnce('media-index-overflow'); return; }
      var item = items[mediaIdx];
      advancing = false;
      timerStartedLogged = false;
      progressMilestone = 0;
      mountedAt = performance.now();
      videoFullAt = 0;
      lastVideoTime = 0;
      lastVideoTimeAt = mountedAt;
      flowLog('Índice alterado', { storyIndex: idx, mediaIndex: mediaIdx });
      flowLog('Story iniciado', { storyIndex: idx, mediaIndex: mediaIdx, type: item.type || 'image', url: item.url });
      media.querySelectorAll('video,img').forEach(function (n) { n.remove(); });
      renderProgress(items);
      var isVideo = item.type && item.type.indexOf('video') !== -1;
      if (isVideo) {
        var v = document.createElement('video');
        v.src = item.url; v.autoplay = true; v.playsInline = true; v.controls = false; v.muted = false;
        var bar = progress.children[mediaIdx] && progress.children[mediaIdx].firstChild;
        function tick(now) {
          try {
            if (!bar || advancing) return;
            if (!v.duration || Number.isNaN(v.duration)) {
              if (now - mountedAt > VIDEO_READY_TIMEOUT_MS) nextOnce('video-ready-timeout');
              else rafId = requestAnimationFrame(tick);
              return;
            }
            var fill = Math.min(1, v.currentTime / v.duration);
            bar.style.width = (fill * 100) + '%';
            logProgress(fill);
            if (!v.paused && fill > 0) logTimerStarted('video', Math.round(v.duration * 1000));
            if (v.ended || fill >= 1 || v.currentTime >= v.duration - 0.05) {
              bar.style.width = '100%';
              track('completed', story.id);
              nextOnce(v.ended ? 'video-ended-event-or-flag' : 'video-currentTime-complete');
              return;
            }
            if (!v.paused) {
              if (v.currentTime !== lastVideoTime) {
                lastVideoTime = v.currentTime;
                lastVideoTimeAt = now;
              } else if (lastVideoTimeAt > 0 && now - lastVideoTimeAt > VIDEO_FROZEN_MS && v.currentTime > 0.1) {
                bar.style.width = '100%';
                track('completed', story.id);
                nextOnce('video-frozen-watchdog');
                return;
              }
            } else {
              lastVideoTimeAt = now;
            }
            if (fill >= 0.995) {
              if (!videoFullAt) videoFullAt = now;
              else if (now - videoFullAt > VIDEO_END_GRACE_MS) {
                bar.style.width = '100%';
                track('completed', story.id);
                nextOnce('video-full-bar-watchdog');
                return;
              }
            } else {
              videoFullAt = 0;
            }
            rafId = requestAnimationFrame(tick);
          } catch (err) {
            try { console.warn('[Zentor stories] tick error, continuando loop:', err); } catch (_) {}
            rafId = requestAnimationFrame(tick);
          }
        }
        v.addEventListener('loadedmetadata', function () {
          flowLog('Vídeo carregado', { storyIndex: idx, mediaIndex: mediaIdx, duration: v.duration });
          if (!rafId) rafId = requestAnimationFrame(tick);
        });
        if (bar) {
          rafId = requestAnimationFrame(tick);
        }
        v.addEventListener('playing', function () {
          logTimerStarted('video', Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : undefined);
          flowLog('Story seguinte carregado', { storyIndex: idx, mediaIndex: mediaIdx, type: 'video' });
        });
        v.addEventListener('ended', function () { track('completed', story.id); nextOnce('video-ended-event'); });
        media.appendChild(v); currentEl = v;
        v.play().catch(function () { v.muted = true; v.play().catch(function(){}); });
      } else {
        var im = document.createElement('img'); im.src = item.url; media.appendChild(im); currentEl = im;
        var bar2 = progress.children[mediaIdx] && progress.children[mediaIdx].firstChild;
        var start = performance.now(); var DUR = 5000;
        im.addEventListener('load', function () { flowLog('Imagem carregada', { storyIndex: idx, mediaIndex: mediaIdx }); flowLog('Story seguinte carregado', { storyIndex: idx, mediaIndex: mediaIdx, type: 'image' }); });
        function tick2(t) {
          try {
            if (!bar2 || advancing) return;
            logTimerStarted('image', DUR);
            var p = Math.min(1, (t - start) / DUR);
            bar2.style.width = (p * 100) + '%';
            logProgress(p);
            if (p >= 1) { track('completed', story.id); nextOnce('image-duration-complete'); return; }
            rafId = requestAnimationFrame(tick2);
          } catch (err) {
            try { console.warn('[Zentor stories] tick error, continuando loop:', err); } catch (_) {}
            rafId = requestAnimationFrame(tick2);
          }
        }
        rafId = requestAnimationFrame(tick2);
      }

      if (ctaBtn) ctaBtn.remove();
      if (story.cta) {
        ctaBtn = el('button', 'zt-cta', 'Saiba mais');
        ctaBtn.addEventListener('click', function (e) { e.stopPropagation(); track('click', story.id); try { window.open(story.cta, '_blank', 'noopener'); } catch(_){} });
        player.appendChild(ctaBtn);
      }
      track('view', story.id);
    }

    function next() {
      var story = stories[idx]; var items = story.media && story.media.length ? story.media : [1];
      mediaIdx++;
      if (mediaIdx >= items.length) { mediaIdx = 0; idx++; }
      if (idx >= stories.length) { destroy(); return; }
      show();
    }
    function prev() {
      mediaIdx--;
      if (mediaIdx < 0) { idx--; if (idx < 0) { destroy(); return; } var s = stories[idx]; mediaIdx = (s.media && s.media.length ? s.media.length : 1) - 1; }
      show();
    }

    function onKey(e) { if (e.key === 'Escape') destroy(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); }
    document.addEventListener('keydown', onKey);

    close.addEventListener('click', destroy);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) destroy(); });
    navL.addEventListener('click', prev);
    navR.addEventListener('click', next);

    player.appendChild(media); player.appendChild(progress); player.appendChild(close); player.appendChild(navL); player.appendChild(navR);
    overlay.appendChild(player); shadow.appendChild(overlay);
    track('open', stories[idx].id);
    show();
  }

  // Boot
  function boot() {
    fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID))
      .then(function (cfg) {
        injectStyles();
        return fetchJSON(API_BASE + '/api/public/store/' + encodeURIComponent(STORE_ID) + '/stories').then(function (res) {
          var stories = (res && res.stories) || [];
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
