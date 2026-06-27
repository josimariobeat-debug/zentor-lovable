import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import TopBar from '@/components/layout/TopBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton, StoriesRowsSkeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import type { Tables } from '@/integrations/supabase/helpers';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import { GalleryCard } from '@/components/ui/GalleryCard';
import IntegracaoTab from '@/components/storievideos/IntegracaoTab';
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
  CheckSquare } from
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
{ value: 'medidas', label: 'Medidas' },
{ value: 'comentarios', label: 'Comentários' },
{ value: 'config', label: 'Configurações' },
{ value: 'integracao', label: 'Integração' }];


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function StoriesVideosApp() {
  const navigate = useNavigate();
  const { appId } = useParams();
  const { user } = useAuth();
  const [stories, setStories] = useState<StoryWithMedia[] | null>(null);
  const [search, setSearch] = useState('');
  const [widget, setWidget] = useState(true);
  const [carrossel, setCarrossel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<StoryWithMedia | null>(null);
  const [previewMedia, setPreviewMedia] = useState<StoryMedia | null>(null);
  const [gallery, setGallery] = useState<GalleryMedia[] | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [previewGallery, setPreviewGallery] = useState<GalleryMedia | null>(null);
  const [deleteGalleryConfirm, setDeleteGalleryConfirm] = useState<GalleryMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  const loadStories = async () => {
    if (!supabase || !appId || !UUID_RE.test(appId)) return;
    const { data } = await supabase.
    from('stories').
    select('*, story_media(*)').
    eq('app_id', appId).
    order('created_at', { ascending: false });
    setStories(data as StoryWithMedia[] ?? []);
  };


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
    let uploaded = 0;
    for (const original of Array.from(files)) {
      const file = await compressMedia(original);
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const fileType = file.type.startsWith('video/') ? 'video' : 'image';

      const { error } = await supabase.storage.from('media').upload(fileName, file);

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
      <main data-ev-id="ev_7d87e18d92" className="px-10 py-8 fade-in">
        <Tabs defaultValue="stories">
          <TabsList className="flex w-full justify-start gap-7 bg-transparent p-0 mb-9 border-b border-neutral-200 rounded-none h-auto">
            {TABS.map((t) =>
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="px-0 pb-3 pt-1 text-[14px] font-medium text-neutral-400 hover:text-neutral-700 data-[state=active]:text-neutral-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-neutral-900 rounded-none transition-colors -mb-px">

                {t.label}
              </TabsTrigger>
            )}
          </TabsList>

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
                onClick={() =>
                toast.message('Configurar Aparência', {
                  description: 'Em breve você editará cores e formato do widget.'
                })
                }
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
                    onClick={() => cover && setPreviewMedia(cover)}
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
            <div data-ev-id="ev_af4f6489b7" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
              </div> :
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

          {TABS.filter((t) => t.value !== 'stories' && t.value !== 'midias' && t.value !== 'integracao').map((t) =>
          <TabsContent key={t.value} value={t.value} className="mt-0">
              <PlaceholderTab label={t.label} />
            </TabsContent>
          )}

          <TabsContent value="integracao" className="mt-0">
            <IntegracaoTab />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir story</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o story "{deleteConfirm?.title}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button data-ev-id="ev_8215792ab1"
            onClick={() => setDeleteConfirm(null)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">

              Cancelar
            </button>
            <button data-ev-id="ev_f2d9160305"
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">

              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-[420px] p-0 bg-black border-0 overflow-hidden rounded-2xl">
          <div data-ev-id="ev_a7cd132234" className="relative w-full aspect-[9/16] bg-black">
            {previewMedia?.type === 'video' ?
            <video data-ev-id="ev_e9abd6ad83"
            src={previewMedia.url}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-contain" /> :

            previewMedia?.url ?
            <img data-ev-id="ev_d7b673daca" src={previewMedia.url} alt="" className="w-full h-full object-contain" /> :
            null}
          </div>
          <div data-ev-id="ev_83659dbbef" className="px-4 py-3 bg-black text-white">
            <div data-ev-id="ev_5dad3f1db3" className="text-[13.5px] font-medium truncate">{previewMedia?.name || 'Pré-visualização'}</div>
            <div data-ev-id="ev_4e410c78e8" className="text-[11.5px] text-neutral-400 mt-0.5">
              {previewMedia?.type === 'video' ? 'Vídeo' : 'Imagem'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Preview Dialog */}
      <Dialog open={!!previewGallery} onOpenChange={() => setPreviewGallery(null)}>
        <DialogContent className="max-w-[420px] p-0 bg-black border-0 overflow-hidden rounded-2xl">
          <div data-ev-id="ev_564496ae68" className="relative w-full aspect-[9/16] bg-black">
            {previewGallery?.type === 'video' ?
            <video data-ev-id="ev_f3378e6326"
            src={previewGallery.url}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-contain" /> :

            previewGallery?.url ?
            <img data-ev-id="ev_40dbf89a33" src={previewGallery.url} alt="" className="w-full h-full object-contain" /> :
            null}
          </div>
          <div data-ev-id="ev_8d21464669" className="px-4 py-3 bg-black text-white">
            <div data-ev-id="ev_9989bd8e36" className="text-[13.5px] font-medium truncate">{previewGallery?.name || 'Pré-visualização'}</div>
            <div data-ev-id="ev_bb8fc08ac5" className="text-[11.5px] text-neutral-400 mt-0.5">
              {previewGallery?.type === 'video' ? 'Vídeo' : 'Imagem'}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Gallery Item Confirmation */}
      <Dialog open={!!deleteGalleryConfirm} onOpenChange={() => setDeleteGalleryConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir mídia</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir "{deleteGalleryConfirm?.name || 'esta mídia'}" da galeria? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button data-ev-id="ev_aa7d6d9c42"
            onClick={() => setDeleteGalleryConfirm(null)}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">

              Cancelar
            </button>
            <button data-ev-id="ev_994e8cf1c4"
            onClick={handleDeleteGalleryItem}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">

              Excluir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

}

function PlaceholderTab({ label }: {label: string;}) {
  return (
    <div data-ev-id="ev_8094199980" className="bg-white border border-neutral-200 rounded-2xl p-16 text-center fade-in">
      <h3 data-ev-id="ev_54989e0f8f" className="text-[16px] font-semibold text-neutral-900">{label}</h3>
      <p data-ev-id="ev_c38b3c7902" className="text-[14px] text-neutral-500 mt-1">Esta seção será personalizada para o seu fluxo.</p>
    </div>);

}