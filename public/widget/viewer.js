/*! Zentor Widget viewer v8 — iframe shim com prewarm + reveal instantâneo.
 *  Novo em v8:
 *   - Reveal do overlay é INSTANTÂNEO (opacity 1, sem transition, sem esperar
 *     handshake `initialized`). Como o iframe já foi prewarmado e o embed
 *     documento é transparente, mostrá-lo imediatamente não causa flash — a
 *     animação percebida é a do próprio Radix Dialog dentro do iframe, que
 *     começa assim que o `init` postMessage chega (< 1 frame). Elimina o
 *     delay de handshake + transition (~150–300ms).
 *   - `init` é enviado o mais cedo possível; se ready ainda não chegou, é
 *     enfileirado e disparado no ready.
 *  Mantido de v7: prewarm no idle, overlay no <body>, pointer-events:auto,
 *  touch-action:manipulation, transparência total.
 */

(function () {
  'use strict';
  if (window.__ZENTOR_VIEWER__) return;

  var warm = null; // { overlay, iframe, ready:boolean, apiBase, expectedOrigin, onMsgs:[] }

  function createWarm(apiBase) {
    var overlay = document.createElement('div');
    overlay.setAttribute('data-zt-viewer-warm', '');
    overlay.style.cssText = [
      'position:fixed',
      'left:0','top:0',
      'width:1px','height:1px',
      'overflow:hidden',
      'opacity:0',
      'pointer-events:none',
      'z-index:-1',
      'background:transparent',
      'contain:strict',
    ].join(';');

    var iframe = document.createElement('iframe');
    iframe.src = apiBase + '/embed/viewer';
    iframe.title = 'Zentor Stories';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.style.cssText = [
      'position:absolute','inset:0',
      'width:100%','height:100%','border:0',
      'background:transparent','display:block',
    ].join(';');

    overlay.appendChild(iframe);
    (document.body || document.documentElement).appendChild(overlay);

    var expectedOrigin;
    try { expectedOrigin = new URL(iframe.src).origin; } catch (_) { expectedOrigin = '*'; }

    var w = {
      overlay: overlay,
      iframe: iframe,
      apiBase: apiBase,
      expectedOrigin: expectedOrigin,
      ready: false,
      readyCallbacks: [],
      activeHandler: null,
    };

    function globalOnMsg(ev) {
      if (w.expectedOrigin !== '*' && ev.origin !== w.expectedOrigin) return;
      var data = ev.data;
      if (!data || !data.__zentor) return;
      if (data.type === 'ready') {
        w.ready = true;
        var cbs = w.readyCallbacks.slice();
        w.readyCallbacks.length = 0;
        cbs.forEach(function (cb) { try { cb(); } catch (_) {} });
      }
      if (w.activeHandler) w.activeHandler(data);
    }
    window.addEventListener('message', globalOnMsg);
    w._globalOnMsg = globalOnMsg;

    return w;
  }

  function prewarm(apiBase) {
    if (warm) return warm;
    try { warm = createWarm(apiBase); } catch (_) { warm = null; }
    return warm;
  }

  function open(opts) {
    var stories = opts.stories || [];
    var startIdx = opts.startIdx || 0;
    var apiBase = opts.apiBase || '';
    var track = opts.track || function () {};

    // Garante warm — cria se ninguém chamou prewarm.
    var w = warm || prewarm(apiBase);
    if (!w) return;

    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    // Promove o overlay para fullscreen.
    var ov = w.overlay;
    ov.setAttribute('data-zt-viewer', '');
    ov.removeAttribute('data-zt-viewer-warm');
    ov.style.cssText = [
      'position:fixed','inset:0',
      'z-index:2147483600',
      'background:transparent',
      'pointer-events:auto',
      '-webkit-tap-highlight-color:transparent',
      'touch-action:manipulation',
      'opacity:1',
    ].join(';');

    var payload = { stories: stories, startStoryIdx: startIdx, startMediaIdx: 0 };

    function sendInit() {
      try {
        w.iframe.contentWindow &&
          w.iframe.contentWindow.postMessage({ __zentorEmbed: true, type: 'init', payload: payload }, '*');
      } catch (_) {}
    }

    function close() {
      w.activeHandler = null;
      window.removeEventListener('keydown', onKey);
      try { ov.parentNode && ov.parentNode.removeChild(ov); } catch (_) {}
      try { window.removeEventListener('message', w._globalOnMsg); } catch (_) {}
      document.documentElement.style.overflow = prevOverflow;
      warm = null;
      // reprewarm sem bloquear
      setTimeout(function () { prewarm(apiBase); }, 50);
    }

    w.activeHandler = function (data) {
      if (data.type === 'close') close();
      else if (data.type === 'track') track(data.event_type, data.story_id);
    };

    var onKey = function (e) { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);

    // Envia init imediatamente se ready; senão enfileira (dispara no ready).
    if (w.ready) {
      sendInit();
    } else {
      w.readyCallbacks.push(sendInit);
      // Safety: se por algum motivo ready não chegou mas iframe já carregou.
      setTimeout(function () { if (!w.ready) sendInit(); }, 200);
    }
  }


  window.__ZENTOR_VIEWER__ = { open: open, prewarm: prewarm };
})();
