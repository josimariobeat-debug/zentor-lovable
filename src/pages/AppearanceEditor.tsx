import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, Monitor, Pause, Play, Send, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Switch } from '@/components/ui/switch';
import previewVideoAsset from '@/assets/widget-preview.mp4.asset.json';

const PREVIEW_VIDEO_URL = previewVideoAsset.url;

interface DemoStory {
  type: 'video' | 'image';
  src: string;
  product: { title: string; price: string; thumb: string };
  duration?: number; // seconds, used for images
}

const DEMO_STORIES: DemoStory[] = [
  {
    type: 'video',
    src: PREVIEW_VIDEO_URL,
    product: { title: 'Vestido floral verão', price: 'R$ 159,90', thumb: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop' },
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=720&h=1280&fit=crop',
    product: { title: 'Promoção relâmpago -30%', price: 'R$ 79,90', thumb: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=120&h=120&fit=crop' },
    duration: 5,
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=720&h=1280&fit=crop',
    product: { title: 'Lookbook outono', price: 'R$ 229,00', thumb: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=120&h=120&fit=crop' },
    duration: 5,
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=720&h=1280&fit=crop',
    product: { title: 'Tênis casual branco', price: 'R$ 349,90', thumb: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop' },
    duration: 5,
  },
  {
    type: 'image',
    src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=720&h=1280&fit=crop',
    product: { title: 'Camiseta básica algodão', price: 'R$ 59,90', thumb: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=120&h=120&fit=crop' },
    duration: 5,
  },
];

function StoryViewer({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1 for current story
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const accumRef = useRef<number>(0);

  // TikTok-style action column state
  const [liked, setLiked] = useState<Record<number, boolean>>({});
  const [likeBurst, setLikeBurst] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = DEMO_STORIES[idx];
  const isVideo = current.type === 'video';
  const isLiked = !!liked[idx];

  const interactionPaused = paused || commentsOpen || shareOpen;

  const goNext = () => {
    setIdx((i) => (i + 1 < DEMO_STORIES.length ? i + 1 : 0));
  };
  const goPrev = () => {
    setIdx((i) => (i - 1 >= 0 ? i - 1 : DEMO_STORIES.length - 1));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) { setShareOpen(false); return; }
        if (commentsOpen) { setCommentsOpen(false); return; }
        onClose();
      }
      if (commentsOpen || shareOpen) return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, commentsOpen, shareOpen]);

  // Track when current image finishes loading so the bar starts in sync.
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset progress and timers whenever the active story changes
  useEffect(() => {
    setProgress(0);
    accumRef.current = 0;
    startedAtRef.current = 0;
    setImgLoaded(false);
  }, [idx]);

  // Progress driver — single rAF loop for both images and videos.
  // Images: time-based with pause accumulation.
  // Videos: read currentTime/duration each frame for perfect sync.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;

      if (isVideo) {
        const v = videoRef.current;
        if (v && v.duration > 0 && !Number.isNaN(v.duration)) {
          setProgress(Math.min(1, v.currentTime / v.duration));
        }
        raf = requestAnimationFrame(tick);
        rafRef.current = raf;
        return;
      }

      // Image: don't start until the image has actually loaded.
      if (!imgLoaded) {
        raf = requestAnimationFrame(tick);
        rafRef.current = raf;
        return;
      }

      if (interactionPaused) {
        // Freeze: keep last accum, reset start anchor so resume continues from here.
        startedAtRef.current = 0;
        raf = requestAnimationFrame(tick);
        rafRef.current = raf;
        return;
      }

      if (startedAtRef.current === 0) startedAtRef.current = now;
      const duration = (current.duration ?? 5) * 1000;
      const elapsed = accumRef.current + (now - startedAtRef.current);
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        // Lock to full and advance once.
        accumRef.current = duration;
        goNext();
        return;
      }
      raf = requestAnimationFrame(tick);
      rafRef.current = raf;
    };

    raf = requestAnimationFrame(tick);
    rafRef.current = raf;
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [idx, isVideo, interactionPaused, imgLoaded, current.duration]);

  // When pausing an image story, fold elapsed time into accum so resume continues.
  useEffect(() => {
    if (isVideo) return;
    if (interactionPaused && startedAtRef.current !== 0) {
      accumRef.current = accumRef.current + (performance.now() - startedAtRef.current);
      startedAtRef.current = 0;
    }
  }, [interactionPaused, isVideo]);

  // Video lifecycle: autoplay + ended handling. Progress is driven by rAF above.
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
    const onEnd = () => goNext();
    v.addEventListener('ended', onEnd);
    const p = v.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        // Autoplay with sound may be blocked — fall back to muted and retry.
        if (!v.muted) {
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        }
      });
    }
    return () => {
      v.removeEventListener('ended', onEnd);
    };
  }, [idx, isVideo, muted]);


  // Pause/resume on toggle (including comments/share overlays)
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current; if (!v) return;
    if (interactionPaused) v.pause(); else v.play().catch(() => {});
  }, [interactionPaused, isVideo, idx]);

  function togglePlay() {
    setPaused((p) => {
      if (!isVideo) {
        if (p) {
          startedAtRef.current = performance.now();
        } else {
          accumRef.current = accumRef.current + (performance.now() - startedAtRef.current);
        }
      }
      return !p;
    });
  }
  function toggleMute() {
    setMuted((m) => !m);
    const v = videoRef.current; if (v) v.muted = !v.muted;
  }

  function toggleLike() {
    setLiked((prev) => ({ ...prev, [idx]: !prev[idx] }));
    if (!isLiked) {
      setLikeBurst(true);
      window.setTimeout(() => setLikeBurst(false), 600);
    }
  }

  async function handleShare() {
    const shareData = {
      title: current.product.title,
      text: `Confira: ${current.product.title}`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      try { await nav.share(shareData); return; } catch { /* user cancelled — fall through */ }
    }
    setShareOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] grid place-items-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative"
        style={{
          aspectRatio: '9 / 16',
          height: 'min(92dvh, calc((100vw - 24px) * 16 / 9))',
          maxHeight: '92dvh',
          width: 'auto',
          maxWidth: 'min(92vw, 420px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* progress bars (one segment per story) */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-30">
          {DEMO_STORIES.map((_, i) => {
            const fill = i < idx ? 1 : i === idx ? progress : 0;
            return (
              <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full w-full bg-white rounded-full origin-left"
                  style={{
                    transform: `scaleX(${fill})`,
                    willChange: 'transform',
                  }}
                />
              </div>
            );
          })}
        </div>
        {/* top controls */}
        <div className="absolute top-7 right-3 z-30 flex items-center gap-2">
          <button onClick={togglePlay} aria-label={paused ? 'Reproduzir' : 'Pausar'} className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white grid place-items-center transition-colors">
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white grid place-items-center transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white grid place-items-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '9 / 16' }}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={`v-${idx}`}
              src={current.src}
              autoPlay
              muted={muted}
              playsInline
              preload="auto"
              disableRemotePlayback
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <img
              key={`i-${idx}`}
              src={current.src}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgLoaded(true)}
            />
          )}

          {/* Instagram-style tap zones for prev/next.
              Right side stops before the action column (≈64px) so taps on icons aren't hijacked. */}
          <button
            aria-label="Anterior"
            onClick={goPrev}
            className="absolute left-0 top-12 bottom-24 w-1/3 z-10 cursor-default"
          />
          <button
            aria-label="Próximo"
            onClick={goNext}
            className="absolute top-12 bottom-24 z-10 cursor-default"
            style={{ left: '33.333%', right: 64 }}
          />

          {/* TikTok-style right action column — vertically centered, white icons */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2"
            style={{
              right: 'max(2px, env(safe-area-inset-right))',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <button
              onClick={toggleLike}
              aria-label={isLiked ? 'Descurtir' : 'Curtir'}
              aria-pressed={isLiked}
              className="group flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center text-white transition-transform active:scale-90 hover:scale-110"
            >
              <span className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm grid place-items-center group-hover:bg-black/50 transition-colors">
                <Heart
                  className={`w-5 h-5 transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-white'} ${likeBurst ? 'animate-[heartPulse_.6s_ease-out]' : ''}`}
                  fill={isLiked ? 'currentColor' : 'none'}
                  strokeWidth={2}
                />
              </span>
            </button>
            <button
              onClick={() => setCommentsOpen(true)}
              aria-label="Comentar"
              className="group flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center text-white transition-transform active:scale-90 hover:scale-110"
            >
              <span className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm grid place-items-center group-hover:bg-black/50 transition-colors">
                <MessageCircle className="w-5 h-5" strokeWidth={2} />
              </span>
            </button>
            <button
              onClick={handleShare}
              aria-label="Compartilhar"
              className="group flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center text-white transition-transform active:scale-90 hover:scale-110"
            >
              <span className="w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm grid place-items-center group-hover:bg-black/50 transition-colors">
                <Send className="w-[18px] h-[18px] -rotate-12" strokeWidth={2} />
              </span>
            </button>
          </div>


          {/* Heart burst on double-like (centered) */}
          {likeBurst && (
            <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
              <Heart className="w-28 h-28 text-white drop-shadow-2xl animate-[heartPulse_.6s_ease-out]" fill="currentColor" />
            </div>
          )}

          {/* product card — preserved exactly in original position/layout */}
          <div className="absolute left-3 right-3 bottom-3 z-20 bg-white rounded-xl shadow-lg p-2 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
              <img src={current.product.thumb} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-neutral-900 truncate">{current.product.title}</div>
              <div className="text-[13px] font-bold text-neutral-900">{current.product.price}</div>
            </div>
          </div>
          <div className="absolute bottom-1 right-2 text-[10px] font-bold text-white/80 tracking-wider z-20">PLANWEB</div>

          {/* Comments panel — bottom sheet inside the player frame */}
          {commentsOpen && (
            <div
              className="absolute inset-0 z-40 flex flex-col justify-end"
              onClick={() => setCommentsOpen(false)}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative bg-white rounded-t-2xl max-h-[70%] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-neutral-100">
                  <div className="w-10 h-1 rounded-full bg-neutral-300 mx-auto absolute left-1/2 -translate-x-1/2 top-1.5" />
                  <h3 className="text-sm font-semibold text-neutral-900 mt-2">Comentários</h3>
                  <button onClick={() => setCommentsOpen(false)} aria-label="Fechar comentários" className="w-8 h-8 rounded-full hover:bg-neutral-100 grid place-items-center text-neutral-600 mt-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-neutral-500 grid place-items-center">
                  Nenhum comentário ainda. Seja o primeiro!
                </div>
                <div className="border-t border-neutral-100 p-3 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Adicione um comentário..."
                    className="flex-1 h-10 px-3 rounded-full bg-neutral-100 text-sm outline-none focus:bg-neutral-50 focus:ring-2 focus:ring-neutral-900/10"
                  />
                  <button className="h-10 px-4 rounded-full bg-neutral-900 text-white text-sm font-semibold">Enviar</button>
                </div>
              </div>
            </div>
          )}

          {/* Share fallback modal */}
          {shareOpen && (
            <div
              className="absolute inset-0 z-40 grid place-items-end sm:place-items-center"
              onClick={() => setShareOpen(false)}
            >
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="relative w-full sm:w-[88%] bg-white rounded-t-2xl sm:rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-900">Compartilhar</h3>
                  <button onClick={() => setShareOpen(false)} aria-label="Fechar" className="w-8 h-8 rounded-full hover:bg-neutral-100 grid place-items-center text-neutral-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={copyLink}
                  className="w-full h-11 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-sm font-medium text-neutral-900 transition-colors"
                >
                  {copied ? 'Link copiado!' : 'Copiar link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes heartPulse {
          0% { transform: scale(0.6); opacity: 0; }
          40% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function PreviewMedia({ fit }: { fit: MediaFit }) {
  return (
    <video
      src={PREVIEW_VIDEO_URL}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: fit,
        borderRadius: 'inherit',
        pointerEvents: 'none',
      }}
    />
  );
}

type Kind = 'floating' | 'carousel';
type Shape = 'circular' | 'quadrado' | 'personalizado';
type Position = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
type Unit = 'px' | '%';
type BorderStyle = 'pulsar' | 'solido' | 'tracejado' | 'nenhum';
type MediaFit = 'cover' | 'contain';

interface Config {
  useAllDevices: boolean;
  shape: Shape;
  width: number;
  widthUnit: Unit;
  height: number;
  borderRadius: number;
  position: Position;
  spacingBottom: number;
  spacingLeft: number;
  cta: string;
  ctaSize: number;
  borderStyle: BorderStyle;
  ctaDuration: number;
  color: string;
  hideStories: boolean;
  draggable: boolean;
  allowClose: boolean;
  mediaFit: MediaFit;
  zIndex: number;
}

const DEFAULT_CONFIG: Config = {
  useAllDevices: true,
  shape: 'circular',
  width: 100,
  widthUnit: 'px',
  height: 100,
  borderRadius: 100,
  position: 'bottom-left',
  spacingBottom: 20,
  spacingLeft: 20,
  cta: 'Detalhes',
  ctaSize: 15,
  borderStyle: 'pulsar',
  ctaDuration: 5,
  color: '#000000',
  hideStories: false,
  draggable: true,
  allowClose: true,
  mediaFit: 'cover',
  zIndex: 9999999,
};

const POSITIONS: { value: Position; label: string }[] = [
  { value: 'bottom-left', label: 'Inferior Esquerdo' },
  { value: 'bottom-right', label: 'Inferior Direito' },
  { value: 'top-left', label: 'Superior Esquerdo' },
  { value: 'top-right', label: 'Superior Direito' },
];

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'pulsar', label: 'Pulsar' },
  { value: 'solido', label: 'Sólido' },
  { value: 'tracejado', label: 'Tracejado' },
  { value: 'nenhum', label: 'Nenhum' },
];

const MEDIA_FITS: { value: MediaFit; label: string }[] = [
  { value: 'cover', label: 'Preencher (cover)' },
  { value: 'contain', label: 'Encaixar (contain)' },
];


export default function AppearanceEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { appId, presetId } = useParams();
  const [search] = useSearchParams();
  const kind: Kind = (search.get('kind') as Kind) === 'carousel' ? 'carousel' : 'floating';
  const returnTo = search.get('returnTo');

  const isNew = !presetId || presetId === 'new';
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    if (isNew || !user) return;
    (async () => {
      const { data } = await supabase
        .from('appearance_presets')
        .select('*')
        .eq('id', presetId!)
        .maybeSingle();
      if (data) {
        setName(data.name);
        setCfg({ ...DEFAULT_CONFIG, ...((data.config as Partial<Config>) ?? {}) });
      }
      setLoading(false);
    })();
  }, [isNew, presetId, user]);

  function backToTab() {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate(`/app/${appId}?tab=aparencia`);
  }

  async function save() {
    if (!name.trim()) { toast.error('Dê um nome ao padrão'); return; }
    if (!user) return;
    setSaving(true);
    let savedId: string | null = presetId && presetId !== 'new' ? presetId : null;
    if (isNew) {
      const { data, error } = await supabase.from('appearance_presets').insert({
        user_id: user.id, name: name.trim(), kind, config: cfg as unknown as never,
      }).select('id').single();
      if (error) { setSaving(false); toast.error('Erro ao criar'); return; }
      savedId = data?.id ?? null;
    } else {
      const { error } = await supabase
        .from('appearance_presets')
        .update({ name: name.trim(), config: cfg as unknown as never })
        .eq('id', presetId!);
      if (error) { setSaving(false); toast.error('Erro ao salvar'); return; }
    }
    setSaving(false);
    toast.success('Padrão salvo');
    if (returnTo && savedId) {
      const sep = returnTo.includes('?') ? '&' : '?';
      navigate(`${returnTo}${sep}selectedPreset=${encodeURIComponent(savedId)}`);
      return;
    }
    backToTab();
  }

  const [viewerOpen, setViewerOpen] = useState(false);

  const bubbleStyle = useMemo<React.CSSProperties>(() => {
    const isBottom = cfg.position.startsWith('bottom');
    const isLeft = cfg.position.endsWith('left');
    let radius: string | number = 0;
    let w: string | number = cfg.width;
    let h: string | number = cfg.width;
    if (cfg.shape === 'circular') radius = '50%';
    else if (cfg.shape === 'quadrado') radius = 16;
    else {
      radius = cfg.borderRadius;
      w = cfg.widthUnit === '%' ? `${cfg.width}%` : cfg.width;
      h = cfg.height;
    }
    const borderCss =
      cfg.borderStyle === 'nenhum'
        ? 'none'
        : `3px ${cfg.borderStyle === 'tracejado' ? 'dashed' : 'solid'} ${cfg.color}`;
    return {
      position: 'absolute',
      width: w,
      height: h,
      borderRadius: radius,
      border: borderCss,
      overflow: 'hidden',
      backgroundColor: '#d1d5db',
      [isBottom ? 'bottom' : 'top']: cfg.spacingBottom,
      [isLeft ? 'left' : 'right']: cfg.spacingLeft,
      zIndex: 2,
    } as React.CSSProperties;
  }, [cfg]);


  const ctaBase = useMemo<React.CSSProperties>(() => {
    const isBottom = cfg.position.startsWith('bottom');
    const isLeft = cfg.position.endsWith('left');
    const bubbleW =
      cfg.shape === 'personalizado' && cfg.widthUnit === 'px'
        ? cfg.width
        : cfg.shape === 'personalizado'
        ? 100
        : cfg.width;
    const bubbleH = cfg.shape === 'personalizado' ? cfg.height : cfg.width;
    const verticalCenter = cfg.spacingBottom + bubbleH / 2;
    const horizontalAfter = cfg.spacingLeft + bubbleW + 10;
    return {
      position: 'absolute',
      [isBottom ? 'bottom' : 'top']: verticalCenter,
      [isLeft ? 'left' : 'right']: horizontalAfter,
      background: cfg.color,
      color: '#fff',
      fontSize: cfg.ctaSize,
      lineHeight: 1,
      padding: '6px 12px',
      borderRadius: 999,
      fontWeight: 700,
      letterSpacing: 0.3,
      whiteSpace: 'nowrap',
      boxShadow: '0 6px 18px rgba(0,0,0,.18)',
      willChange: 'transform, opacity',
      transition: 'opacity 380ms cubic-bezier(.22,.61,.36,1), transform 380ms cubic-bezier(.22,.61,.36,1)',
      transformOrigin: 'center',
    } as React.CSSProperties;
  }, [cfg]);

  // Translate Y baseline keeps pill vertically aligned with bubble center.
  const ctaShown: React.CSSProperties = { opacity: 1, transform: 'translateY(50%) scale(1)' };
  const ctaHidden: React.CSSProperties = { opacity: 0, transform: 'translateY(calc(50% + 8px)) scale(0.9)', pointerEvents: 'none' };

  // CTA visibility timer: shows on mount, hides after ctaDuration seconds, loops every (duration+2)s.
  const [ctaVisible, setCtaVisible] = useState(true);
  useEffect(() => {
    setCtaVisible(true);
    if (!cfg.cta || cfg.ctaDuration <= 0) return;
    let hideTimer: ReturnType<typeof setTimeout>;
    let showTimer: ReturnType<typeof setTimeout>;
    const loop = () => {
      setCtaVisible(true);
      hideTimer = setTimeout(() => {
        setCtaVisible(false);
        showTimer = setTimeout(loop, 1500);
      }, cfg.ctaDuration * 1000);
    };
    loop();
    return () => { clearTimeout(hideTimer); clearTimeout(showTimer); };
  }, [cfg.cta, cfg.ctaDuration]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const showPersonalizado = cfg.shape === 'personalizado';

  return (
    <>
      <TopBar
        title={isNew ? 'Nova aparência' : 'Editar aparência'}
        breadcrumb="Stories Vídeos"
        backTo={returnTo || `/app/${appId}?tab=aparencia`}
      />
      <main className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 fade-in">
        <button
          onClick={backToTab}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {returnTo ? 'Voltar' : 'Voltar para Aparência'}
        </button>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-6">
          <label className="flex flex-col gap-1.5 text-sm mb-6">
            <span className="text-neutral-700 font-medium">Aparência</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Story vídeo redondo"
              className="h-11 rounded-xl border border-neutral-200 px-3 max-w-md"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(260px,32%)] lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_380px] gap-4 md:gap-5 xl:gap-6">
            {/* Preview */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 min-h-[520px] min-w-0 overflow-hidden">
              <div className="flex justify-center mb-4">
                <div className="inline-flex bg-white border border-neutral-200 rounded-xl p-1">
                  <button
                    onClick={() => setDevice('mobile')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      device === 'mobile' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> Mobile
                  </button>
                  <button
                    onClick={() => setDevice('desktop')}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                      device === 'desktop' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
                    }`}
                  >
                    <Monitor className="w-4 h-4" /> Desktop
                  </button>
                </div>
              </div>

              {device === 'mobile' ? (
                <div
                  className="relative mx-auto"
                  style={{ width: 300, height: 600 }}
                >
                  {/* Phone outer frame */}
                  <div
                    className="absolute inset-0 bg-neutral-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.35)]"
                    style={{ borderRadius: 44, padding: 12 }}
                  >
                    {/* Screen */}
                    <div
                      className="relative w-full h-full overflow-hidden bg-white"
                      style={{ borderRadius: 32 }}
                    >
                      {/* Notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-neutral-900 h-6 w-32 rounded-b-2xl" />
                      {/* Status bar */}
                      <div className="flex items-center justify-between px-6 pt-2 text-[10px] font-semibold text-neutral-800">
                        <span>9:41</span>
                        <span />
                      </div>
                      {/* Fake store content */}
                      <div className="px-3 pt-6">
                        <div className="h-6 bg-neutral-200 rounded-md w-2/3 mb-3" />
                        <div className="grid grid-cols-2 gap-2.5">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-neutral-200/80" />
                          ))}
                        </div>
                      </div>
                      {/* Widget overlay */}
                      {!cfg.hideStories && (
                        <>
                          {cfg.borderStyle === 'pulsar' && (
                            <>
                              <PulseRing style={bubbleStyle} delay="0s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="2.66s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="5.33s" color={cfg.color} />
                            </>
                          )}
                          <div
                            style={{ ...bubbleStyle, cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
                          >
                            <PreviewMedia fit={cfg.mediaFit} />
                            {cfg.allowClose && (
                              <div className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white">
                                <X className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          {cfg.cta && (
                            <div style={{ ...ctaBase, ...(ctaVisible ? ctaShown : ctaHidden) }}>
                              {cfg.cta.toUpperCase()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative mx-auto w-full" style={{ maxWidth: 760 }}>
                  {/* Browser window */}
                  <div className="bg-neutral-100 border border-neutral-300 rounded-t-xl overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]">
                    {/* Title bar */}
                    <div className="flex items-center gap-2 px-4 h-9 bg-neutral-200/80 border-b border-neutral-300">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <div className="mx-auto bg-white border border-neutral-300 rounded-md h-6 px-3 flex items-center text-[11px] text-neutral-500 min-w-[240px] max-w-[360px] w-full justify-center">
                        minhaloja.com.br
                      </div>
                    </div>
                    {/* Viewport */}
                    <div className="relative bg-white" style={{ height: 460 }}>
                      <div className="px-6 pt-5">
                        <div className="h-7 bg-neutral-200 rounded-md w-1/3 mb-4" />
                        <div className="grid grid-cols-4 gap-4">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="aspect-square rounded-xl bg-neutral-200/80" />
                          ))}
                        </div>
                      </div>
                      {!cfg.hideStories && (
                        <>
                          {cfg.borderStyle === 'pulsar' && (
                            <>
                              <PulseRing style={bubbleStyle} delay="0s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="2.66s" color={cfg.color} />
                              <PulseRing style={bubbleStyle} delay="5.33s" color={cfg.color} />
                            </>
                          )}
                          <div
                            style={{ ...bubbleStyle, cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); setViewerOpen(true); }}
                          >
                            <PreviewMedia fit={cfg.mediaFit} />
                            {cfg.allowClose && (
                              <div className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white">
                                <X className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          {cfg.cta && (
                            <div style={{ ...ctaBase, ...(ctaVisible ? ctaShown : ctaHidden) }}>
                              {cfg.cta.toUpperCase()}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Monitor stand */}
                  <div className="mx-auto w-32 h-3 bg-neutral-300 rounded-b-xl" />
                  <div className="mx-auto w-48 h-1.5 bg-neutral-400/70 rounded-full mt-1" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-5 min-w-0">
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5">
                  <Switch
                    checked={cfg.useAllDevices}
                    onCheckedChange={(v) => setCfg({ ...cfg, useAllDevices: !!v })}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-neutral-900">
                    Usar aparência em todos os dispositivos
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Quando ativado, a mesma aparência será aplicada no mobile e no desktop.
                  </p>
                </div>
              </div>

              <Field label="Forma">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.shape}
                  onChange={(e) => setCfg({ ...cfg, shape: e.target.value as Shape })}
                >
                  <option value="circular">Circular</option>
                  <option value="quadrado">Quadrado</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </Field>

              {showPersonalizado ? (
                <>
                  <div className="flex flex-col gap-1.5 text-sm">
                    <span className="text-neutral-700 font-medium">
                      Largura ({cfg.width}{cfg.widthUnit})
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={cfg.widthUnit === '%' ? 10 : 48}
                        max={cfg.widthUnit === '%' ? 100 : 400}
                        value={cfg.width}
                        onChange={(e) => setCfg({ ...cfg, width: Number(e.target.value) })}
                        className="accent-blue-600 flex-1"
                      />
                      <select
                        value={cfg.widthUnit}
                        onChange={(e) => setCfg({ ...cfg, widthUnit: e.target.value as Unit })}
                        className="h-9 rounded-lg border border-neutral-200 px-2 bg-white text-sm"
                      >
                        <option value="px">Px</option>
                        <option value="%">%</option>
                      </select>
                    </div>
                  </div>
                  <Slider label={`Altura (${cfg.height}px)`} min={48} max={400}
                    value={cfg.height} onChange={(v) => setCfg({ ...cfg, height: v })} />
                  <Slider label={`Raio da Borda (${cfg.borderRadius}px)`} min={0} max={200}
                    value={cfg.borderRadius} onChange={(v) => setCfg({ ...cfg, borderRadius: v })} />
                </>
              ) : (
                <Slider label={`Largura (${cfg.width}px)`} min={48} max={400}
                  value={cfg.width} onChange={(v) => setCfg({ ...cfg, width: v, height: v })} />
              )}

              <Field label="Posição">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.position}
                  onChange={(e) => setCfg({ ...cfg, position: e.target.value as Position })}
                >
                  {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>

              <Slider label={`Espaçamento Inferior (${cfg.spacingBottom}px)`} min={0} max={400}
                value={cfg.spacingBottom} onChange={(v) => setCfg({ ...cfg, spacingBottom: v })} />
              <Slider label={`Espaçamento Esquerdo (${cfg.spacingLeft}px)`} min={0} max={400}
                value={cfg.spacingLeft} onChange={(v) => setCfg({ ...cfg, spacingLeft: v })} />

              <Field label="Chamada para Ação">
                <input
                  value={cfg.cta}
                  onChange={(e) => setCfg({ ...cfg, cta: e.target.value })}
                  placeholder="Detalhes"
                  className="h-10 rounded-xl border border-neutral-200 px-3 w-full"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Deixe vazio para ocultar a chamada para ação.
                </p>
                <p className="text-xs text-neutral-500">
                  Defina transparente para ocultar a chamada para ação.
                </p>
              </Field>

              <Slider label={`Tamanho da Chamada para Ação (${cfg.ctaSize}px)`} min={8} max={40}
                value={cfg.ctaSize} onChange={(v) => setCfg({ ...cfg, ctaSize: v })} />

              <Field label="Estilo da Borda">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.borderStyle}
                  onChange={(e) => setCfg({ ...cfg, borderStyle: e.target.value as BorderStyle })}
                >
                  {BORDER_STYLES.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Duração da Chamada para Ação">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={cfg.ctaDuration}
                    onChange={(e) => setCfg({ ...cfg, ctaDuration: Number(e.target.value) })}
                    className="h-10 w-24 rounded-xl border border-neutral-200 px-3"
                  />
                  <span className="text-sm text-neutral-500">segundos</span>
                </div>
              </Field>

              <Field label="Cor">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cfg.color}
                    onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                    className="h-10 w-16 rounded-xl border border-neutral-200 bg-white cursor-pointer"
                  />
                  <input
                    value={cfg.color}
                    onChange={(e) => setCfg({ ...cfg, color: e.target.value })}
                    className="h-10 flex-1 rounded-xl border border-neutral-200 px-3 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setCfg({ ...cfg, color: 'transparent' })}
                    className="h-10 px-3 rounded-xl border border-neutral-200 text-xs font-medium hover:bg-neutral-50"
                  >
                    Remover Cor
                  </button>
                </div>
              </Field>

              <ToggleRow
                label="Ocultar o stories?"
                checked={cfg.hideStories}
                onChange={(v) => setCfg({ ...cfg, hideStories: v })}
              />
              <ToggleRow
                label="Arrastável"
                checked={cfg.draggable}
                onChange={(v) => setCfg({ ...cfg, draggable: v })}
              />
              <ToggleRow
                label="Permite Fechar"
                checked={cfg.allowClose}
                onChange={(v) => setCfg({ ...cfg, allowClose: v })}
              />

              <Field label="Exibição do vídeo/imagem">
                <select
                  className="h-10 rounded-xl border border-neutral-200 px-3 bg-white w-full"
                  value={cfg.mediaFit}
                  onChange={(e) => setCfg({ ...cfg, mediaFit: e.target.value as MediaFit })}
                >
                  {MEDIA_FITS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Cover preenche a área cortando se necessário; contain exibe a mídia inteira.
                </p>
              </Field>

              <Field label="Z-Index">
                <input
                  type="number"
                  value={cfg.zIndex}
                  onChange={(e) => setCfg({ ...cfg, zIndex: Number(e.target.value) })}
                  className="h-10 rounded-xl border border-neutral-200 px-3 w-full"
                />
              </Field>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  onClick={backToTab}
                  className="h-10 px-4 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-50 inline-flex items-center gap-2 shrink-0"
                >
                  Voltar
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="h-10 px-4 rounded-lg border border-neutral-900 bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 inline-flex items-center gap-2 shrink-0 disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>

              </div>

            </div>
          </div>
        </div>
      </main>
      {viewerOpen && <StoryViewer onClose={() => setViewerOpen(false)} />}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-700 font-medium">{label}</span>
      {children}
    </label>
  );
}

function Slider({
  label, min, max, value, onChange,
}: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <span className="text-neutral-700 font-medium">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-blue-600"
      />
    </div>
  );
}

function ToggleRow({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border border-neutral-100 rounded-xl px-3 py-2.5">
      <span className="text-sm font-medium text-neutral-800">{label}</span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(!!v)} />
    </div>
  );
}

function PulseRing({ style, delay, color }: { style: React.CSSProperties; delay: string; color: string }) {
  const ringStyle: React.CSSProperties = {
    ...style,
    backgroundImage: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    zIndex: 1,
    pointerEvents: 'none',
    // Use CSS custom property so keyframes can reference the ring color
    ['--zt-ring' as any]: color,
    animation: `zt-pulse-ring 8s cubic-bezier(.22,.61,.36,1) ${delay} infinite`,
    willChange: 'box-shadow, opacity',
  };
  return (
    <>
      <style>{`@keyframes zt-pulse-ring {
        0%   { box-shadow: 0 0 0 0px var(--zt-ring);  opacity: 0.75; }
        15%  { box-shadow: 0 0 0 12px var(--zt-ring); opacity: 0; }
        100% { box-shadow: 0 0 0 12px var(--zt-ring); opacity: 0; }
      }`}</style>
      <div style={ringStyle} />
    </>
  );
}
