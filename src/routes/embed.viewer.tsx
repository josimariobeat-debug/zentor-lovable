import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== 'object' || !data.__zentorEmbed) return;
      if (data.type === 'init') {
        setPayload(data.payload as EmbedPayload);
      }

    };
    window.addEventListener('message', onMsg);
    post({ type: 'ready' });
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Achata todas as mídias de todos os stories em uma playlist única — mesmo
  // comportamento do preview da lista de Stories no painel.
  const flat = useMemo(() => {
    if (!payload) return { playlist: [] as PlaylistItem[], mediaToStory: [] as number[], measures: [] as Array<MeasureModel | null>, startIdx: 0 };
    const playlist: PlaylistItem[] = [];
    const mediaToStory: number[] = [];
    const measures: Array<MeasureModel | null> = [];
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
        measures.push(m.measure ?? null);
      });
    });
    return { playlist, mediaToStory, measures, startIdx };
  }, [payload]);

  useEffect(() => {
    if (!payload) return;
    setActiveIndex(flat.startIdx);
    setMeasureOpen(false);
  }, [payload, flat.startIdx]);

  const handleActiveIndexChange = useCallback((idx: number) => {
    setActiveIndex(idx);
    setMeasureOpen(false);
  }, []);

  // Medida da mídia ativa, usando o mesmo MediaPreviewModal do painel.
  const currentMeasure = useMemo(() => {
    if (!payload) return null;
    return flat.measures[activeIndex] ?? null;
  }, [payload, flat.measures, activeIndex]);


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
        onActiveIndexChange={handleActiveIndexChange}
      />
      <MeasurePreviewModal
        model={measureOpen ? currentMeasure : null}
        onClose={() => setMeasureOpen(false)}
      />
    </div>
  );
}
