/*! Zentor Widget viewer v4 — iframe shim.
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

    // Bloqueia scroll do body enquanto o viewer estiver aberto.
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.setAttribute('data-zt-viewer', '');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483600',
      'background:#000',
      'animation:ztFadeIn .18s ease',
    ].join(';');

    var style = document.createElement('style');
    style.textContent = '@keyframes ztFadeIn{from{opacity:0}to{opacity:1}}';
    overlay.appendChild(style);

    var iframe = document.createElement('iframe');
    iframe.src = apiBase + '/embed/viewer';
    iframe.title = 'Zentor Stories';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.style.cssText = [
      'position:absolute',
      'inset:0',
      'width:100%',
      'height:100%',
      'border:0',
      'background:#000',
      'display:block',
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
      try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch (_) {}
      document.documentElement.style.overflow = prevOverflow;
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

    // Se o iframe carregar antes do ready (cache), força um init.
    iframe.addEventListener('load', function () { setTimeout(sendInit, 30); });

    // ESC fecha (foco fica no host, não no iframe).
    var onKey = function (e) {
      if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); }
    };
    window.addEventListener('keydown', onKey);
  }

  window.__ZENTOR_VIEWER__ = { open: open };
})();
