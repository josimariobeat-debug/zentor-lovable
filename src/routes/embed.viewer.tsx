import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import MediaPreviewModal, { type PlaylistItem } from '@/components/storievideos/MediaPreviewModal';
import { MeasurePreviewModal, type MeasureModel } from '@/components/storievideos/MeasurePreviewModal';

export const Route = createFileRoute('/embed/viewer')({
  ssr: false,
  component: EmbedViewer,
});

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
  const [currentStoryIdx, setCurrentStoryIdx] = useState(0);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== 'object' || !data.__zentorEmbed) return;
      if (data.type === 'init') {
        setPayload(data.payload as EmbedPayload);
        setCurrentStoryIdx(data.payload?.startStoryIdx ?? 0);
      }
    };
    window.addEventListener('message', onMsg);
    post({ type: 'ready' });
    return () => window.removeEventListener('message', onMsg);
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

  // Índice ativo da playlist para descobrir medida atual e story ativo.
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => { setActiveIdx(flat.startIdx); }, [flat.startIdx]);

  const activeMedia = useMemo(() => {
    if (!payload) return null;
    const si = flat.mediaToStory[activeIdx];
    if (si == null) return null;
    const story = payload.stories[si];
    // Recupera a mídia correspondente somando offsets.
    let offset = 0;
    for (let i = 0; i < si; i++) offset += payload.stories[i].media.length;
    return story.media[activeIdx - offset] ?? null;
  }, [payload, flat.mediaToStory, activeIdx]);

  const currentMeasure = activeMedia?.measure ?? null;

  if (!payload) {
    return <div style={{ background: '#000', width: '100vw', height: '100vh' }} />;
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
