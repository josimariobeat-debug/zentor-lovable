# Melhorias na arquitetura do widget Zentor

Refatoração em 5 frentes para deixar o widget do e-commerce leve, modular e visualmente idêntico ao painel admin.

## 1. Lazy Module Loading (`public/widget.js` → módulos separados)

Quebrar o `widget.js` monolítico em uma entry mínima + módulos carregados sob demanda via `import()` dinâmico servidos como assets estáticos versionados.

```text
public/widget/
  core.js        ← boot, fetch da config já feita pelo loader, render das miniaturas
  viewer.js      ← StoryViewer/MediaPreview (player, progress bars, gestos)
  products.js    ← cards de produto + carrossel
  measures.js    ← modal de tabela de medidas + manequim
  comments.js    ← área de comentários
  likes.js       ← curtidas
  styles.css     ← CSS único injetado no Shadow DOM
```

Regras de carregamento:
- `core.js` (≤ 8 KB) renderiza só as miniaturas — nada mais é baixado até o primeiro clique.
- `viewer.js` carrega no primeiro clique em uma miniatura.
- `products.js` só se o story atual tiver `products.length > 0`.
- `measures.js` só se existir `measure_model_id` vinculado E o usuário tocar o ícone.
- `comments.js` / `likes.js` só ao abrir a respectiva UI.
- Cada módulo é cacheado em memória após o primeiro `import()`.

## 2. Componente de modal compartilhado (painel + widget)

Extrair `src/components/storievideos/MediaPreviewModal.tsx` para um pacote isomórfico:

```text
src/components/preview/
  PreviewViewer.tsx      ← React, usado pelo painel admin
  PreviewViewer.vanilla.ts ← wrapper vanilla que hidrata o mesmo markup/CSS no widget
  preview.css            ← fonte única de estilos (importada nos dois lados)
  parts/
    ProgressBars.tsx
    ProductCard.tsx
    MeasureModal.tsx
    Controls.tsx         ← play/pause, som, gestos (hold-to-pause, swipe)
```

- Painel admin continua importando `PreviewViewer` normalmente.
- Widget monta `PreviewViewer.vanilla` dentro de um **Shadow DOM** (`attachShadow({mode:'open'})`) e injeta `preview.css` inline no shadow root, isolando 100% do CSS da loja.
- Qualquer melhoria futura (novo botão, animação, layout) é feita uma vez em `parts/*` e reflete nos dois ambientes.

## 3. Normalização de URLs

Novo utilitário `src/lib/urlMatch.ts` usado tanto no server (`/api/public/widget`) quanto no `loader.js`:

- remove querystring inteira (ou mantém só um allow-list se necessário no futuro),
- remove `#hash`,
- remove barra final,
- lowercase no host + path,
- ignora `www.`.

Aplicado antes de qualquer comparação nas regras (`exact`, `contains`, etc). Isso corrige o caso `/produto/blusa` ≡ `/produto/blusa/` ≡ `/produto/blusa?utm_source=google`.

## 4. Validação e cobertura das regras de exibição

Estender `storyMatchesPage()` (server + loader) para suportar todos os tipos:

| Tipo | Como detecta |
|---|---|
| `exact` | path normalizado === regra |
| `contains` | path normalizado inclui trecho |
| `all` | sempre true |
| `home` | path === `/` |
| `product` | heurística por plataforma (WBuy: `/produto/`, Shopify: `/products/`, etc.) + override manual |
| `category` | `/categoria/`, `/collections/`, `/c/` |
| `search` | `/busca`, `/search`, `?q=` |
| `cart` | `/carrinho`, `/cart`, `/checkout/cart` |

Testes unitários em `src/lib/__tests__/urlMatch.test.ts` cobrindo cada tipo + variações com/sem query e barra final.

## 5. Garantia de consistência visual painel ↔ widget

- Fonte única de CSS (`preview.css`) importada nos dois ambientes.
- Fonte única de markup (`parts/*` renderizando o mesmo HTML).
- Snapshot visual: rodar Playwright abrindo o mesmo story no painel e num HTML de teste do widget, comparar screenshots dos 5 estados (miniaturas, viewer aberto, produto expandido, medidas abertas, pausado).
- Nenhum estilo do tema da loja pode vazar (Shadow DOM garante).

## Detalhes técnicos

**Build dos módulos do widget**
Adicionar entry Vite dedicada (build separado) que emite `public/widget/*.js` com hash em nome de arquivo. Loader existente (`public/loader.js`) passa a apontar para `/widget/core.js?v=<hash>`. Config já pré-carregada pelo loader continua sendo consumida via `window.__ZENTOR__.config` — sem fetch extra no core.

**Shadow DOM**
`core.js` cria um `<div id="zentor-root">` no `<body>`, chama `attachShadow`, injeta `<style>` com `preview.css`, e monta miniaturas + (lazy) viewer dentro do shadow. Isso resolve conflitos com Tailwind/Bootstrap da loja e elimina a necessidade de prefixos CSS defensivos.

**Compatibilidade**
Loader antigo (`widget.js` monolítico) continua respondendo por 1 versão para não quebrar lojas já integradas; log de deprecation no console e migração recomendada via aba Integração.

**Escopo fora deste plano**
- Backend/DB inalterados (o endpoint `/api/public/widget` só ganha a normalização + novos tipos de regra).
- UX do painel admin idêntica; só troca o import interno do modal.
