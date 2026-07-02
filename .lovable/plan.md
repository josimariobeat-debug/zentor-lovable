
## Objetivo

Refatorar o widget do Zentor para o modelo Planweb-style: **loader ultraleve** + **runtime modular carregado sob demanda** + **endpoint único de configuração**, mantendo 100% do UX atual (modal, cards, medidas, comentários, curtir, comprar).

## Arquitetura final

```text
Loja (script instalado, ~1.5 KB)
   │  <script src="/loader.js?store=STORE_ID" async></script>
   ▼
loader.js
   • lê STORE_ID + URL atual
   • GET /api/widget?store=xxx&path=/produto/blusa
   • decide se há stories para essa página
   • se sim → injeta runtime widget.js (com hash de versão)
   ▼
widget.js (runtime, code-split em módulos)
   ├── bootstrap.ts       shadow root, montagem
   ├── api.ts             fetch + cache
   ├── router.ts          detecção de página (SPA + full reload)
   ├── stories.ts         bolhas + IntersectionObserver
   ├── preview-modal.ts   reusa MediaPreviewModal do painel
   ├── player.ts          vídeo + lazy load do próximo
   ├── products.ts        carrossel glass
   ├── measurements.ts    tabela de medidas
   ├── comments.ts / likes.ts
   ├── analytics.ts       track events (sendBeacon)
   └── storage.ts         cache localStorage com TTL
```

## API unificada

Novo endpoint `GET /api/public/widget?store=xxx&path=/produto/blusa` retorna um único payload:

```json
{
  "store": { "id": "zt_...", "active": true },
  "theme": { "mode": "dark", "position": "bottom-left", "accent": "#111" },
  "cta":   { "label": "Ver stories", "style": "pill" },
  "stories": [
    {
      "id": "...", "title": "...", "cover": "...",
      "media": [{ "url": "...", "type": "video/mp4" }],
      "products":   [{ "id","name","price","image","url" }],
      "measures":   [{ "id","name","sizeUsed","rows":[...] }],
      "comments":   [...],
      "likes":      12
    }
  ]
}
```

Filtragem por página é feita no servidor comparando `urls[]` do story com `path` — o loader nem precisa baixar stories de outras páginas.

## Loader (public/loader.js, ~1.5 KB minificado)

```js
(function(){
  var s = document.currentScript;
  var STORE = new URL(s.src).searchParams.get('store') || s.dataset.store;
  if (!STORE || window.__ZENTOR__) return;
  window.__ZENTOR__ = { store: STORE };
  var origin = new URL(s.src).origin;
  var path = location.pathname + location.search;
  fetch(origin + '/api/public/widget?store=' + STORE + '&path=' + encodeURIComponent(path), { credentials:'omit' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(cfg){
      if (!cfg || !cfg.stories || !cfg.stories.length) return;
      window.__ZENTOR__.config = cfg;
      var w = document.createElement('script');
      w.src = origin + '/widget.js?v=' + (cfg.version || '1');
      w.async = true;
      document.head.appendChild(w);
    });
})();
```

Snippet mostrado na aba **Integração** passa a ser:

```html
<script src="https://<origin>/loader.js?store=STORE_ID" async></script>
```

## Reuso do modal do painel

O `MediaPreviewModal` atual é React + Tailwind — não carrega dentro do widget standalone sem custo. Duas opções:

**A. Componente único, dois hosts** *(recomendado)*
- Extrair `MediaPreviewModal` + subcomponentes (produtos, medidas, comentários, likes, comprar) para `src/widget-runtime/` como um bundle React isolado.
- `widget.js` é gerado por uma entry Vite dedicada (`vite.config.ts` → `build.rollupOptions.input.widget`) que faz `ReactDOM.createRoot` dentro do Shadow DOM.
- Mesmo código-fonte roda no painel e na loja → zero divergência visual/animação.

**B. Vanilla port** — mantém widget minúsculo mas duplica o modal. Rejeitado: viola a exigência "mesmo player, mesmas animações".

Vamos com **A**.

## Lazy loading real

- Bolhas renderizam do payload (`cover` apenas — sem `<video preload>`).
- `<video>` só é criado ao abrir o story.
- Ao entrar no story N, pré-buffer só do N+1 (`link rel=preload as=video` no shadow root).
- `IntersectionObserver` só monta bolhas quando entram no viewport.

## Cache & performance

- `storage.ts` grava payload em `localStorage` com TTL 60s (chave `zt:cfg:<store>:<path>`).
- Loader serve do cache imediatamente e revalida em background (SWR).
- Todos os fetches com `credentials:'omit'`, `Cache-Control: public, max-age=30` no servidor.
- Cleanup: fechar modal destrói `<video>` e revoga blobs.

## Segurança / compatibilidade

- Endpoint continua sob `/api/public/*` (bypass auth), assinado só pelo `store_id` público.
- Nenhuma dependência de plataforma (WBuy/Shopify/etc.) — só lê `location` e DOM.
- Shadow DOM garante isolamento de CSS.

## Passos de implementação

1. **DB/API** — criar endpoint `GET /api/public/widget` que agrega stores + stories filtradas por `path` + produtos + medidas + likes + comentários numa única query.
2. **Loader** — criar `public/loader.js` (arquivo estático, ~1.5 KB).
3. **Runtime bundle** — adicionar entry Vite `src/widget-runtime/index.tsx` que monta o `MediaPreviewModal` em Shadow DOM; refatorar o modal para aceitar dados via props (produtos/medidas já vem prontos do payload — sem fetch adicional).
4. **Bolhas & IntersectionObserver** — mover render de bolhas para dentro do runtime; loader só decide *se* baixa o runtime.
5. **Cache SWR** — `storage.ts` com TTL 60s.
6. **Aba Integração** — trocar snippet exibido para o loader novo; manter compat com o `widget.js` v2 antigo por 1 release (redirect no antigo `/widget.js` → carrega o novo loader).
7. **Deprecar** rotas `/api/public/store/:id` e `/api/public/store/:id/stories` — manter respondendo por 30 dias com header `Deprecation`.

## Fora de escopo

- Comentários e curtidas: os endpoints de escrita já existem (ou serão criados como parte do payload); UI vem "de graça" ao reusar o modal.
- Migração de lojistas já instalados: o `widget.js` antigo continua funcionando durante o período de compat.

## Riscos

- Bundle React no Shadow DOM tende a 40–60 KB gzip. Ainda assim carregado só quando há stories para a página, com `async` e após cache. Se ficar acima do orçamento, fazemos code-split adicional (player em chunk separado, carregado ao abrir o modal).
