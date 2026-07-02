
## Objetivo

Fazer o widget da loja refletir 100% a aba **Aparência** e usar **exatamente o mesmo modal** de preview do painel (mesmo player, produtos, medidas, animações, comportamento). Fonte única de UI = React do painel.

## Diagnóstico da arquitetura atual

- `public/widget/core.js` — desenha bubbles em vanilla JS + shadow DOM. Lê pouca coisa de aparência (posição, dark mode). Ignora tamanho, radius, cores, tipografia, animações, layout, margens.
- `public/widget/viewer.js` — modal de reprodução em vanilla JS. É uma **reimplementação divergente** do `MediaPreviewModal.tsx`. Nunca vai ficar 1:1 com o painel — cada melhoria no React precisa ser reescrita à mão.
- `src/components/storievideos/MediaPreviewModal.tsx` — componente React usado no painel (produtos, medidas, curtir, comentar, CTA, swipe, hold-pause, carrossel).
- Endpoint agregado `/api/public/widget` já retorna store + stories filtrados por URL.

Problema estrutural: **dois runtimes diferentes** para a mesma UI. Enquanto for assim, nunca fica idêntico.

## Estratégia

**1. Bubbles (miniaturas) — continuam vanilla, mas passam a honrar 100% da Aparência.**
Leve, sem custo de React na loja. Aplicar todos os tokens de aparência via CSS variables dentro do shadow root.

**2. Modal de preview — deixa de ser vanilla e passa a ser o próprio `MediaPreviewModal` do painel, carregado num iframe fullscreen.**
Isso garante paridade absoluta (mesmo código, mesmas animações, mesmos componentes de produto/medida, mesmo comportamento futuro). O iframe roda em `meuzentor.lovable.app` com o mesmo bundle React do painel, então qualquer melhoria futura no preview reflete automaticamente na loja.

## Implementação

### A. Schema de aparência (fonte da verdade)

Adicionar/consolidar em `stores.appearance` (jsonb) todos os campos que a aba Aparência já expõe:

```
position, align, offsetX, offsetY, gap,
layout (row/grid), size (px), shape (circle/rounded/square), borderRadius,
ringStyle, ringColors[], ringWidth,
labelShow, labelColor, labelFont, labelSize, labelWeight,
bgColor, ctaText, ctaStyle, ctaAnimation,
darkMode
```

Já é lido pelo `AppearanceEditor` e `AppearanceMiniPreview`. Falta expor no endpoint público e consumir no widget.

### B. Endpoint `/api/public/widget`

Passa a devolver o objeto `appearance` inteiro (hoje devolve subset). Sem quebrar formato existente — só acrescenta campos.

### C. `public/widget/core.js` — bubbles fiéis à Aparência

Refatorar `renderBubbles`:
- Injetar CSS variables no host a partir de `appearance` (`--zt-size`, `--zt-radius`, `--zt-gap`, `--zt-ring`, `--zt-label-color`, `--zt-font`, `--zt-offset-x/y`, etc.).
- Aplicar posição/alinhamento/margens via classe + variáveis.
- Suportar layouts (linha/grid).
- Ring gradient/sólido configurável.
- Label com fonte/tamanho/peso/cor configuráveis (carregar Google Font via `<link>` se `labelFont` for externa).
- Animação de entrada configurável (fade/slide/scale).
- CTA "pill" já existente passa a ler `ctaText/ctaStyle/ctaAnimation`.

### D. Novo modal do e-commerce = iframe do painel

1. Criar rota pública **`/embed/viewer`** (React, SSR-off) em `src/routes/embed.viewer.tsx`:
   - Recebe `?store=...&story=...&idx=...` (ou lê `postMessage` do parent).
   - Busca stories via `/api/public/widget` (mesmo payload que a loja já tem — passar via `postMessage` para evitar refetch).
   - Renderiza **exatamente** `<MediaPreviewModal open playlist={...} startIndex={...} />` em modo fullscreen (sem sidebar/app shell).
   - Fecha via `postMessage({type:'zentor:close'})` → parent remove o iframe.
   - Comunica eventos (`impression`, `view`, `click_product`, `close`) por `postMessage` → parent chama `track()`.

2. Reescrever `public/widget/viewer.js` como **shim mínimo** (~1 KB):
   - `open({stories, startIdx, storeId, track})`: injeta `<iframe src="{origin}/embed/viewer?store=...">` fullscreen no shadow root, com `allow="autoplay; fullscreen"`, `sandbox="allow-scripts allow-same-origin allow-popups"`.
   - `postMessage` do payload (stories completos com produtos/medidas) para o iframe → zero refetch.
   - Escuta mensagens do iframe (`close`, `track`, `resize`).
   - Bloqueia scroll do body enquanto aberto.
   - Fallback gracioso se iframe falhar (mensagem de erro discreta).

3. Garantir que `MediaPreviewModal` funciona standalone (sem AppLayout). Ele já é `Dialog` fullscreen, então precisa apenas de um wrapper `<EmbedViewer />` que injete `QueryClientProvider`, tokens de tema, e monte o modal como `open` fixo.

### E. Produtos e medidas no iframe

O payload enviado pelo `postMessage` já contém `products[]` e `measure_models[]` vinculados por story (mesma estrutura que `StoriesVideosApp` monta hoje). O `MediaPreviewModal` recebe esses props exatamente como no painel — sem código duplicado.

Se story sem produtos → carrossel oculto (comportamento já existente).
Se story sem medidas → ícone de régua oculto (comportamento já existente).

### F. CORS/segurança do iframe

- Rota `/embed/viewer` responde com `Content-Security-Policy: frame-ancestors *` (ou lista de origens da loja, se quiser restringir por `stores.allowed_origins`).
- `postMessage` valida `event.origin` contra `stores.allowed_origins` (opcional; sem lista = aceita qualquer, comportamento atual).

### G. Cache/perf

- `loader.js` continua igual (SWR + página-match).
- `core.js` mantém preload do viewer no primeiro hover — mas agora "preload" = `<link rel="preload" as="document" href="/embed/viewer">`, não script.
- Iframe é criado **no primeiro clique**, não no boot — custo zero para quem só vê as bubbles.

## Arquivos afetados

- `public/widget/core.js` — rewrite parcial (bubbles honram appearance completa).
- `public/widget/viewer.js` — rewrite completo como shim de iframe (~1 KB).
- `public/loader.js` — sem mudanças.
- `src/routes/api/public/widget.ts` — devolve `appearance` completo.
- `src/routes/embed.viewer.tsx` — **novo**, monta `MediaPreviewModal` standalone.
- `src/components/storievideos/MediaPreviewModal.tsx` — pequenos ajustes para modo embed (fechar via callback que o pai converte em `postMessage`).
- `src/pages/AppearanceEditor.tsx` — garantir que salva todos os campos que o widget agora consome.
- `src/components/storievideos/AppearanceMiniPreview.tsx` — refletir mesmos tokens.

## Fora do escopo (fica pra depois se você pedir)

- Comentários e curtir com persistência por visitante da loja (hoje é UI-only no painel). Se quiser real, precisa endpoint público + tabela + moderação.
- Auth do visitante da loja pra curtir/comentar (login social embedado).
- Editor visual de aparência com preview do iframe real.

## Riscos

- Iframe adiciona ~200ms no primeiro open (carrega HTML+JS do painel). Mitigado com `<link rel="preload">` no hover.
- Fontes customizadas do painel precisam estar disponíveis na rota `/embed/viewer` (já estão no `__root.tsx`).
- Alguns navegadores de webview embutido (Instagram in-app) restringem iframe autoplay. Vamos usar `muted autoplay playsinline` como já é hoje.

## Ordem de execução

1. Endpoint devolve `appearance` completa.
2. `core.js` aplica appearance nos bubbles.
3. Rota `/embed/viewer` + adaptação do `MediaPreviewModal`.
4. `viewer.js` vira shim de iframe + `postMessage`.
5. Preload no hover.
6. Publicar e testar em `vitrinneclassica.com`.

---

Confirma esta abordagem (iframe do painel = modal da loja)? Se preferir manter tudo vanilla (sem iframe) eu sigo, mas aviso: nunca vai ficar 1:1 e cada ajuste no painel vira trabalho dobrado.
