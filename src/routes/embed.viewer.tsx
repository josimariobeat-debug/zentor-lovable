import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import MediaPreviewModal, { type PlaylistItem } from '@/components/storievideos/MediaPreviewModal';
import { MeasurePreviewModal, type MeasureModel } from '@/components/storievideos/MeasurePreviewModal';

export const Route = createFileRoute('/embed/viewer')({
  ssr: false,
  component: EmbedViewer,
});

// Torna o documento transparente antes do primeiro paint do React, evitando
// o flash branco padrão do iframe. Executa no import do módulo (client-only
// pois a rota é ssr:false).
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.textContent =
    'html,body{background:transparent !important;margin:0;padding:0;overflow:hidden;color-scheme:normal}';
  document.head.appendChild(s);
}

interface StoryPayload {
  id: string;
  media: Array<{
    id: string;
    url: string;
    type: string;
    products?: Array<{ id: string; name: string; price: string; image?: string | null; url?: string | null }>;
    measure?: MeasureModel | null;
  }>;
}

interface EmbedPayload {
  stories: StoryPayload[];
  startStoryIdx?: number;
  startMediaIdx?: number;
}

function post(data: any) {
  try { window.parent?.postMessage({ __zentor: true, ...data }, '*'); } catch {}
}

function EmbedViewer() {
  const [payload, setPayload] = useState<EmbedPayload | null>(null);
  const [measureOpen, setMeasureOpen] = useState(false);
  

  useEffect(() => {
    // Torna o documento do iframe transparente para que o overlay do Radix
    // (bg-black/80) seja o único responsável pelo escurecimento — igual ao
    // preview da aba Stories no painel.
    const prevHtmlBg = document.documentElement.style.background;
    const prevBodyBg = document.body.style.background;
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';

    const onMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== 'object' || !data.__zentorEmbed) return;
      if (data.type === 'init') {
        setPayload(data.payload as EmbedPayload);
      }

    };
    window.addEventListener('message', onMsg);
    post({ type: 'ready' });
    return () => {
      window.removeEventListener('message', onMsg);
      document.documentElement.style.background = prevHtmlBg;
      document.body.style.background = prevBodyBg;
    };
    
  }, []);

  // Achata todas as mídias de todos os stories em uma playlist única — mesmo
  // comportamento do preview da lista de Stories no painel.
  const flat = useMemo(() => {
    if (!payload) return { playlist: [] as PlaylistItem[], mediaToStory: [] as number[], startIdx: 0 };
    const playlist: PlaylistItem[] = [];
    const mediaToStory: number[] = [];
    let startIdx = 0;
    payload.stories.forEach((story, si) => {
      story.media.forEach((m, mi) => {
        if (si === (payload.startStoryIdx ?? 0) && mi === (payload.startMediaIdx ?? 0)) {
          startIdx = playlist.length;
        }
        playlist.push({
          media: { url: m.url, type: m.type },
          products: m.products ?? [],
        });
        mediaToStory.push(si);
      });
    });
    return { playlist, mediaToStory, startIdx };
  }, [payload]);

  // Medida do item inicial (mesmo comportamento do preview admin: ícone reflete
  // o story em que o usuário clicou, sem atualizar dinamicamente enquanto avança).
  const currentMeasure = useMemo(() => {
    if (!payload) return null;
    const si = payload.startStoryIdx ?? 0;
    const mi = payload.startMediaIdx ?? 0;
    return payload.stories[si]?.media[mi]?.measure ?? null;
  }, [payload]);


  if (!payload) {
    return <div style={{ background: 'transparent', width: '100vw', height: '100vh' }} />;
  }

  return (
    <div style={{ background: 'transparent', width: '100vw', height: '100vh' }}>
      <MediaPreviewModal
        open
        onOpenChange={(o) => { if (!o) post({ type: 'close' }); }}
        playlist={flat.playlist}
        startIndex={flat.startIdx}
        showMeasureIcon={!!currentMeasure}
        measureOpen={measureOpen}
        onMeasureClick={() => setMeasureOpen(true)}
      />
      <MeasurePreviewModal
        model={measureOpen ? currentMeasure : null}
        onClose={() => setMeasureOpen(false)}
      />
    </div>
  );
}
