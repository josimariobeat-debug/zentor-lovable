/*! Zentor Widget viewer v6 — iframe shim.
 *  Correções v6 (flash na abertura):
 *   - Iframe começa com opacity:0 e só faz fade-in DEPOIS que a app React
 *     dentro dele confirmou o render inicial (mensagem "initialized"),
 *     evitando o flash branco/preto do iframe antes do modal aparecer.
 *   - Não animamos mais o overlay separadamente; o único fade visível é o
 *     do próprio Radix Dialog, idêntico ao preview da aba Stories.
 *  Correções v5 mantidas: overlay no <body>, pointer-events:auto,
 *  touch-action:manipulation.
 */
(function () {
  'use strict';
  if (window.__ZENTOR_VIEWER__) return;

  function open(opts) {
    var stories = opts.stories || [];
    var startIdx = opts.startIdx || 0;
    var apiBase = opts.apiBase || '';
    var track = opts.track || function () {};

    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    var overlay = document.createElement('div');
    overlay.setAttribute('data-zt-viewer', '');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483600',
      'background:transparent',
      'pointer-events:auto',
      '-webkit-tap-highlight-color:transparent',
      'touch-action:manipulation',
    ].join(';');

    var iframe = document.createElement('iframe');
    iframe.src = apiBase + '/embed/viewer';
    iframe.title = 'Zentor Stories';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
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
      'opacity:0',
      'transition:opacity .12s linear',
    ].join(';');

    overlay.appendChild(iframe);
    (document.body || document.documentElement).appendChild(overlay);

    var expectedOrigin = (function () { try { return new URL(iframe.src).origin; } catch (_) { return '*'; } })();

    var payload = {
      stories: stories,
      startStoryIdx: startIdx,
      startMediaIdx: 0,
    };

    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      // rAF garante que o navegador já aplicou o layout do modal antes de
      // subir a opacidade, eliminando qualquer flicker perceptível.
      requestAnimationFrame(function () {
        iframe.style.opacity = '1';
      });
    }

    function sendInit() {
      try {
        iframe.contentWindow &&
          iframe.contentWindow.postMessage({ __zentorEmbed: true, type: 'init', payload: payload }, '*');
      } catch (_) {}
    }

    function close() {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
      try { overlay.parentNode && overlay.parentNode.removeChild(overlay); } catch (_) {}
      document.documentElement.style.overflow = prevOverflow;
    }

    function onMessage(ev) {
      if (expectedOrigin !== '*' && ev.origin !== expectedOrigin) return;
      var data = ev.data;
      if (!data || !data.__zentor) return;
      if (data.type === 'ready') sendInit();
      else if (data.type === 'initialized') reveal();
      else if (data.type === 'close') close();
      else if (data.type === 'track') track(data.event_type, data.story_id);
    }

    window.addEventListener('message', onMessage);
    iframe.addEventListener('load', function () { setTimeout(sendInit, 30); });

    // Fallback: se por algum motivo a app não mandar "initialized", revela
    // depois de 600ms para não deixar o modal invisível.
    setTimeout(reveal, 600);

    var onKey = function (e) {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
  }

  window.__ZENTOR_VIEWER__ = { open: open };
})();
