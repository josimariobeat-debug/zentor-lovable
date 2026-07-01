import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import TopBar from '@/components/layout/TopBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton, StoriesRowsSkeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import { GalleryCard } from '@/components/ui/GalleryCard';
import IntegracaoTab from '@/components/storievideos/IntegracaoTab';
import AppearancePresets from '@/components/storievideos/AppearancePresets';
import MediaPreviewModal from '@/components/storievideos/MediaPreviewModal';
import {
  MeasurePreviewModal as MeasureModelPreviewModal,
  MEASURE_TYPES,
  type MeasureType,
  type MeasureRow,
  type MeasureModel,
} from '@/components/storievideos/MeasurePreviewModal';
import {
  Search,
  Plus,
  Settings2,
  Edit2,
  Trash2,
  Eye,
  Play,
  Image as ImageIcon,
  Upload,
  Check,
  CheckSquare,
  Package,
  Loader2 } from
'lucide-react';

type Story = Tables<'stories'>;
type StoryMedia = Tables<'story_media'>;
type GalleryMedia = Tables<'media_gallery'>;

interface StoryWithMedia extends Story {
  story_media: StoryMedia[];
}

const TABS = [
{ value: 'stories', label: 'Stories' },
{ value: 'midias', label: 'Galeria' },
{ value: 'aparencia', label: 'Aparência' },
{ value: 'dashboard', label: 'Dashboard' },
{ value: 'produtos', label: 'Produtos' },
{ value: 'comentarios', label: 'Comentários' },
{ value: 'config', label: 'Configurações' },
{ value: 'integracao', label: 'Integração' }];


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StoriesVideosApp() {
  const navigate = useNavigate();
  const { appId } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') || 'stories';
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryWithMedia[] | null>(null);
  const [search, setSearch] = useState('');
  const [widget, setWidget] = useState(true);
  const [carrossel, setCarrossel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StoryWithMedia | null>(null);
  const [previewStory, setPreviewStory] = useState<StoryWithMedia | null>(null);
  const [previewStartIndex, setPreviewStartIndex] = useState(0);
  // tick usado para forçar re-render após hidratação assíncrona dos caches
  const [, setPreviewHydrateTick] = useState(0);
  const [previewMeasure, setPreviewMeasure] = useState<MeasureModel | null>(null);
  const [previewMeasureOpen, setPreviewMeasureOpen] = useState(false);
  const [gallery, setGallery] = useState<GalleryMedia[] | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [previewGallery, setPreviewGallery] = useState<GalleryMedia | null>(null);
  const [deleteGalleryConfirm, setDeleteGalleryConfirm] = useState<GalleryMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  // Cache de produtos do app — usado para renderizar o card instantaneamente
  // no modal de preview, sem esperar o fetch por id.
  const productsCacheRef = useRef<Map<string, { id: string; name: string; price: string; image?: string | null; url?: string | null }>>(new Map());
  // Cache de modelos de medidas — mesma estratégia do cache de produtos.
  const measuresCacheRef = useRef<Map<string, MeasureModel>>(new Map());


  // Fallback: if URL uses app_key (text slug) instead of UUID, resolve to UUID and redirect.
  useEffect(() => {
    if (!supabase || !user || !appId) return;
    if (UUID_RE.test(appId)) return;
    (async () => {
      const { data } = await supabase.
      from('installed_apps').
      select('id').
      eq('user_id', user.id).
      eq('app_key', appId).
      maybeSingle();
      const suffix = window.location.search + window.location.hash;
      if (data?.id) {
        navigate(`/app/${data.id}${suffix}`, { replace: true });
      } else {
        toast.error(`App "${appId}" não encontrado`);
        navigate('/', { replace: true });
      }
    })();
  }, [appId, user, navigate]);


  useEffect(() => {
    loadStories();
    loadGallery();
    loadProductsCache();
    loadMeasuresCache();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const loadProductsCache = async () => {
    if (!supabase || !user) return;
    const { data } = await (supabase as any)
      .from('products')
      .select('id,name,price,currency,url,image')
      .eq('user_id', user.id);
    const map = new Map<string, any>();
    (data ?? []).forEach((p: any) => {
      map.set(p.id, { id: p.id, name: p.name, price: String(p.price ?? ''), image: p.image, url: p.url });
    });
    productsCacheRef.current = map;
  };

  const loadMeasuresCache = async () => {
    if (!supabase || !user) return;
    const { data } = await (supabase as any)
      .from('measure_models')
      .select('id,name,measure_rows(id,size_name,measure_type,value_cm,position)')
      .eq('user_id', user.id);
    const map = new Map<string, MeasureModel>();
    (data ?? []).forEach((m: any) => {
      const rows = ((m.measure_rows ?? []) as any[])
        .slice()
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((r) => ({ id: r.id, tamanho: r.size_name, medida: r.measure_type as MeasureType, valor: String(r.value_cm) }));
      map.set(m.id, { id: m.id, name: m.name, rows });
    });
    measuresCacheRef.current = map;
  };


  const loadStories = async () => {

    if (!supabase || !appId || !UUID_RE.test(appId)) return;
    const { data } = await supabase.
    from('stories').
    select('*, story_media(*)').
    eq('app_id', appId).
    order('created_at', { ascending: false });
    setStories(data as StoryWithMedia[] ?? []);
  };

  // Abre o preview do story em modo playlist — todas as mídias do projeto,
  // cada uma como um Story independente com sua própria mídia, produtos,
  // medidas, ordem e layout. Comporta-se como o modal da aba Aparência.
  const openStoryPreview = (story: StoryWithMedia, clickedMediaId?: string) => {
    const list = getOrderedStoryMedia(story);
    const startIdx = Math.max(
      0,
      clickedMediaId ? list.findIndex((m) => m.id === clickedMediaId) : 0,
    );
    // Medida do primeiro item da playlist (para o ícone de medidas)
    const first = list[startIdx] as (StoryMedia & { measure_id?: string | null }) | undefined;
    const measureId = first?.measure_id ?? null;
    setPreviewMeasure(measureId ? (measuresCacheRef.current.get(measureId) ?? { id: measureId, name: '', rows: [] }) : null);
    setPreviewStartIndex(startIdx);
    setPreviewStory(story);
  };

  // Ordena mídias do story: cover primeiro; demais pela posição/created_at.
  const getOrderedStoryMedia = (story: StoryWithMedia): StoryMedia[] => {
    const list = (story.story_media ?? []).slice();
    list.sort((a: any, b: any) => {
      const ap = a.position ?? 0;
      const bp = b.position ?? 0;
      if (ap !== bp) return ap - bp;
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return at - bt;
    });
    const coverIdx = list.findIndex((m) => (m as any).is_cover);
    if (coverIdx > 0) {
      const [cover] = list.splice(coverIdx, 1);
      list.unshift(cover);
    }
    return list;
  };

  // Refresh assíncrono dos produtos/medidas de TODAS as mídias do story aberto —
  // hidrata o cache e força re-render da playlist para refletir dados atualizados
  // sem pop-in. Enquanto o fetch estiver em andamento, cards em estado "pending"
  // renderizam skeleton no modal (nunca "Produto indisponível").
  useEffect(() => {
    let cancelled = false;
    if (!previewStory || !supabase) return;
    const mediaList = getOrderedStoryMedia(previewStory) as Array<StoryMedia & { product_ids?: string[] | null; measure_id?: string | null }>;
    const allProductIds = Array.from(new Set(mediaList.flatMap((m) => Array.isArray(m.product_ids) ? m.product_ids : [])));
    const allMeasureIds = Array.from(new Set(mediaList.map((m) => m.measure_id).filter((x): x is string => !!x)));

    const fetchProducts = async () => {
      const missing = allProductIds.filter((id) => !productsCacheRef.current.has(id) && !productsNotFoundRef.current.has(id));
      if (missing.length === 0) return;
      for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
        const { data, error } = await (supabase as any)
          .from('products')
          .select('id,name,price,currency,url,image')
          .in('id', missing);
        if (!error && data) {
          const returned = new Set<string>();
          (data as any[]).forEach((p) => {
            returned.add(p.id);
            productsCacheRef.current.set(p.id, { id: p.id, name: p.name, price: String(p.price ?? ''), image: p.image, url: p.url });
          });
          // Só marca como definitivamente indisponível na última tentativa,
          // após o servidor responder com sucesso mas sem o produto.
          missing.forEach((id) => { if (!returned.has(id)) productsNotFoundRef.current.add(id); });
          if (!cancelled) setPreviewHydrateTick((t) => t + 1);
          return;
        }
        // backoff antes do retry
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    };

    const fetchMeasures = async () => {
      if (allMeasureIds.length === 0) return;
      const { data } = await (supabase as any)
        .from('measure_models')
        .select('id,name,measure_rows(id,size_name,measure_type,value_cm,position)')
        .in('id', allMeasureIds);
      if (!cancelled && data) {
        (data as any[]).forEach((m) => {
          const rows = ((m.measure_rows ?? []) as any[])
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((r) => ({ id: r.id, tamanho: r.size_name, medida: r.measure_type as MeasureType, valor: String(r.value_cm) }));
          measuresCacheRef.current.set(m.id, { id: m.id, name: m.name, rows });
        });
        const first = mediaList[previewStartIndex] as (StoryMedia & { measure_id?: string | null }) | undefined;
        const mid = first?.measure_id ?? null;
        if (mid) setPreviewMeasure(measuresCacheRef.current.get(mid) ?? null);
        setPreviewHydrateTick((t) => t + 1);
      }
    };

    // Paralelo: produtos e medidas ao mesmo tempo.
    Promise.all([fetchProducts(), fetchMeasures()]);

    return () => { cancelled = true; };
  }, [previewStory, previewStartIndex]);

  // Playlist derivada — cada mídia é um story independente com seus produtos.
  // Regras:
  //  - Se o produto está no cache → render normal.
  //  - Se está confirmado como ausente (após fetch concluído) → "Produto indisponível".
  //  - Caso contrário (carregando) → pending=true (modal exibe skeleton).
  const previewPlaylist = useMemo(() => {
    if (!previewStory) return undefined;
    const mediaList = getOrderedStoryMedia(previewStory) as Array<StoryMedia & { product_ids?: string[] | null }>;
    const cache = productsCacheRef.current;
    const notFound = productsNotFoundRef.current;
    return mediaList.map((m) => {
      const ids = Array.isArray(m.product_ids) ? m.product_ids : [];
      const products = ids.map((id) => {
        const cached = cache.get(id);
        if (cached) return cached;
        if (notFound.has(id)) return { id, name: 'Produto indisponível', price: '', image: null, url: null };
        return { id, name: '', price: '', image: null, url: null, pending: true };
      });
      return { media: m as any, products };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewStory, stories, previewHydrateTick]);





  const loadGallery = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.
    from('media_gallery').
    select('*').
    eq('user_id', user.id).
    order('created_at', { ascending: false });
    setGallery(data ?? []);
  };

  const filteredGallery = (gallery ?? []).filter((m) =>
  !gallerySearch || m.name?.toLowerCase().includes(gallerySearch.toLowerCase())
  );

  const handleDeleteGalleryItem = async () => {
    if (!deleteGalleryConfirm || !supabase) return;
    await supabase.from('media_gallery').delete().eq('id', deleteGalleryConfirm.id);
    setGallery((gallery ?? []).filter((m) => m.id !== deleteGalleryConfirm.id));
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      next.delete(deleteGalleryConfirm.id);
      return next;
    });
    toast.success('Mídia removida da galeria');
    setDeleteGalleryConfirm(null);
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files?.length || !supabase || !user) return;
    setUploading(true);

    const { compressMedia } = await import('@/lib/mediaCompression');
    const { STORAGE_UPLOAD_OPTIONS } = await import('@/lib/mediaCompression');
    let uploaded = 0;
    for (const original of Array.from(files)) {
      const file = await compressMedia(original);
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';

      const { error } = await supabase.storage.from('media').upload(fileName, file, {
        ...STORAGE_UPLOAD_OPTIONS,
        contentType: file.type || undefined,
      });

      let publicUrl: string;
      if (error) {
        publicUrl = URL.createObjectURL(file);
      } else {
        const { data } = await supabase.storage.from('media').createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
        publicUrl = data?.signedUrl ?? URL.createObjectURL(file);
      }

      await supabase.from('media_gallery').insert({
        user_id: user.id,
        url: publicUrl,
        name: file.name,
        type: fileType,
        size: file.size
      });
      uploaded++;
    }

    await loadGallery();
    toast.success(`${uploaded} mídia(s) enviada(s)`);
    setUploading(false);
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
  };

  const toggleSelectMedia = (id: string) => {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleUseSelected = () => {
    const selected = (gallery ?? []).filter((m) => selectedMedia.has(m.id));
    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma mídia');
      return;
    }
    // Salvar no sessionStorage para usar na página de adicionar story
    sessionStorage.setItem('gallery_selected_media', JSON.stringify(selected));
    toast.success(`${selected.length} mídia(s) selecionada(s) para uso`);
    navigate(`/app/${appId}/story/novo`);
  };

  const filtered = (stories ?? []).filter((s) =>
  s.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm || !supabase) return;
    await supabase.from('stories').delete().eq('id', deleteConfirm.id);
    setStories((stories ?? []).filter((s) => s.id !== deleteConfirm.id));
    toast.success('Story removido');
    setDeleteConfirm(null);
  };

  const toggle = async (id: string, currentActive: boolean) => {
    if (!supabase) return;
    await supabase.from('stories').update({ active: !currentActive }).eq('id', id);
    setStories((stories ?? []).map((s) => s.id === id ? { ...s, active: !currentActive } : s));
  };

  const getCoverMedia = (story: StoryWithMedia) => {
    const coverMedia = story.story_media?.find((m) => m.is_cover);
    return coverMedia || story.story_media?.[0];
  };

  return (
    <>
      <TopBar title="Stories Vídeos" breadcrumb="Meus apps" backTo="/" />
      <main data-ev-id="ev_7d87e18d92" className="px-4 sm:px-6 md:px-10 py-6 md:py-8 fade-in">
        <Tabs value={tab} onValueChange={(v) => setSp({ tab: v }, { replace: true })}>
          <div className="mb-9 border-b border-neutral-200 overflow-x-auto scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0">
            <TabsList className="flex w-max md:w-full justify-start gap-7 bg-transparent p-0 rounded-none h-auto">
              {TABS.map((t) =>
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="whitespace-nowrap px-0 pb-3 pt-1 text-[14px] font-medium text-neutral-400 hover:text-neutral-700 data-[state=active]:text-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neutral-900 rounded-none transition-colors -mb-px">

                  {t.label}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="stories" className="mt-0">
            <div data-ev-id="ev_9dcaf4b253" className="flex items-center gap-8 mb-7">
              <div data-ev-id="ev_fb09193dea" className="flex items-center gap-2.5">
                <Switch
                  checked={widget}
                  onCheckedChange={(v) => {
                    setWidget(v);
                    if (v) setCarrossel(false);
                  }} />

                <label data-ev-id="ev_133161397a" className="text-[14px] font-medium text-neutral-700">Widget Flutuante</label>
              </div>
              <div data-ev-id="ev_3ae0f4ab79" className="flex items-center gap-2.5">
                <Switch
                  checked={carrossel}
                  onCheckedChange={(v) => {
                    setCarrossel(v);
                    if (v) setWidget(false);
                  }} />

                <label data-ev-id="ev_b1a9bdf95a" className="text-[14px] font-medium text-neutral-700">Carrossel</label>
              </div>
            </div>

            <div data-ev-id="ev_2fd29f67b4" className="flex items-center justify-between gap-4 mb-6">
              <div data-ev-id="ev_0fe03311cd" className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar stories…"
                  className="pl-9 h-10 rounded-xl border-neutral-200" />

              </div>
              <div data-ev-id="ev_aacd465337" className="flex items-center gap-2">
                <button data-ev-id="ev_e16aead214"
                onClick={() => setSp({ tab: 'aparencia' }, { replace: true })}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-neutral-700 border border-neutral-200 hover:bg-neutral-50 px-4 py-2.5 rounded-xl transition-colors">

                  <Settings2 className="w-4 h-4" /> Configurar Aparência
                </button>
                <button data-ev-id="ev_bb8693cae5"
                onClick={() => navigate(`/app/${appId}/story/novo`)}
                className="inline-flex items-center gap-2 text-[13.5px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2.5 rounded-xl transition-colors">

                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>

            {stories === null ?
            <StoriesRowsSkeleton count={3} /> :
            filtered.length === 0 ?
            <div data-ev-id="ev_0e5f3700fc" className="border border-dashed border-neutral-300 rounded-2xl p-16 text-center text-neutral-500">
                Nenhum story criado ainda. Clique em <b data-ev-id="ev_c59cb67033" className="text-neutral-700">Adicionar</b> para criar o primeiro.
              </div> :

            <div data-ev-id="ev_181ecf6313" className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                {filtered.map((s, idx) => {
                const cover = getCoverMedia(s);
                return (
                  <div data-ev-id="ev_890a4d11a6"
                  key={s.id}
                  className={`flex items-center gap-4 px-5 py-4 ${idx !== filtered.length - 1 ? 'border-b border-neutral-100' : ''}`}>

                      <button data-ev-id="ev_576596ca16"
                    onClick={() => openStoryPreview(s, cover?.id)}
                    className="w-14 shrink-0 cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden">
                        {cover?.url ?
                      <MediaThumbnail
                        src={cover.url}
                        type={cover.type as 'image' | 'video'}
                        alt=""
                        className="!aspect-[3/4]" /> :

                      s.thumbnail_url ?
                      <MediaThumbnail
                        src={s.thumbnail_url}
                        type="image"
                        alt=""
                        className="!aspect-[3/4]" /> :


                      <div data-ev-id="ev_3bf11a3ee9" className="aspect-[3/4] bg-neutral-100 flex items-center justify-center rounded-lg">
                            <Play className="w-5 h-5 fill-neutral-400 text-neutral-400" strokeWidth={0} />
                          </div>
                      }
                      </button>
                      <div data-ev-id="ev_0206b34d16" className="flex-1 min-w-0">
                        <h4 data-ev-id="ev_d89083d5c1" className="text-[14.5px] font-semibold text-neutral-900">{s.title}</h4>
                        <div data-ev-id="ev_da860a30b7" className="flex items-center gap-3 mt-1 text-[12.5px] text-neutral-500">
                          <span data-ev-id="ev_dfea8dace8" className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {s.views.toLocaleString('pt-BR')} visualizações
                          </span>
                          {s.format &&
                        <span data-ev-id="ev_6ead49d36b" className="uppercase tracking-wider font-semibold text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded">
                              {s.format}
                            </span>
                        }
                        </div>
                      </div>
                      <div data-ev-id="ev_fca2f254fd" className="flex items-center gap-2">
                        <Switch checked={s.active} onCheckedChange={() => toggle(s.id, s.active)} />
                        <button data-ev-id="ev_9655c4843b"
                      onClick={() => navigate(`/app/${appId}/story/${s.id}`)}
                      className="w-9 h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-700 transition-colors">

                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button data-ev-id="ev_14d30d046e"
                      onClick={() => setDeleteConfirm(s)}
                      className="w-9 h-9 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-700 transition-colors">

                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>);

              })}
              </div>
            }
          </TabsContent>

          <TabsContent value="midias" className="mt-0">
            <input data-ev-id="ev_56aac1f459"
            ref={galleryFileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleGalleryUpload(e.target.files)} />

            <div data-ev-id="ev_gallery_search" className="flex items-center justify-between gap-4 mb-7">
              <div data-ev-id="ev_4bfd811fc1" className="relative w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  value={gallerySearch}
                  onChange={(e) => setGallerySearch(e.target.value)}
                  placeholder="Buscar mídias..."
                  className="pl-9 h-10 rounded-xl border-neutral-200" />
              </div>
              <div data-ev-id="ev_1366fa46c3" className="flex items-center gap-3">
                {selectedMedia.size > 0 &&
                <>
                    <button data-ev-id="ev_138de5ca5c"
                  onClick={() => {setSelectedMedia(new Set());setIsSelectionMode(false);}}
                  className="h-10 px-4 text-neutral-700 text-[14px] font-medium rounded-xl hover:bg-neutral-100 transition-colors">
                      Cancelar
                    </button>
                    <button data-ev-id="ev_c646eb5960"
                  onClick={handleUseSelected}
                  className="h-10 px-4 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Usar {selectedMedia.size} selecionada(s)
                    </button>
                  </>
                }
                {selectedMedia.size === 0 &&
                <button data-ev-id="ev_c08cb7420b"
                onClick={() => setIsSelectionMode(!isSelectionMode)}
                className={`h-10 px-4 text-[14px] font-medium rounded-xl transition-colors flex items-center gap-2 ${
                isSelectionMode ?
                'bg-neutral-900 text-white' :
                'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`
                }>
                    <CheckSquare className="w-4 h-4" />
                    Selecionar
                  </button>
                }
                <button data-ev-id="ev_18e3e94375"
                onClick={() => galleryFileInputRef.current?.click()}
                disabled={uploading}
                className="h-10 px-4 bg-neutral-900 text-white text-[14px] font-medium rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Enviando...' : 'Upload'}
                </button>
              </div>
            </div>

            {gallery === null ?
            <StoriesRowsSkeleton count={3} /> :
            filteredGallery.length === 0 ?
            <div data-ev-id="ev_ec5530f8a9" className="bg-white border border-neutral-200 rounded-2xl p-16 text-center">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                <h3 data-ev-id="ev_bfc1070c2c" className="text-[16px] font-semibold text-neutral-900">Nenhuma mídia na galeria</h3>
                <p data-ev-id="ev_5bb3c63679" className="text-[14px] text-neutral-500 mt-1">
                  {gallerySearch ? 'Nenhuma mídia encontrada com esse termo.' : 'Faça upload de mídias ao criar stories para vê-las aqui.'}
                </p>
              </div> :

            <div data-ev-id="ev_967dd7be70" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredGallery.map((m) =>
              <GalleryCard
                twoTapPreview
                key={m.id}
                id={m.id}
                url={m.url}
                type={m.type as 'image' | 'video'}
                name={m.name || undefined}
                isSelected={selectedMedia.has(m.id)}
                isSelectionMode={isSelectionMode || selectedMedia.size > 0}
                showDelete={true}
                showName={true}
                onSelect={(id) => {
                  toggleSelectMedia(id);
                  if (!isSelectionMode) setIsSelectionMode(true);
                }}
                onDelete={(id) => {
                  const item = filteredGallery.find((g) => g.id === id);
                  if (item) setDeleteGalleryConfirm(item);
                }}
                onClick={(id) => {
                  const item = filteredGallery.find((g) => g.id === id);
                  if (item) setPreviewGallery(item);
                }} />

              )}
              </div>
            }
          </TabsContent>

          {TABS.filter((t) => !['stories','midias','integracao','aparencia','produtos'].includes(t.value)).map((t) =>
          <TabsContent key={t.value} value={t.value} className="mt-0">
              <PlaceholderTab label={t.label} />
            </TabsContent>
          )}

          <TabsContent value="produtos" className="mt-0">
            <ProdutosTab />
          </TabsContent>

          <TabsContent value="aparencia" className="mt-0">
            <AppearancePresets />
          </TabsContent>

          <TabsContent value="integracao" className="mt-0">
            <IntegracaoTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Excluir story"
        itemName={deleteConfirm?.title}
        onConfirm={handleDelete}
      />

      {/* Video Preview Dialog — Stories list (mesma lógica do modal da aba Aparência: playlist com todas as mídias do projeto) */}
      <MediaPreviewModal
        open={!!previewStory}
        onOpenChange={() => { setPreviewStory(null); setPreviewMeasure(null); }}
        playlist={previewPlaylist}
        startIndex={previewStartIndex}
        showMeasureIcon={!!previewMeasure}
        measureOpen={previewMeasureOpen}
        onMeasureClick={() => setPreviewMeasureOpen(true)}
      />


      <MeasureModelPreviewModal
        model={previewMeasureOpen ? previewMeasure : null}
        onClose={() => setPreviewMeasureOpen(false)}
      />


      {/* Gallery Preview Dialog */}
      <MediaPreviewModal
        open={!!previewGallery}
        onOpenChange={() => setPreviewGallery(null)}
        media={previewGallery}
      />

      {/* Delete Gallery Item Confirmation */}
      <ConfirmDeleteDialog
        open={!!deleteGalleryConfirm}
        onOpenChange={() => setDeleteGalleryConfirm(null)}
        title="Excluir mídia"
        itemName={deleteGalleryConfirm?.name || 'esta mídia'}
        onConfirm={handleDeleteGalleryItem}
      />
    </>);

}

function PlaceholderTab({ label }: {label: string;}) {
  return (
    <div data-ev-id="ev_8094199980" className="bg-white border border-neutral-200 rounded-2xl p-16 text-center fade-in">
      <h3 data-ev-id="ev_54989e0f8f" className="text-[16px] font-semibold text-neutral-900">{label}</h3>
      <p data-ev-id="ev_c38b3c7902" className="text-[14px] text-neutral-500 mt-1">Esta seção será personalizada para o seu fluxo.</p>
    </div>);

}

type ProductRow = {id: string;name: string;price: string;currency: string;url: string;image: string | null;};

// Module-level caches — keep data warm across remounts so the skeleton only
// shows on the very first load, matching the Stories tab behavior.
const productsCache = new Map<string, ProductRow[]>();
const measuresCache = new Map<string, MeasureModel[]>();

function ProdutosTab() {
  const { user } = useAuth();
  const [view, setView] = useState<'produtos' | 'medidas'>(() => {
    if (typeof window === 'undefined') return 'produtos';
    const saved = window.localStorage.getItem('storiesvideos:produtos-view');
    return saved === 'medidas' ? 'medidas' : 'produtos';
  });
  useEffect(() => {
    try { window.localStorage.setItem('storiesvideos:produtos-view', view); } catch {}
  }, [view]);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const initialProducts = user ? productsCache.get(user.id) : undefined;
  const initialMeasures = user ? measuresCache.get(user.id) : undefined;
  const [products, setProducts] = useState<ProductRow[]>(initialProducts ?? []);
  const [loading, setLoading] = useState(!initialProducts);
  const [saving, setSaving] = useState(false);
  const [measureOpen, setMeasureOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<MeasureModel | null>(null);
  const [measures, setMeasures] = useState<MeasureModel[]>(initialMeasures ?? []);
  const [measuresLoading, setMeasuresLoading] = useState(!initialMeasures);
  const [savingMeasure, setSavingMeasure] = useState(false);
  const [previewMeasure, setPreviewMeasure] = useState<MeasureModel | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductRow | null>(null);
  const [deleteMeasure, setDeleteMeasure] = useState<MeasureModel | null>(null);


  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (!measuresCache.has(user.id)) setMeasuresLoading(true);
      const { data: models, error } = await (supabase as any)
        .from('measure_models')
        .select('id,name,measure_rows(id,size_name,measure_type,value_cm,position)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error('Erro ao carregar medidas', { description: error.message });
      } else if (models) {
        const next: MeasureModel[] = (models as any[]).map((m) => ({
          id: m.id,
          name: m.name,
          rows: ((m.measure_rows ?? []) as any[])
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((r) => ({ id: r.id, tamanho: r.size_name, medida: r.measure_type as MeasureType, valor: String(r.value_cm) }))
        }));
        measuresCache.set(user.id, next);
        setMeasures(next);
      }
      setMeasuresLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const saveMeasureModel = async (model: Omit<MeasureModel, 'id'>) => {
    if (!user) return;
    setSavingMeasure(true);
    try {
      const modelId = editingMeasure?.id;
      let savedId = modelId;
      if (modelId) {
        const { error } = await (supabase as any).from('measure_models').update({ name: model.name }).eq('id', modelId);
        if (error) throw error;
        const { error: delErr } = await (supabase as any).from('measure_rows').delete().eq('model_id', modelId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await (supabase as any).from('measure_models').insert({ user_id: user.id, name: model.name }).select('id').single();
        if (error) throw error;
        savedId = data.id;
      }
      if (model.rows.length > 0) {
        const rows = model.rows.map((r, i) => ({
          model_id: savedId, user_id: user.id, size_name: r.tamanho, measure_type: r.medida, value_cm: Number(r.valor) || 0, position: i
        }));
        const { error: insErr } = await (supabase as any).from('measure_rows').insert(rows);
        if (insErr) throw insErr;
      }
      const fresh: MeasureModel = { id: savedId!, name: model.name, rows: model.rows.map((r) => ({ ...r, id: crypto.randomUUID() })) };
      setMeasures((arr) => modelId ? arr.map((m) => m.id === modelId ? fresh : m) : [fresh, ...arr]);
      toast.success(modelId ? 'Modelo atualizado' : 'Modelo adicionado');
      setMeasureOpen(false);
      setEditingMeasure(null);
    } catch (e: any) {
      toast.error('Erro ao salvar medidas', { description: e?.message });
    } finally {
      setSavingMeasure(false);
    }
  };

  const deleteMeasureModel = async (id: string) => {
    const prev = measures;
    setMeasures((arr) => arr.filter((x) => x.id !== id));
    const { error } = await (supabase as any).from('measure_models').delete().eq('id', id);
    if (error) {
      setMeasures(prev);
      toast.error('Erro ao remover modelo', { description: error.message });
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      if (!productsCache.has(user.id)) setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id,name,price,currency,url,image')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error('Erro ao carregar produtos', { description: error.message });
      } else if (data) {
        productsCache.set(user.id, data as any);
        setProducts(data as any);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Mirror state into module-level caches so re-mounts skip the skeleton.
  useEffect(() => { if (user && !loading) productsCache.set(user.id, products); }, [user, products, loading]);
  useEffect(() => { if (user && !measuresLoading) measuresCache.set(user.id, measures); }, [user, measures, measuresLoading]);

  const handleSave = async (p: {name: string;price: string;currency: string;url: string;image: string | null;}) => {
    if (!user) return;
    setSaving(true);
    if (editing) {
      const { data, error } = await supabase
        .from('products')
        .update(p)
        .eq('id', editing.id)
        .select('id,name,price,currency,url,image')
        .single();
      setSaving(false);
      if (error) {
        toast.error('Erro ao salvar produto', { description: error.message });
        return;
      }
      setProducts((arr) => arr.map((x) => x.id === editing.id ? (data as any) : x));
      setEditing(null);
      toast.success('Produto atualizado');
      return;
    }
    const { data, error } = await supabase
      .from('products')
      .insert({ user_id: user.id, ...p })
      .select('id,name,price,currency,url,image')
      .single();
    setSaving(false);
    if (error) {
      toast.error('Erro ao adicionar produto', { description: error.message });
      return;
    }
    setProducts((arr) => [data as any, ...arr]);
    setAddOpen(false);
    toast.success('Produto adicionado');
  };

  const handleDelete = async (id: string) => {
    const prev = products;
    setProducts((arr) => arr.filter((x) => x.id !== id));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setProducts(prev);
      toast.error('Erro ao remover produto', { description: error.message });
    }
  };

  const modalOpen = addOpen || editing !== null;
  const closeModal = () => { setAddOpen(false); setEditing(null); };

  return (
    <div className="fade-in">
      <div className="flex items-center justify-end gap-2 mb-6">
        <button
          onClick={() => setView((v) => v === 'medidas' ? 'produtos' : 'medidas')}
          className="inline-flex items-center gap-2 text-[13.5px] font-medium px-4 py-2.5 rounded-xl transition-colors border text-neutral-700 border-neutral-200 hover:bg-neutral-50">

          {view === 'medidas' ?
          <><Package className="w-4 h-4" /> Produtos</> :
          <><Settings2 className="w-4 h-4" /> Medidas</>
          }
        </button>
        <button
          onClick={() => {
            if (view === 'medidas') {
              setEditingMeasure(null);
              setMeasureOpen(true);
            } else {
              setAddOpen(true);
            }
          }}
          className="inline-flex items-center gap-2 text-[13.5px] font-medium px-4 py-2.5 rounded-xl transition-colors bg-neutral-900 text-white hover:bg-neutral-800">

          <Plus className="w-4 h-4" /> {view === 'medidas' ? 'Adicionar medidas' : 'Adicionar produtos'}
        </button>
      </div>

      {view === 'produtos' ?
      loading ?
      <StoriesRowsSkeleton count={3} /> :
      products.length === 0 ?
      <div className="border border-dashed border-neutral-300 rounded-2xl p-16 text-center text-neutral-500">
            Nenhum produto cadastrado. Clique em <b className="text-neutral-700">Adicionar produtos</b> para começar.
          </div> :

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {products.map((p, idx) =>
        <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${idx !== products.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                <div className="w-12 h-12 shrink-0 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                  {p.image ?
            <img src={p.image} alt="" className="w-full h-full object-cover" /> :

            <Package className="w-5 h-5 text-neutral-400" />
            }
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[14.5px] font-semibold text-neutral-900 truncate">{p.name}</h4>
                  {p.url &&
            <p className="text-[12.5px] text-neutral-500 truncate mt-0.5">{p.url}</p>
            }
                </div>
                <div className="text-[14px] font-semibold text-neutral-900 whitespace-nowrap">
                  {p.currency === 'BRL' ? 'R$' : p.currency} {p.price}
                </div>
                <button
            onClick={() => setEditing(p)}
            aria-label="Editar produto"
            className="w-9 h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-700 transition-colors">

                  <Edit2 className="w-4 h-4" />
                </button>
                <button
            onClick={() => setDeleteProduct(p)}
            aria-label="Remover produto"
            className="w-9 h-9 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-700 transition-colors">

                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
        )}
          </div> :


      measuresLoading ?
      <StoriesRowsSkeleton count={3} /> :
      measures.length === 0 ?
      <div className="border border-dashed border-neutral-300 rounded-2xl p-16 text-center text-neutral-500">
            Nenhum modelo de medidas. Clique em <b className="text-neutral-700">Adicionar medidas</b> para começar.
          </div> :
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            {measures.map((m, idx) =>
        <div key={m.id} className={`flex items-center gap-4 px-5 py-4 ${idx !== measures.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                <button
                  type="button"
                  onClick={() => setPreviewMeasure(m)}
                  aria-label={`Visualizar ${m.name}`}
                  className="w-12 h-12 shrink-0 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center hover:bg-neutral-200 hover:border-neutral-300 transition-colors">
                  <Settings2 className="w-5 h-5 text-neutral-500" />
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewMeasure(m)}
                  className="flex-1 min-w-0 text-left">
                  <h4 className="text-[14.5px] font-semibold text-neutral-900 truncate hover:underline underline-offset-2 decoration-neutral-300">{m.name}</h4>
                  <p className="text-[12.5px] text-neutral-500 truncate mt-0.5">
                    {m.rows.length} {m.rows.length === 1 ? 'linha' : 'linhas'}
                  </p>
                </button>

                <button
            onClick={() => { setEditingMeasure(m); setMeasureOpen(true); }}
            aria-label="Editar modelo"
            className="w-9 h-9 rounded-lg hover:bg-neutral-100 flex items-center justify-center text-neutral-700 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
            onClick={() => setDeleteMeasure(m)}
            aria-label="Remover modelo"
            className="w-9 h-9 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-700 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
        )}
          </div>
      }

      <AddProductModal
        open={modalOpen}
        editing={editing}
        onClose={closeModal}
        saving={saving}
        onSave={handleSave} />

      <AddMeasureModelModal
        open={measureOpen}
        editing={editingMeasure}
        saving={savingMeasure}
        onClose={() => { setMeasureOpen(false); setEditingMeasure(null); }}
        onSave={saveMeasureModel} />

      <MeasureModelPreviewModal
        model={previewMeasure}
        onClose={() => setPreviewMeasure(null)} />

      <ConfirmDeleteDialog
        open={!!deleteProduct}
        onOpenChange={() => setDeleteProduct(null)}
        title="Excluir produto"
        itemName={deleteProduct?.name}
        onConfirm={async () => {
          if (deleteProduct) {
            await handleDelete(deleteProduct.id);
            setDeleteProduct(null);
          }
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteMeasure}
        onOpenChange={() => setDeleteMeasure(null)}
        title="Excluir modelo de medidas"
        itemName={deleteMeasure?.name}
        onConfirm={async () => {
          if (deleteMeasure) {
            await deleteMeasureModel(deleteMeasure.id);
            setDeleteMeasure(null);
          }
        }}
      />

    </div>);


}


export function AddProductModal({
  open,
  editing,
  onClose,
  onSave,
  saving
}: {open: boolean;editing?: ProductRow | null;onClose: () => void;onSave: (p: {name: string;price: string;currency: string;url: string;image: string | null;}) => void;saving?: boolean;}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{name?: string;price?: string;url?: string;}>({});
  const [touched, setTouched] = useState<{name?: boolean;price?: boolean;url?: boolean;}>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setName('');setPrice('');setCurrency('BRL');setUrl('');setImage(null);
      setErrors({});setTouched({});
      return;
    }
    if (editing) {
      setName(editing.name);
      setPrice(editing.price);
      setCurrency(editing.currency);
      setUrl(editing.url);
      setImage(editing.image);
    } else {
      setName('');setPrice('');setCurrency('BRL');setUrl('');setImage(null);
    }
    setErrors({});setTouched({});
    // Foco inicial no nome
    // Foco automático removido a pedido — evita teclado abrir no mobile e scroll inesperado
    
  }, [open, editing]);

  const handlePickImage = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Arquivo inválido', { description: 'Selecione uma imagem.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande', { description: 'Limite de 5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const validate = (fields: { name: string; price: string; url: string }) => {
    const next: {name?: string;price?: string;url?: string;} = {};
    if (!fields.name.trim()) next.name = 'Informe o nome do produto.';
    else if (fields.name.trim().length > 120) next.name = 'Máximo de 120 caracteres.';
    if (!fields.price.trim()) next.price = 'Informe o preço.';
    else {
      const normalized = fields.price.replace(',', '.');
      const n = Number(normalized);
      if (!isFinite(n) || n <= 0) next.price = 'Preço inválido.';
    }
    if (fields.url.trim()) {
      try {
        const u = new URL(fields.url.trim());
        if (!/^https?:$/.test(u.protocol)) next.url = 'URL deve começar com http(s)://';
      } catch {
        next.url = 'URL inválida.';
      }
    }
    return next;
  };

  const isEdit = !!editing;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const next = validate({ name, price, url });
    setErrors(next);
    setTouched({ name: true, price: true, url: true });
    if (Object.keys(next).length > 0) return;
    onSave({ name: name.trim(), price: price.trim(), currency, url: url.trim(), image });
  };

  const onBlur = (field: 'name' | 'price' | 'url') => {
    setTouched((t) => ({ ...t, [field]: true }));
    setErrors(validate({ name, price, url }));
  };

  const showErr = (field: 'name' | 'price' | 'url') => touched[field] && errors[field];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full max-w-2xl mx-auto my-auto p-0 overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 pt-5">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Editar produto' : 'Adicionar produto manualmente'}</DialogTitle>
              <DialogDescription>
                {isEdit ? 'Atualize as informações do produto.' : 'Cadastre as informações principais do produto.'}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Imagem */}
              <div className="relative shrink-0">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePickImage(e.target.files?.[0])} />

                <div className="w-24 h-24 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
                  {image ?
                  <img src={image} alt="" className="w-full h-full object-cover" /> :
                  <Package className="w-8 h-8 text-neutral-400" strokeWidth={1.5} />
                  }
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 flex items-center gap-1">
                  {image &&
                  <button
                    onClick={() => setImage(null)}
                    type="button"
                    aria-label="Remover imagem"
                    className="w-7 h-7 rounded-full bg-white border border-neutral-200 shadow-sm hover:bg-red-50 hover:text-red-600 text-neutral-700 flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  }
                  <button
                    onClick={() => fileRef.current?.click()}
                    type="button"
                    aria-label="Editar imagem"
                    className="w-7 h-7 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm flex items-center justify-center transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Campos */}
              <div className="flex-1 w-full space-y-3">
                <div>
                  <Input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => { setName(e.target.value); if (touched.name) setErrors((p) => ({ ...p, name: undefined })); }}
                    onBlur={() => onBlur('name')}
                    placeholder="Nome do produto"
                    aria-invalid={!!showErr('name')}
                    aria-describedby={showErr('name') ? 'product-name-error' : undefined}
                    className={`h-11 rounded-xl ${showErr('name') ? 'border-red-400 focus-visible:ring-red-200' : 'border-neutral-200'}`} />
                  {showErr('name') && <p id="product-name-error" className="text-[12px] text-red-600 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <Input
                      value={price}
                      onChange={(e) => { setPrice(e.target.value.replace(/[^\d.,]/g, '')); if (touched.price) setErrors((p) => ({ ...p, price: undefined })); }}
                      onBlur={() => onBlur('price')}
                      placeholder="Preço"
                      inputMode="decimal"
                      aria-invalid={!!showErr('price')}
                      aria-describedby={showErr('price') ? 'product-price-error' : undefined}
                      className={`h-11 rounded-xl ${showErr('price') ? 'border-red-400 focus-visible:ring-red-200' : 'border-neutral-200'}`} />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      aria-label="Moeda"
                      className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-[14px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10">
                      <option value="BRL">Reais</option>
                      <option value="USD">Dólar</option>
                      <option value="EUR">Euro</option>
                    </select>
                  </div>
                  {showErr('price') && <p id="product-price-error" className="text-[12px] text-red-600 mt-1">{errors.price}</p>}
                </div>

                <div>
                  <Input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); if (touched.url) setErrors((p) => ({ ...p, url: undefined })); }}
                    onBlur={() => onBlur('url')}
                    placeholder="URL do produto (opcional)"
                    inputMode="url"
                    aria-invalid={!!showErr('url')}
                    aria-describedby={showErr('url') ? 'product-url-error' : undefined}
                    className={`h-11 rounded-xl ${showErr('url') ? 'border-red-400 focus-visible:ring-red-200' : 'border-neutral-200'}`} />
                  {showErr('url') && <p id="product-url-error" className="text-[12px] text-red-600 mt-1">{errors.url}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 text-[13.5px] font-medium text-neutral-700 rounded-xl hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-save inline-flex items-center gap-2 h-10 px-4 text-[13.5px] font-medium rounded-xl">

              {saving ?
                <Loader2 className="w-4 h-4 animate-spin" /> :
                isEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar produto'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

}


function AddMeasureModelModal({
  open,
  editing,
  onClose,
  onSave,
  saving = false
}: {open: boolean;editing?: MeasureModel | null;onClose: () => void;onSave: (m: Omit<MeasureModel, 'id'>) => void;saving?: boolean;}) {
  const [name, setName] = useState('');
  const [sizeUsed, setSizeUsed] = useState('');
  const [rows, setRows] = useState<MeasureRow[]>([]);
  const [touched, setTouched] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const isEdit = !!editing;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      const firstSize = (editing.rows.find((r) => (r.tamanho || '').trim())?.tamanho || '').trim();
      setSizeUsed(firstSize);
      setRows(editing.rows.map((r) => ({ ...r })));
    } else {
      setName('');
      setSizeUsed('');
      setRows([{ id: crypto.randomUUID(), tamanho: '', medida: 'Busto', valor: '' }]);
    }
    setTouched(false);
    // Foco automático removido a pedido — evita teclado abrir no mobile e scroll inesperado
  }, [open, editing]);

  const addRow = () => setRows((r) => [...r, { id: crypto.randomUUID(), tamanho: '', medida: 'Busto', valor: '' }]);
  const removeRow = (id: string) => setRows((r) => r.filter((x) => x.id !== id));
  const updateRow = (id: string, patch: Partial<MeasureRow>) =>
    setRows((r) => r.map((x) => x.id === id ? { ...x, ...patch } : x));

  const trimmedName = name.trim();
  const trimmedSize = sizeUsed.trim();
  const validRows = rows.filter((r) => r.valor.trim()).map((r) => ({ ...r, tamanho: trimmedSize }));
  const nameError = !trimmedName ? 'Informe o nome do modelo' : trimmedName.length > 80 ? 'Máximo 80 caracteres' : '';
  const sizeError = !trimmedSize ? 'Informe o tamanho que a modelo usa' : '';
  const rowsError = validRows.length === 0 ? 'Adicione pelo menos uma medida com valor' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || sizeError || rowsError) return;
    onSave({ name: trimmedName, rows: validRows });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="w-full max-w-[min(100%,42rem)] sm:max-w-2xl mx-auto my-auto p-0 overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">

        <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
          <div className="px-4 sm:px-6 pt-5 shrink-0">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Editar modelo' : 'Adicionar modelo'}</DialogTitle>
              <DialogDescription>
                Defina os tamanhos e as medidas que compõem este modelo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-4 sm:px-6 py-4 space-y-5 overflow-y-auto flex-1 min-h-0">
            <div>
              <label className="text-[12.5px] font-medium text-neutral-600 mb-1.5 block">Nome do Modelo</label>
              <Input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Medidas Milena"
                aria-invalid={touched && !!nameError}
                className={`h-11 rounded-xl ${touched && nameError ? 'border-red-400 focus-visible:ring-red-200' : 'border-neutral-200'}`} />
              {touched && nameError && <p className="text-[12px] text-red-600 mt-1">{nameError}</p>}
            </div>

            <div>
              <label className="text-[12.5px] font-medium text-neutral-600 mb-1.5 block">Tamanho que a modelo usa</label>
              <Input
                value={sizeUsed}
                onChange={(e) => setSizeUsed(e.target.value)}
                placeholder="Ex.: P, M, G, 38, 40"
                aria-invalid={touched && !!sizeError}
                className={`h-11 rounded-xl ${touched && sizeError ? 'border-red-400 focus-visible:ring-red-200' : 'border-neutral-200'}`} />
              <p className="text-[11.5px] text-neutral-500 mt-1">Preenchido apenas uma vez e reutilizado em toda a tabela de medidas.</p>
              {touched && sizeError && <p className="text-[12px] text-red-600 mt-1">{sizeError}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 gap-2">
                <label className="text-[12.5px] font-medium text-neutral-600">Tabela de Medidas</label>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Adicionar linha
                </button>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_36px] gap-2 px-3 py-2 bg-neutral-50 text-[11.5px] font-medium text-neutral-500 uppercase tracking-wide">
                  <div>Medida</div>
                  <div>Valor (cm)</div>
                  <div />
                </div>
                <div className="divide-y divide-neutral-100">
                  {rows.map((r) =>
                  <div key={r.id} className="p-2 sm:p-2">
                      {/* Mobile: stacked card with labels */}
                      <div className="sm:hidden flex flex-col gap-2 p-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_96px_36px] gap-2 items-end">
                          <div className="min-w-0">
                            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide block mb-1">Medida</label>
                            <select
                              value={r.medida}
                              onChange={(e) => updateRow(r.id, { medida: e.target.value as MeasureType })}
                              aria-label="Medida"
                              className="w-full h-10 rounded-lg border border-neutral-200 bg-white px-2 text-[13px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-w-0">
                              {MEASURE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <div className="min-w-0">
                            <label className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide block mb-1">Valor (cm)</label>
                            <Input
                              value={r.valor}
                              onChange={(e) => updateRow(r.id, { valor: e.target.value.replace(/[^\d.,]/g, '') })}
                              placeholder="0"
                              inputMode="decimal"
                              className="h-10 rounded-lg border-neutral-200 min-w-0 px-2 text-center" />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRow(r.id)}
                            aria-label="Remover linha"
                            className="w-9 h-10 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-500 transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop: table-style grid */}
                      <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_110px_36px] gap-2">
                        <select
                          value={r.medida}
                          onChange={(e) => updateRow(r.id, { medida: e.target.value as MeasureType })}
                          aria-label="Medida"
                          className="h-10 rounded-lg border border-neutral-200 bg-white px-2 text-[13.5px] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-w-0">
                          {MEASURE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <Input
                          value={r.valor}
                          onChange={(e) => updateRow(r.id, { valor: e.target.value.replace(/[^\d.,]/g, '') })}
                          placeholder="0"
                          inputMode="decimal"
                          className="h-10 rounded-lg border-neutral-200 min-w-0 px-2" />
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          aria-label="Remover linha"
                          className="w-9 h-10 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-500 transition-colors justify-self-end shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  {rows.length === 0 &&
                  <div className="px-3 py-6 text-center text-[13px] text-neutral-500">
                      Nenhuma linha. Clique em <b className="text-neutral-700">Adicionar linha</b>.
                    </div>
                  }
                </div>
              </div>

              {touched && rowsError && <p className="text-[12px] text-red-600 mt-1">{rowsError}</p>}
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-100 flex items-center justify-end gap-2 shrink-0 bg-white">

            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-[13.5px] font-medium text-neutral-700 rounded-xl hover:bg-neutral-100 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-save inline-flex items-center gap-2 h-10 px-4 text-[13.5px] font-medium rounded-xl">
              {isEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Adicionar modelo'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>);

}


// MeasurePreviewModal extraído para src/components/storievideos/MeasurePreviewModal.tsx




