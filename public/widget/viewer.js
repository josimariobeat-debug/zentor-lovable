/*! Zentor Widget viewer v5 — iframe modal bridge.
 *  Ao invés de reimplementar o player em vanilla JS, embute a rota
 *  /embed/viewer do painel para que a experiência da loja seja
 *  100% idêntica ao preview do painel administrativo (mesmo React,
 *  mesmo MediaPreviewModal, mesmo MeasurePreviewModal, mesmas
 *  animações e comportamentos).
 *  Payload é enviado via postMessage — zero refetch no iframe.
 */
(function () {
  'use strict';
  if (window.__ZENTOR_VIEWER__) return;

  function open(opts) {
    var stories = opts.stories || [];
    var startIdx = opts.startIdx || 0;
    var apiBase = opts.apiBase || '';
    var shadow = opts.shadow || document.documentElement;
    var track = opts.track || function () {};

    // Se já houver um viewer aberto, remove antes de criar outro.
    try {
      var previous = (shadow.querySelector && shadow.querySelector('[data-zt-viewer]')) || document.querySelector('[data-zt-viewer]');
      if (previous && previous.parentNode) previous.parentNode.removeChild(previous);
    } catch (_) {}

    var host = shadow && shadow.host ? shadow.host : null;
    var prevHostPointerEvents = host ? host.style.pointerEvents : '';
    var prevHostZIndex = host ? host.style.zIndex : '';
    if (host) {
      host.style.pointerEvents = 'auto';
      host.style.zIndex = '2147483600';
    }

    // Bloqueia scroll da loja enquanto o viewer estiver aberto.
    var prevOverflow = document.documentElement.style.overflow;
    var prevBodyOverflow = document.body && document.body.style ? document.body.style.overflow : '';
    document.documentElement.style.overflow = 'hidden';
    if (document.body && document.body.style) document.body.style.overflow = 'hidden';
    var lastActive = document.activeElement;

    var overlay = document.createElement('div');
    overlay.setAttribute('data-zt-viewer', '');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.tabIndex = -1;
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483600',
      'background:transparent',
      'pointer-events:auto',
      'isolation:isolate',
      'overscroll-behavior:contain',
      'animation:ztFadeIn .18s ease',
    ].join(';');

    var style = document.createElement('style');
    style.textContent = '@keyframes ztFadeIn{from{opacity:0}to{opacity:1}}';
    overlay.appendChild(style);

    var iframe = document.createElement('iframe');
    iframe.src = apiBase + '/embed/viewer';
    iframe.title = 'Zentor Stories';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; clipboard-write; web-share';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'border:0',
      'background:transparent',
      'display:block',
      'pointer-events:auto',
    ].join(';');

    overlay.appendChild(iframe);
    shadow.appendChild(overlay);

    var expectedOrigin = (function () { try { return new URL(iframe.src).origin; } catch (_) { return '*'; } })();

    var payload = {
      stories: stories,
      startStoryIdx: startIdx,
      startMediaIdx: 0,
    };

    function sendInit() {
      try {
        iframe.contentWindow &&
          iframe.contentWindow.postMessage({ __zentorEmbed: true, type: 'init', payload: payload }, '*');
      } catch (_) {}
    }

    function close() {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('focusin', keepFocusInViewer, true);
      try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch (_) {}
      document.documentElement.style.overflow = prevOverflow;
      if (document.body && document.body.style) document.body.style.overflow = prevBodyOverflow;
      if (host) {
        host.style.pointerEvents = prevHostPointerEvents;
        host.style.zIndex = prevHostZIndex;
      }
      try { lastActive && lastActive.focus && lastActive.focus({ preventScroll: true }); } catch (_) {}
    }

    function onMessage(ev) {
      if (expectedOrigin !== '*' && ev.origin !== expectedOrigin) return;
      var data = ev.data;
      if (!data || !data.__zentor) return;
      if (data.type === 'ready') sendInit();
      else if (data.type === 'close') close();
      else if (data.type === 'track') track(data.event_type, data.story_id);
    }

    window.addEventListener('message', onMessage);

    // Se o iframe carregar antes do ready (cache), força um init e move o foco para o modal.
    iframe.addEventListener('load', function () {
      setTimeout(sendInit, 30);
      try { iframe.focus({ preventScroll: true }); } catch (_) { try { iframe.focus(); } catch (__) {} }
    });

    // Eventos no backdrop/overlay nunca devem atravessar para a loja.
    ['pointerdown', 'pointerup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'wheel'].forEach(function (type) {
      overlay.addEventListener(type, function (e) {
        if (e.target === overlay) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, { capture: true, passive: false });
    });

    var onKey = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };

    function keepFocusInViewer(e) {
      if (!overlay.parentNode) return;
      if (e.target !== iframe && e.target !== overlay) {
        try { iframe.focus({ preventScroll: true }); } catch (_) {}
      }
    }

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('focusin', keepFocusInViewer, true);
    try { overlay.focus({ preventScroll: true }); } catch (_) { try { overlay.focus(); } catch (__) {} }
  }

  window.__ZENTOR_VIEWER__ = { open: open };
})();
