import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import TopBar from '@/components/layout/TopBar';

import MediaPreviewModal from '@/components/storievideos/MediaPreviewModal';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import GalleryModal from '@/components/storievideos/GalleryModal';
import MobileUploadModal from '@/components/storievideos/MobileUploadModal';
import ProductLinkModal, { type ProductLinkSelection } from '@/components/storievideos/ProductLinkModal';
import { AddProductModal } from '@/pages/StoriesVideosApp';
import { MediaThumbnail } from '@/components/ui/MediaThumbnail';
import type { Tables } from '@/integrations/supabase/helpers';
import {
  Upload,
  Smartphone,
  Instagram,
  Image as ImageIcon,
  HelpCircle,
  Star,
  Link as LinkIcon,
  Trash2,
  Plus,
  X,
  Play,
  Pencil,
  ShoppingBag,
  Check } from
'lucide-react';

interface Media {
  id?: string;
  url: string;
  type: 'video' | 'image';
  name: string;
  cover?: boolean;
  file?: File;
}

interface UrlEntry {
  value: string;
  type: string;
  ignore_params: boolean;
}

export default function AdicionarStory() {
  const { appId, storyId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isEdit = storyId && storyId !== 'novo';

  const titleRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const urlRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const stateKey = `story_form:${appId}:${storyId || 'novo'}`;

  const [loading, setLoading] = useState(isEdit);
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('widget');
  const [scroll, setScroll] = useState('vertical');
  const [presets, setPresets] = useState<Tables<'appearance_presets'>[]>([]);
  const [presetsLoaded, setPresetsLoaded] = useState(false);
  // 'default' = aparência padrão do sistema. Caso contrário guarda o preset.id.
  const [aparencia, setAparencia] = useState<string>('default');
  const [active, setActive] = useState(true);
  const [cta, setCta] = useState('');
  const [media, setMedia] = useState<Media[]>([]);
  const [urls, setUrls] = useState<UrlEntry[]>([{ value: '', type: 'contem', ignore_params: false }]);
  const [errors, setErrors] = useState<{title?: boolean;media?: boolean;url?: boolean;}>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<Media | null>(null);
  const [productLinkOpenFor, setProductLinkOpenFor] = useState<string | null>(null);
  const [productLinks, setProductLinks] = useState<Record<string, ProductLinkSelection>>({});
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [productRefreshNonce, setProductRefreshNonce] = useState(0);
  const [autoSelectProductId, setAutoSelectProductId] = useState<string | null>(null);
  // Prefetch para hidratação imediata dos modais — evita skeleton/flash ao abrir.
  const [galleryPrefetch, setGalleryPrefetch] = useState<Tables<'media_gallery'>[] | null>(null);
  const [productsPrefetch, setProductsPrefetch] = useState<{ id: string; name: string; price: string; currency: string; url: string; image: string | null }[]>([]);
  const [measuresPrefetch, setMeasuresPrefetch] = useState<{ id: string; name: string }[]>([]);

  // Carrega galeria, produtos e modelos de medida silenciosamente assim que
  // a página monta (e quando produtos são criados via AddProductModal).
  useEffect(() => {
    if (!supabase || !user) return;
    let cancel = false;
    (async () => {
      const [g, p, m] = await Promise.all([
        supabase.from('media_gallery').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('products').select('id,name,price,currency,url,image').eq('user_id', user.id).order('created_at', { ascending: false }),
        (supabase as any).from('measure_models').select('id,name').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (cancel) return;
      setGalleryPrefetch((g.data as any) ?? []);
      setProductsPrefetch(((p.data as any) ?? []) as typeof productsPrefetch);
      setMeasuresPrefetch(((m.data as any) ?? []) as typeof measuresPrefetch);
    })();
    return () => { cancel = true; };
  }, [user, productRefreshNonce]);

  useEffect(() => {
    // Restaura estado quando retornamos do editor de aparência
    const selectedFromUrl = searchParams.get('selectedPreset');
    let restored = false;
    if (selectedFromUrl) {
      try {
        const raw = sessionStorage.getItem(stateKey);
        if (raw) {
          const s = JSON.parse(raw);
          setTitle(s.title ?? '');
          setFormat(s.format ?? 'widget');
          setScroll(s.scroll ?? 'vertical');
          setActive(s.active ?? true);
          setCta(s.cta ?? '');
          if (Array.isArray(s.media)) setMedia(s.media);
          if (Array.isArray(s.urls) && s.urls.length) setUrls(s.urls);
          restored = true;
        }
      } catch (err) {
        console.error('Erro ao restaurar formulário do story:', err);
      }
      setAparencia(selectedFromUrl);
      sessionStorage.removeItem(stateKey);
      // limpa o search param para não re-restaurar em navegações futuras
      const next = new URLSearchParams(searchParams);
      next.delete('selectedPreset');
      setSearchParams(next, { replace: true });
    }

    if (isEdit && !restored) {
      loadStory();
    } else if (!isEdit && !restored) {
      // Carregar mídias selecionadas da galeria (se houver)
      const savedMedia = sessionStorage.getItem('gallery_selected_media');
      if (savedMedia) {
        try {
          const parsed = JSON.parse(savedMedia);
          const mediaItems: Media[] = parsed.map((m: { id: string; url: string; type: string; name?: string }, idx: number) => ({
            id: m.id,
            url: m.url,
            type: m.type as 'video' | 'image',
            name: m.name || 'Mídia',
            cover: idx === 0 // Primeira mídia é a capa
          }));
          if (mediaItems.length > 0) {
            setMedia(mediaItems);
            toast.success(`${mediaItems.length} mídia(s) carregada(s) da galeria`);
          }
        } catch (e) {
          console.error('Erro ao carregar mídias da galeria:', e);
        }
        sessionStorage.removeItem('gallery_selected_media');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, storyId]);

  // Carrega aparências cadastradas do usuário
  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from('appearance_presets')
        .select('*')
        .eq('user_id', user.id)
        .eq('kind', 'floating')
        .order('created_at', { ascending: true });
      if (cancel) return;
      if (error) console.error('[AdicionarStory] erro ao carregar presets:', error);
      setPresets(data ?? []);
      setPresetsLoaded(true);
    })();
    return () => { cancel = true; };
  }, [user]);

  // Resolve aparência (id válido / nome legado → id) assim que presets e story estiverem prontos.
  // Loga inconsistências para diagnóstico.
  useEffect(() => {
    if (!presetsLoaded) return;
    if (isEdit && loading) return; // aguarda loadStory para não "piscar" outro nome
    setAparencia((current) => {
      if (!current || current === 'default') {
        return presets[0]?.id ?? 'default';
      }
      if (presets.some((p) => p.id === current)) return current;
      const byName = presets.find((p) => p.name === current);
      if (byName) {
        console.info(`[AdicionarStory] aparência legado mapeada por nome → id: "${current}" → ${byName.id}`);
        return byName.id;
      }
      console.warn(
        `[AdicionarStory] aparência "${current}" não encontrada entre ${presets.length} presets carregados. Usando fallback.`,
        { current, presetIds: presets.map((p) => p.id), presetNames: presets.map((p) => p.name) }
      );
      return presets[0]?.id ?? 'default';
    });
  }, [presetsLoaded, presets, isEdit, loading]);

  // Fase de hidratação do <Select>: só renderizamos o valor depois de presets e story prontos.
  const aparenciaHydrated = presetsLoaded && (!isEdit || !loading);
  const aparenciaValue = aparenciaHydrated
    ? (presets.some((p) => p.id === aparencia) ? aparencia : (presets[0]?.id ?? 'default'))
    : undefined;



  const loadStory = async () => {
    if (!supabase || !storyId) return;
    const { data: story } = await supabase.
    from('stories').
    select('*, story_media(*)').
    eq('id', storyId).
    single();

    if (story) {
      setTitle(story.title);
      setFormat(story.format);
      setScroll(story.scroll);
      setAparencia(story.aparencia);
      setActive(story.active);
      setCta(story.cta || '');
      setUrls((story.urls as unknown as UrlEntry[])?.length ? (story.urls as unknown as UrlEntry[]) : [{ value: '', type: 'contem', ignore_params: false }]);

      const storyMedia = (story as { story_media?: Array<{ id: string; url: string; type: string; name?: string; is_cover?: boolean; product_ids?: string[]; measure_id?: string | null; products_layout?: string }> }).story_media || [];
      setMedia(storyMedia.map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type as 'video' | 'image',
        name: m.name || '',
        cover: m.is_cover
      })));
      // Hidrata productLinks usando o id da mídia como chave (mesma chave usada na UI quando m.id existe)
      const links: Record<string, ProductLinkSelection> = {};
      for (const m of storyMedia) {
        const pids = m.product_ids ?? [];
        const mid = m.measure_id ?? null;
        if (pids.length > 0 || mid) {
          links[m.id] = {
            layout: (m.products_layout === 'lista' ? 'lista' : 'carrossel') as ProductLinkSelection['layout'],
            productIds: pids,
            measureId: mid,
          };
        }
      }
      setProductLinks(links);
    }
    setLoading(false);
  };

  const goToAppearance = (target: 'new' | string) => {
    // Persiste o formulário atual para restaurar ao voltar do editor de aparência.
    try {
      const snapshot = {
        title,
        format,
        scroll,
        active,
        cta,
        urls,
        // Não persistimos arquivos pendentes (File objects não serializam).
        media: media
          .filter((m) => !m.file)
          .map((m) => ({ id: m.id, url: m.url, type: m.type, name: m.name, cover: m.cover })),
      };
      sessionStorage.setItem(stateKey, JSON.stringify(snapshot));
    } catch (err) {
      console.error('Erro ao salvar estado do story:', err);
    }
    const returnTo = `/app/${appId}/story/${storyId || 'novo'}`;
    const url = `/app/${appId}/aparencia/${target}?kind=floating&returnTo=${encodeURIComponent(returnTo)}`;
    navigate(url);
  };

  const addUrl = () => setUrls([...urls, { value: '', type: 'contem', ignore_params: false }]);
  const removeUrl = (i: number) => setUrls(urls.filter((_, x) => x !== i));
  const updateUrl = (i: number, k: keyof UrlEntry, v: string | boolean) =>
  setUrls(urls.map((u, x) => x === i ? { ...u, [k]: v } : u));

  const onFilesPicked = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);

    const newItems: Media[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const url = URL.createObjectURL(file);
      newItems.push({
        url,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        cover: media.length === 0 && newItems.length === 0,
        file
      });

      if (!title.trim() && newItems.length === 1) {
        const baseName = file.name.replace(/\.[^.]+$/, '');
        if (baseName) setTitle(baseName);
      }
    }

    setMedia([...media, ...newItems]);
    toast.success(`${newItems.length} mídia(s) adicionada(s)`);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const setCover = (idx: number) => setMedia(media.map((m, i) => ({ ...m, cover: i === idx })));

  const copyLink = (m: Media) => {
    const textarea = document.createElement('textarea');
    textarea.value = m.url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    toast.success('Link copiado');
  };

  const removeMedia = (idx: number) => {
    const next = media.filter((_, i) => i !== idx);
    if (next.length && !next.some((m) => m.cover)) next[0].cover = true;
    setMedia(next);
  };

  const uploadFile = async (original: File): Promise<{ url: string; name: string; type: 'image' | 'video'; size: number }> => {
    if (!supabase || !user) throw new Error('Not authenticated');

    const { compressMedia, STORAGE_UPLOAD_OPTIONS } = await import('@/lib/mediaCompression');
    const file = await compressMedia(original);

    const ext = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const fileType = file.type.startsWith('video/') ? 'video' : 'image';

    const { error } = await supabase.storage.
    from('media').
    upload(fileName, file, { ...STORAGE_UPLOAD_OPTIONS, contentType: file.type || undefined });

    let publicUrl: string;
    if (error) {
      console.warn('Storage upload failed, using local URL');
      publicUrl = URL.createObjectURL(file);
    } else {
      const { data } = await supabase.storage.
      from('media').
      createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);
      publicUrl = data?.signedUrl ?? URL.createObjectURL(file);
    }

    // Salvar na galeria
    await supabase.from('media_gallery').insert({
      user_id: user.id,
      url: publicUrl,
      name: file.name,
      type: fileType,
      size: file.size
    });

    return { url: publicUrl, name: file.name, type: fileType, size: file.size };
  };


  const onGallerySelect = (items: Tables<'media_gallery'>[]) => {
    const isFirstMedia = media.length === 0;
    const newMedia: Media[] = items.map((item, idx) => ({
      id: item.id,
      url: item.url,
      type: item.type as 'image' | 'video',
      name: item.name || 'Mídia',
      cover: isFirstMedia && idx === 0 // Primeira mídia é a capa
    }));
    setMedia([...media, ...newMedia]);
    if (newMedia.length > 0) {
      toast.success(`${newMedia.length} mídia(s) adicionada(s) da galeria`);
    }
  };

  const handleSave = async () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = true;
    if (media.length === 0) e.media = true;
    if (!urls[0]?.value?.trim()) e.url = true;
    setErrors(e);

    if (e.title) {
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (e.media) {
      mediaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (e.url) {
      urlRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!supabase || !user) {
      toast.error('Não autenticado');
      return;
    }

    setSaving(true);
    try {
      // Upload new files
      const uploadedMedia: Media[] = [];
      for (const m of media) {
        if (m.file) {
          const result = await uploadFile(m.file);
          uploadedMedia.push({ ...m, url: result.url });
        } else {
          uploadedMedia.push(m);
        }
      }

      const coverMedia = uploadedMedia.find((m) => m.cover);
      const storyData = {
        user_id: user.id,
        app_id: appId!,
        title,
        format,
        scroll,
        aparencia,
        active,
        cta: cta || null,
        urls: urls as unknown as Tables<'stories'>['urls'],
        thumbnail_url: coverMedia?.url || uploadedMedia[0]?.url || null
      };

      let storyIdToUse = storyId;

      if (isEdit) {
        await supabase.from('stories').update(storyData).eq('id', storyId);
        // Delete old media
        await supabase.from('story_media').delete().eq('story_id', storyId);
      } else {
        const { data: newStory } = await supabase.
        from('stories').
        insert(storyData).
        select().
        single();
        storyIdToUse = newStory?.id;
      }

      // Insert media (preservando vínculos de produtos/medidas por mídia)
      if (storyIdToUse && uploadedMedia.length > 0) {
        const mediaInserts = uploadedMedia.map((m, idx) => {
          const original = media[idx];
          const linkKey = original?.id ?? original?.url ?? String(idx);
          const link = productLinks[linkKey];
          return {
            story_id: storyIdToUse!,
            user_id: user.id,
            url: m.url,
            type: m.type,
            name: m.name,
            is_cover: m.cover,
            position: idx,
            product_ids: link?.productIds ?? [],
            measure_id: link?.measureId ?? null,
            products_layout: link?.layout ?? 'carrossel',
          };
        });
        await supabase.from('story_media').insert(mediaInserts);
      }

      toast.success(isEdit ? 'Story atualizado' : 'Story criado');
      navigate(`/app/${appId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title={isEdit ? 'Editar story vídeo' : 'Adicionar story vídeo'} breadcrumb="Stories Vídeos" backTo={`/app/${appId}`} hideProfile />
        <main data-ev-id="ev_740a9eb6ea" className="px-10 py-8 max-w-3xl">
          <div data-ev-id="ev_c6785f02b2" className="text-neutral-500 text-sm">Carregando…</div>
        </main>
      </>);

  }

  return (
    <>
      <TopBar
        title={isEdit ? 'Editar story vídeo' : 'Adicionar story vídeo'}
        breadcrumb="Stories Vídeos"
        backTo={`/app/${appId}`}
        hideProfile
        rightSlot={
          <button data-ev-id="ev_a2555c56e3"
            onClick={handleSave}
            disabled={saving}
            className="btn-save text-[14px] font-medium px-5 py-2.5 rounded-xl">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        } />


      <main data-ev-id="ev_c3223a2163" className="px-10 py-8 fade-in max-w-3xl flex flex-col gap-6">
        {/* Title */}
        <section data-ev-id="ev_237c8f5135" ref={titleRef} className="bg-white border border-neutral-200 rounded-2xl p-6">
          <Label>Título {errors.title && <span data-ev-id="ev_780e53983f" className="text-red-600 ml-1">(obrigatório)</span>}</Label>
          <Input
            value={title}
            onChange={(e) => {setTitle(e.target.value);setErrors({ ...errors, title: false });}}
            placeholder="Ex: Coleção Verão 2025"
            className={`h-11 rounded-xl ${errors.title ? 'border-red-400' : 'border-neutral-200'}`} />

        </section>

        {/* Format & Scroll */}
        <section data-ev-id="ev_47cacbb20f" className="bg-white border border-neutral-200 rounded-2xl p-6 grid grid-cols-2 gap-6">
          <div data-ev-id="ev_1d2feed891">
            <Label>Formato</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="widget">Widget Flutuante</SelectItem>
                <SelectItem value="carrossel">Carrossel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div data-ev-id="ev_6d186ad48b">
            <Label>Rolagem</Label>
            <Select value={scroll} onValueChange={setScroll}>
              <SelectTrigger className="h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Aparência */}
        <section data-ev-id="ev_a7a2036985" className="bg-white border border-neutral-200 rounded-2xl p-6">
          <Label>Aparência</Label>
          <div data-ev-id="ev_90d3e83fe4" className="flex items-center gap-3">
            <div data-ev-id="ev_c7cecbe96d" className="flex-1">
              {!aparenciaHydrated ? (
                <div className="w-full h-11 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center px-3 text-sm text-neutral-400">
                  Carregando...
                </div>
              ) : (
                <Select value={aparenciaValue} onValueChange={setAparencia}>
                  <SelectTrigger className="w-full h-11 rounded-xl border-neutral-200">
                    <SelectValue placeholder="Selecionar aparência">
                      {(() => {
                        if (!aparenciaValue) return null;
                        if (aparenciaValue === 'default') return 'Padrão';
                        const found = presets.find((p) => p.id === aparenciaValue);
                        return found ? found.name : 'Selecionar aparência';
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {presets.length === 0 && (
                      <SelectItem value="default">Padrão</SelectItem>
                    )}
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}


            </div>
            <button data-ev-id="ev_593c0a615b"
              type="button"
              onClick={() => goToAppearance('new')}
              title="Criar nova aparência"
              className="w-11 h-11 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors shrink-0">
              <Plus className="w-4 h-4" strokeWidth={2.25} />
            </button>
            <button data-ev-id="ev_52dc55b214"
              type="button"
              onClick={() => {
                if (aparencia === 'default' || !aparencia) {
                  toast.message('Selecione uma aparência cadastrada para editar.');
                  return;
                }
                goToAppearance(aparencia);
              }}
              disabled={aparencia === 'default' || !aparencia}
              title="Editar aparência selecionada"
              className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center hover:bg-amber-200 transition-colors shrink-0 ring-1 ring-amber-200 disabled:opacity-50 disabled:cursor-not-allowed">
              <Pencil className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </section>

        {/* Active */}
        <section data-ev-id="ev_f4393884f3" className="bg-white border border-neutral-200 rounded-2xl p-6 flex items-center justify-between">
          <div data-ev-id="ev_866f8e0a82">
            <Label className="mb-1">Story ativo</Label>
            <p data-ev-id="ev_08ea2f52c7" className="text-[13px] text-neutral-500">Quando desativado, o story não aparece na vitrine.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </section>

        {/* CTA */}
        <section data-ev-id="ev_c78989d31c" className="bg-white border border-neutral-200 rounded-2xl p-6">
          <Label>Chamada para ação</Label>
          <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Ex: Comprar agora" className="h-11 rounded-xl border-neutral-200" />
        </section>

        {/* Media sources */}
        <section data-ev-id="ev_b6c4913619" ref={mediaRef} className="bg-white border border-neutral-200 rounded-2xl p-6">
          <div data-ev-id="ev_6d4c73a4ef" className="flex items-center justify-between mb-4">
            <div data-ev-id="ev_9e083c6b96" className="flex items-center gap-2">
              <Label className="mb-0">Fontes de mídia</Label>
              <button data-ev-id="ev_94acf278c8" onClick={() => setHelpOpen(true)} className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 transition-colors flex items-center justify-center">
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            {errors.media && <span data-ev-id="ev_a834dc904f" className="text-[12.5px] text-red-600 font-medium">(obrigatório)</span>}
          </div>

          <input data-ev-id="ev_3cc84bd808" ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => onFilesPicked(e.target.files)} />

          <div data-ev-id="ev_246ce81d69" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <SourceBtn icon={Upload} label={uploading ? 'Enviando…' : 'Upload'} onClick={() => fileInputRef.current?.click()} disabled={uploading} />
            <SourceBtn icon={Smartphone} label="Pelo celular" onClick={() => setMobileOpen(true)} />
            <SourceBtn icon={Instagram} label="Instagram" onClick={() => toast.message('Conecte sua conta', { description: 'Integração com Instagram em breve.' })} />
            <SourceBtn icon={ImageIcon} label="Galeria" onClick={() => setGalleryOpen(true)} />
          </div>

          {media.length > 0 &&
          <div data-ev-id="ev_c7b9fad983" className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {media.map((m, idx) => {
                const key = m.id ?? m.url ?? String(idx);
                return (
                  <MediaSourceCard
                    key={idx}
                    media={m}
                    hasLink={!!productLinks[key] && (productLinks[key].productIds.length > 0 || !!productLinks[key].measureId)}
                    onPreview={() => setPreviewMedia(m)}
                    onRemove={() => removeMedia(idx)}
                    onSetCover={() => setCover(idx)}
                    onCopyLink={() => copyLink(m)}
                    onOpenProduct={() => setProductLinkOpenFor(key)}
                  />
                );
              })}
            </div>
          }
        </section>

        {/* URL section */}
        <section data-ev-id="ev_69ad58bce2" ref={urlRef} className="bg-white border border-neutral-200 rounded-2xl p-6">
          <div data-ev-id="ev_ac8b000e89" className="flex items-center justify-between mb-4">
            <Label className="mb-0">Onde o story irá aparecer {errors.url && <span data-ev-id="ev_aee037cde5" className="text-red-600 ml-1">(obrigatório)</span>}</Label>
            <button data-ev-id="ev_6cd598d867" onClick={addUrl} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-neutral-700 border border-neutral-200 hover:bg-neutral-50 px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Adicionar página
            </button>
          </div>
          <div data-ev-id="ev_4d8dfe00a4" className="flex flex-col gap-3">
            {urls.map((u, i) =>
            <div data-ev-id="ev_e31026d446" key={i} className="flex items-center gap-2">
                <Select value={u.type} onValueChange={(v) => updateUrl(i, 'type', v)}>
                  <SelectTrigger className="w-[140px] h-11 rounded-xl border-neutral-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contem">Contém</SelectItem>
                    <SelectItem value="exato">Exato</SelectItem>
                    <SelectItem value="todas">Todas as páginas</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                value={u.value}
                onChange={(e) => {updateUrl(i, 'value', e.target.value);setErrors({ ...errors, url: false });}}
                placeholder="/colecao-verao"
                className={`flex-1 h-11 rounded-xl ${i === 0 && errors.url ? 'border-red-400' : 'border-neutral-200'}`} />

                {urls.length > 1 &&
              <button data-ev-id="ev_2937638018" onClick={() => removeUrl(i)} className="w-11 h-11 rounded-xl hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-neutral-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
              }
              </div>
            )}
          </div>
        </section>

      </main>


      {/* Help modal */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Como funcionam as fontes de mídia</DialogTitle></DialogHeader>
          <div data-ev-id="ev_1a0b09910e" className="text-[14px] text-neutral-600 flex flex-col gap-3 px-6 pb-6">
            <p data-ev-id="ev_43793024fa"><b data-ev-id="ev_d2e2625374">Upload</b>: envie arquivos diretamente do seu computador.</p>
            <p data-ev-id="ev_035d15b77e"><b data-ev-id="ev_71f0d63053">Pelo celular</b>: gere um QR Code e envie mídias do seu celular.</p>
            <p data-ev-id="ev_d271c5cf8c"><b data-ev-id="ev_17895cca9f">Instagram</b>: importe vídeos diretamente do seu Instagram.</p>
            <p data-ev-id="ev_6285413592"><b data-ev-id="ev_6a922c0443">Galeria</b>: selecione mídias enviadas anteriormente.</p>
          </div>
        </DialogContent>
      </Dialog>

      <MobileUploadModal
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        appId={appId}
        onFilesUploaded={async (files) => {
          // Detectar tipo incluindo HEVC
          const getFileType = (mimeType: string, fileName: string): 'video' | 'image' => {
            if (mimeType.startsWith('video/') || 
                mimeType === 'video/hevc' || 
                mimeType === 'video/x-hevc' ||
                fileName.toLowerCase().endsWith('.hevc') ||
                fileName.toLowerCase().endsWith('.mov')) {
              return 'video';
            }
            return 'image';
          };

          const isFirstMedia = media.length === 0;
          const newMedia: Media[] = files.map((f, idx) => ({
            url: f.file_url,
            type: getFileType(f.mime_type, f.file_name),
            name: f.file_name,
            cover: isFirstMedia && idx === 0 // Primeira mídia é a capa
          }));
          setMedia([...media, ...newMedia]);
          
          // Salvar arquivos na galeria
          if (supabase && user) {
            for (const f of files) {
              const fileType = getFileType(f.mime_type, f.file_name);
              await supabase.from('media_gallery').insert({
                user_id: user.id,
                url: f.file_url,
                name: f.file_name,
                type: fileType,
                size: f.size
              });
            }
          }
          
          if (newMedia.length > 0 && !title.trim()) {
            const baseName = newMedia[0].name.replace(/\.[^.]+$/, '');
            if (baseName) setTitle(baseName);
          }
          toast.success(`${files.length} arquivo(s) recebido(s) do celular`);
        }}
      />

      {/* Gallery Modal */}
      <GalleryModal
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        onSelect={onGallerySelect}
        prefetched={galleryPrefetch}
      />

      {/* Video Preview */}
      <MediaPreviewModal
        open={!!previewMedia}
        onOpenChange={() => setPreviewMedia(null)}
        media={previewMedia}
      />

      {/* Product link modal */}
      <ProductLinkModal
        open={!!productLinkOpenFor}
        onOpenChange={(o) => { if (!o) setProductLinkOpenFor(null); }}
        initial={productLinkOpenFor ? productLinks[productLinkOpenFor] ?? null : null}
        onSave={(sel) => {
          if (!productLinkOpenFor) return;
          setProductLinks((prev) => ({ ...prev, [productLinkOpenFor]: sel }));
          toast.success('Vínculo salvo');
        }}
        onCreateProduct={() => setAddProductOpen(true)}
        refreshNonce={productRefreshNonce}
        autoSelectProductId={autoSelectProductId}
        onAutoSelectHandled={() => setAutoSelectProductId(null)}
        prefetchedProducts={productsPrefetch}
        prefetchedMeasures={measuresPrefetch}
      />


      {/* Cadastro rápido de produto a partir do modal da sacola */}
      <AddProductModal
        open={addProductOpen}
        saving={savingNewProduct}
        onClose={() => { if (!savingNewProduct) setAddProductOpen(false); }}
        onSave={async (p) => {
          if (!user || !supabase) return;
          setSavingNewProduct(true);
          try {
            const { data, error } = await supabase
              .from('products')
              .insert({ user_id: user.id, ...p })
              .select('id')
              .single();
            if (error) throw error;
            const newId = (data as any)?.id as string;
            setAddProductOpen(false);
            // Mantém o modal da sacola aberto (já estava) e dispara recarga + auto-seleção
            setAutoSelectProductId(newId);
            setProductRefreshNonce((n) => n + 1);
            toast.success('Produto cadastrado e selecionado');
          } catch (err: any) {
            console.error(err);
            toast.error('Erro ao salvar produto', { description: err?.message });
          } finally {
            setSavingNewProduct(false);
          }
        }}
      />

    </>);

}

function Label({ children, className = '' }: {children: React.ReactNode;className?: string;}) {
  return <label data-ev-id="ev_f24dfb35a4" className={`text-[14px] font-medium text-neutral-800 block mb-2 ${className}`}>{children}</label>;
}

function SourceBtn({ icon: Icon, label, onClick, disabled }: {icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;label: string;onClick: () => void;disabled?: boolean;}) {
  return (
    <button data-ev-id="ev_83083fc808" disabled={disabled} onClick={onClick} className="flex flex-col items-center gap-2 p-4 border border-neutral-200 rounded-xl hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50 transition-all">
      <Icon className="w-5 h-5 text-neutral-700" />
      <span data-ev-id="ev_3aed55be0f" className="text-[13px] font-medium text-neutral-700">{label}</span>
    </button>);

}

/**
 * Card de mídia da seção "Fontes de mídia".
 * - Desktop: hover mostra ações; clique abre preview.
 * - Touch: 1º toque ativa o card (mostra ações + badge), 2º toque no centro abre o preview.
 *   Botões de ação (capa, link, produto, remover) executam ação direta no toque, sem abrir preview.
 */
function MediaSourceCard({
  media: m,
  hasLink,
  onPreview,
  onRemove,
  onSetCover,
  onCopyLink,
  onOpenProduct,
}: {
  media: Media;
  hasLink?: boolean;
  onPreview: () => void;
  onRemove: () => void;
  onSetCover: () => void;
  onCopyLink: () => void;
  onOpenProduct: () => void;
}) {
  const [isActive, setIsActive] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const touchStartTime = useRef(0);
  const hasMoved = useRef(false);

  const handleTouchStart = () => {
    setIsTouch(true);
    touchStartTime.current = Date.now();
    hasMoved.current = false;
  };
  const handleTouchMove = () => { hasMoved.current = true; };
  const handleCenterTouchEnd = (e: React.TouchEvent) => {
    const dur = Date.now() - touchStartTime.current;
    if (dur >= 500 || hasMoved.current) return;
    e.preventDefault();
    if (!isActive) {
      setIsActive(true);
    } else {
      onPreview();
      setIsActive(false);
    }
  };
  const handleCenterClick = () => {
    if (isTouch) return; // já tratado pelo touchEnd
    onPreview();
  };

  return (
    <div
      data-ev-id="ev_c9a7f5e6f2"
      className="group relative rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onMouseEnter={() => !isTouch && setIsActive(true)}
      onMouseLeave={() => !isTouch && setIsActive(false)}
    >
      <button
        data-ev-id="ev_853fae407d"
        type="button"
        onClick={handleCenterClick}
        onTouchEnd={handleCenterTouchEnd}
        className="w-full"
      >
        <MediaThumbnail src={m.url} type={m.type} alt={m.name} isActive={isActive} />
      </button>
      {m.cover && (
        <span data-ev-id="ev_0787ea46c4" className="absolute top-2 left-2 text-[10px] font-semibold tracking-wider uppercase bg-amber-300 text-neutral-900 px-2 py-0.5 rounded pointer-events-none z-10">Capa</span>
      )}
      <button
        data-ev-id="ev_6336cb8a7e"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
        title="Remover"
        className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white hover:bg-red-600 flex items-center justify-center transition-all z-20 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div
        data-ev-id="ev_da978dc95b"
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-2 bg-gradient-to-t from-black/70 to-transparent transition-opacity z-20 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <button
          data-ev-id="ev_adbed9c64e"
          onClick={(e) => { e.stopPropagation(); onSetCover(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onSetCover(); }}
          title="Definir capa"
          className={`w-7 h-7 rounded-full flex items-center justify-center ${m.cover ? 'bg-amber-400 text-white hover:bg-amber-500' : 'bg-white/95 text-neutral-900 hover:bg-white'}`}
        >
          <Star className="w-3.5 h-3.5" fill={m.cover ? 'currentColor' : 'none'} />
        </button>
        <CopyLinkButton onCopy={onCopyLink} />

        <button
          data-ev-id="ev_product_tag"
          onClick={(e) => { e.stopPropagation(); onOpenProduct(); }}
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); onOpenProduct(); }}
          title="Vincular produto"
          className={`w-7 h-7 rounded-full flex items-center justify-center ${hasLink ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-white/95 text-neutral-900 hover:bg-white'}`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Botão de copiar link com feedback visual:
 * troca o ícone de link por um check verde com leve scale por ~1.2s.
 */
function CopyLinkButton({ onCopy }: { onCopy: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = () => {
    onCopy();
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      data-ev-id="ev_94069b0704"
      type="button"
      onClick={(e) => { e.stopPropagation(); trigger(); }}
      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); trigger(); }}
      title="Copiar link"
      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
        copied
          ? 'bg-green-500 text-white scale-110'
          : 'bg-white/95 text-neutral-900 hover:bg-white'
      }`}
    >
      {copied ? (
        <Check key="check" className="w-3.5 h-3.5 animate-scale-in" strokeWidth={3} />
      ) : (
        <LinkIcon key="link" className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
