import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Play, Volume2, VolumeX, X, Heart, MessageCircle, Send } from 'lucide-react';

function RulerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="currentColor" aria-hidden>
      <path d="M509.013,99.064L412.937,2.987c-3.984-3.983-10.44-3.983-14.425,0L2.987,398.513c-3.983,3.983-3.983,10.441,0,14.424l96.076,96.077c1.991,1.992,4.602,2.987,7.212,2.987s5.221-0.995,7.212-2.987l395.526-395.526c1.912-1.912,2.987-4.506,2.987-7.212C512.001,103.57,510.926,100.976,509.013,99.064z M106.275,487.377l-81.653-81.653l41.98-41.98l15.228,15.229c1.992,1.992,4.602,2.987,7.212,2.987c2.61,0,5.221-0.996,7.212-2.987c3.983-3.983,3.984-10.441,0-14.424L81.025,349.32l41.979-41.979l28.554,28.554c1.992,1.992,4.602,2.987,7.212,2.987c2.61,0,5.221-0.995,7.212-2.987c3.983-3.983,3.983-10.441,0-14.425l-28.554-28.554l41.979-41.979l15.229,15.23c1.992,1.992,4.602,2.987,7.212,2.987s5.221-0.995,7.212-2.987c3.983-3.983,3.983-10.441,0-14.425l-15.229-15.229l41.979-41.979l37.671,37.671c1.992,1.992,4.602,2.987,7.212,2.987c2.61,0,5.22-0.995,7.212-2.987c3.983-3.983,3.983-10.441,0-14.425l-37.671-37.671l41.98-41.98l15.228,15.229c1.992,1.992,4.602,2.987,7.212,2.987s5.22-0.996,7.212-2.987c3.983-3.983,3.983-10.441,0-14.424l-15.229-15.229l41.98-41.98l37.67,37.671c1.992,1.992,4.602,2.987,7.212,2.987s5.22-0.996,7.212-2.987c3.983-3.983,3.983-10.441,0-14.424l-37.671-37.671l42.686-42.68l81.653,81.653L106.275,487.377z" />
      <path d="M191.93,347.419l-3.505-3.506c-3.983-3.983-10.441-3.983-14.425,0c-3.983,3.983-3.983,10.441,0,14.425l3.507,3.506c1.992,1.992,4.602,2.987,7.212,2.987s5.221-0.995,7.212-2.987C195.913,357.861,195.913,351.403,191.93,347.419z" />
    </svg>
  );
}


interface Product {
  id: string;
  name: string;
  price: string;
  image?: string | null;
  url?: string | null;
}

interface MediaInput {
  url?: string | null;
  type?: string | null;
  name?: string | null;
}

export interface PlaylistItem {
  media: MediaInput;
  products?: Product[];
}

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media?: MediaInput | null;
  products?: Product[];
  /** Quando informado, ignora `media`/`products` e exibe múltiplos stories
   *  com barras de progresso por segmento, auto-advance e tap zones. */
  playlist?: PlaylistItem[];
  /** Mostra um ícone de Medidas ao lado do botão Fechar. */
  showMeasureIcon?: boolean;
  /** Callback ao clicar no ícone de Medidas. */
  onMeasureClick?: () => void;
  /** Quando true, pausa o vídeo (sem reset de currentTime) — usado enquanto o modal de Medidas está aberto. */
  measureOpen?: boolean;
}

interface Comment {
  name: string;
  text: string;
  time: string;
}

const PROGRESS_MS = 5000;

function formatPrice(price: string): string {
  if (!price) return '';
  if (/^R\$/i.test(price)) return price;
  const num = Number(String(price).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (Number.isNaN(num)) return price;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function MediaPreviewModal({ open, onOpenChange, media, products, playlist, showMeasureIcon, onMeasureClick, measureOpen }: MediaPreviewModalProps) {
  const hasPlaylist = !!playlist && playlist.length > 0;
  const segmentCount = hasPlaylist ? playlist!.length : 1;

  const [currentIdx, setCurrentIdx] = useState(0);
  const currentItem: PlaylistItem | null = hasPlaylist ? playlist![currentIdx] ?? null : null;

  const effectiveMedia: MediaInput | null = hasPlaylist ? currentItem?.media ?? null : media ?? null;
  const effectiveProducts: Product[] = hasPlaylist ? currentItem?.products ?? [] : products ?? [];

  const isVideo = effectiveMedia?.type === 'video' || (effectiveMedia?.type ?? '').includes('video');
  const url = effectiveMedia?.url ?? '';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const imgElapsedRef = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ down: boolean; moved: boolean; startX: number; scrollLeft: number }>({ down: false, moved: false, startX: 0, scrollLeft: 0 });

  const onCarouselMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el) return;
    dragRef.current = { down: true, moved: false, startX: e.pageX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
  };
  const onCarouselMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = carouselRef.current;
    if (!el || !dragRef.current.down) return;
    const dx = e.pageX - dragRef.current.startX;
    if (Math.abs(dx) > 3) dragRef.current.moved = true;
    el.scrollLeft = dragRef.current.scrollLeft - dx;
  };
  const onCarouselMouseUp = () => {
    const el = carouselRef.current;
    if (!el) return;
    dragRef.current.down = false;
    el.style.cursor = '';
  };

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [progressStarted, setProgressStarted] = useState(false);

  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentList, setShowCommentList] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formText, setFormText] = useState('');

  const anyDrawerOpen = showCommentForm || showCommentList || showShare || !!measureOpen;

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setCurrentIdx(0);
    setPaused(false);
    setMuted(false);
    setLiked(false);
    setLikeCount(0);
    setComments([]);
    setShowCommentForm(false);
    setShowCommentList(false);
    setShowShare(false);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormText('');
  }, [open]);

  // Reset per-segment progress quando troca de mídia
  useEffect(() => {
    setProgressStarted(false);
    imgElapsedRef.current = 0;
    // segmentos passados → 100%; futuros → 0%; atual será controlado pelo loop
    segmentRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i < currentIdx) el.style.width = '100%';
      else if (i > currentIdx) el.style.width = '0%';
      else el.style.width = '0%';
    });
  }, [currentIdx, url]);

  const advance = () => {
    if (hasPlaylist) {
      setCurrentIdx((i) => {
        if (i + 1 < segmentCount) return i + 1;
        // fim da playlist → fecha
        onOpenChange(false);
        return i;
      });
    } else {
      onOpenChange(false);
    }
  };

  const goPrev = () => {
    if (!hasPlaylist) return;
    setCurrentIdx((i) => Math.max(0, i - 1));
  };

  const goNext = () => {
    if (!hasPlaylist) return;
    setCurrentIdx((i) => Math.min(segmentCount - 1, i + 1));
  };

  // Image progress animation via rAF
  useEffect(() => {
    if (!open || isVideo) return;
    if (!progressStarted) return;
    const seg = segmentRefs.current[currentIdx];
    if (!seg) return;
    let last = performance.now();

    const tick = (now: number) => {
      const cur = segmentRefs.current[currentIdx];
      if (!cur) return;
      const delta = now - last;
      last = now;
      if (!paused && !anyDrawerOpen) {
        imgElapsedRef.current += delta;
      }
      const pct = Math.min(100, (imgElapsedRef.current / PROGRESS_MS) * 100);
      cur.style.width = pct + '%';
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        advance();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isVideo, progressStarted, paused, anyDrawerOpen, currentIdx]);

  // Video: drive progress via rAF (smooth); auto-advance on ended
  useEffect(() => {
    if (!open || !isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setProgressStarted(true);
    const onEnded = () => advance();
    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('ended', onEnded);

    let raf = 0;
    const tick = () => {
      const cur = segmentRefs.current[currentIdx];
      if (cur && v.duration && Number.isFinite(v.duration)) {
        const pct = Math.min(100, (v.currentTime / v.duration) * 100);
        cur.style.width = pct + '%';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('ended', onEnded);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isVideo, url, currentIdx]);

  // Apply pause/mute and drawer pausing to video
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    v.muted = muted;
    if (paused || anyDrawerOpen) {
      try { v.pause(); } catch { /* ignore */ }
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, [paused, muted, anyDrawerOpen, isVideo, open, url]);

  // Image: marcar progressStarted assim que houver URL (cache cobre)
  useEffect(() => {
    if (!open || isVideo) return;
    if (url) setProgressStarted(true);
  }, [open, isVideo, url]);

  const productList = useMemo(() => effectiveProducts.slice(0, 3), [effectiveProducts]);

  if (!open) return null;

  const openProduct = (p: Product) => {
    if (p.url) window.open(p.url, '_blank', 'noopener,noreferrer');
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formText.trim()) return;
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setComments((c) => [...c, { name: formName.trim(), text: formText.trim(), time }]);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormText('');
    setShowCommentForm(false);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };
  const shareInstagram = () => {
    window.open(shareUrl, '_blank', 'noopener');
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
  };
  const shareMore = async () => {
    if (navigator.share) {
      try { await navigator.share({ url: shareUrl }); } catch { /* ignore */ }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 2147483600 }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="bg-black overflow-hidden flex flex-col relative rounded-2xl max-sm:rounded-none max-sm:!w-screen max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!max-h-none" style={{ aspectRatio: '9 / 16', height: 'min(92dvh, 780px)', maxWidth: '100%' }}>
        {/* Zone 1 — progress bars (1 segmento por mídia) */}
        <div className="absolute left-2 right-2 flex gap-1 z-10" style={{ top: 'max(10px, env(safe-area-inset-top))' }}>
          {Array.from({ length: segmentCount }).map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
              <div
                ref={(el) => { segmentRefs.current[i] = el; }}
                className="h-full bg-white rounded-full"
                style={{ width: i < currentIdx ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Zone 2 — top controls */}
        <div className="absolute right-3 flex items-center gap-2.5 z-20" style={{ top: 'calc(max(10px, env(safe-area-inset-top)) + 14px)' }}>
          {showMeasureIcon && (
            <button
              type="button"
              onClick={() => onMeasureClick?.()}
              className="bg-transparent border-0 flex items-center justify-center text-white cursor-pointer p-1"
              aria-label="Ver medidas"
              title="Medidas"
            >
              <RulerIcon className="w-5 h-5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-0 flex items-center justify-center text-white cursor-pointer p-1"
            aria-label="Fechar"
          >
            <X className="w-7 h-7" strokeWidth={1.5} />
          </button>
        </div>

        {/* Zone 3 — media */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {url ? (
            isVideo ? (
              <video
                ref={videoRef}
                key={`v-${currentIdx}-${url}`}
                src={url}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                key={`i-${currentIdx}-${url}`}
                src={url}
                alt={effectiveMedia?.name ?? ''}
                onLoad={() => setProgressStarted(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : null}

          {/* Tap zones: prev/next em playlist + center toggles pause */}
          {hasPlaylist ? (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={goPrev}
                className="absolute left-0 top-0 bottom-0 w-[30%] z-[5] cursor-default bg-transparent border-0"
              />
              <button
                type="button"
                aria-label={paused ? 'Reproduzir' : 'Pausar'}
                onClick={() => setPaused((p) => !p)}
                className="absolute left-[30%] right-[30%] top-0 bottom-0 z-[5] cursor-default bg-transparent border-0"
              />
              <button
                type="button"
                aria-label="Próximo"
                onClick={goNext}
                className="absolute right-0 top-0 bottom-0 w-[30%] z-[5] cursor-default bg-transparent border-0"
              />
            </>
          ) : (
            <button
              type="button"
              aria-label={paused ? 'Reproduzir' : 'Pausar'}
              onClick={() => setPaused((p) => !p)}
              className="absolute inset-0 z-[5] cursor-default bg-transparent border-0"
            />
          )}

          {/* Indicador central de pause (play + som) */}
          {paused && (
            <div
              className="absolute left-0 right-0 top-0 z-[6] flex flex-col items-center justify-center gap-3 pointer-events-none"
              style={{ bottom: 'calc(56px + env(safe-area-inset-bottom))' }}
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                aria-label={muted ? 'Ativar som' : 'Silenciar'}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center text-white border-0 cursor-pointer hover:bg-black/60"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-sm flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
              </div>
            </div>

          )}

          {/* Preload upcoming playlist items (next 2) to avoid load delay on advance */}
          {hasPlaylist && (
            <div aria-hidden className="hidden">
              {playlist!.slice(currentIdx + 1, currentIdx + 3).map((it, i) => {
                const u = it.media?.url ?? '';
                const isVid = it.media?.type === 'video' || (it.media?.type ?? '').includes('video');
                if (!u) return null;
                return isVid ? (
                  <video key={`pre-v-${currentIdx + 1 + i}-${u}`} src={u} preload="auto" muted playsInline />
                ) : (
                  <img key={`pre-i-${currentIdx + 1 + i}-${u}`} src={u} alt="" />
                );
              })}
              {/* Preload product thumbnails de toda a playlist para aparecerem imediatamente */}
              {playlist!.flatMap((it, si) =>
                (it.products ?? []).map((p) =>
                  p.image ? (
                    <img
                      key={`pre-prod-${si}-${p.id}`}
                      src={p.image}
                      alt=""
                      loading="eager"
                      decoding="sync"
                    />
                  ) : null,
                ),
              )}
            </div>
          )}
        </div>

        {/* Zone 4 — product cards (carrossel: 1 = full width; 2+ = peek ~40% do próximo) */}
        {productList.length > 0 && (
          <div
            className="absolute z-10 left-0 right-0 w-full pointer-events-none"
            style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 3px)' }}
          >
            <div
              ref={carouselRef}
              onMouseDown={onCarouselMouseDown}
              onMouseMove={onCarouselMouseMove}
              onMouseUp={onCarouselMouseUp}
              onMouseLeave={onCarouselMouseUp}
              className={
                productList.length > 1
                  ? 'flex gap-2 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar pl-3 pr-3 pointer-events-auto cursor-grab select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
                  : 'flex px-3 pointer-events-auto'
              }
            >
              {productList.map((p) => (
                <div
                  key={p.id}
                  className={
                    'bg-black/55 backdrop-blur-md overflow-hidden flex items-stretch gap-0 shadow-[0_6px_18px_rgba(0,0,0,0.35)] rounded-[10px] h-[58px] ' +
                    (productList.length > 1
                      ? 'shrink-0 snap-start basis-[72%]'
                      : 'w-full')
                  }
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      draggable={false}
                      loading="eager"
                      decoding="sync"
                      // @ts-expect-error fetchpriority is a valid HTML attribute
                      fetchpriority="high"
                      className="w-12 self-stretch object-cover bg-neutral-800 shrink-0 pointer-events-none"
                    />
                  ) : (
                    <div className="w-12 self-stretch bg-neutral-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 flex flex-col py-1 pl-2 pr-2">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div
                        className="text-white leading-[1.1] text-[20px] truncate"
                        style={{ fontWeight: 100 }}
                      >
                        {p.name}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <div className="text-white/90 leading-none text-[13px] font-light truncate">
                        {p.price ? formatPrice(p.price) : '\u00A0'}
                      </div>
                      <button
                        type="button"
                        onClick={() => openProduct(p)}
                        disabled={!p.url}
                        className="bg-white hover:bg-neutral-100 transition-colors text-neutral-900 font-semibold text-[9px] px-1.5 py-[2px] rounded-md shrink-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white"
                      >
                        Comprar
                      </button>

                    </div>

                  </div>


                </div>
              ))}
            </div>
          </div>
        )}


        {/* Zone 5 — bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#111] flex items-center px-3.5 gap-3 z-20" style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <button
            type="button"
            onClick={() => setShowCommentForm(true)}
            className="flex-1 bg-transparent border border-white/30 text-white/60 rounded-full px-4 py-1.5 text-[13px] text-left cursor-pointer hover:border-white/50 transition-colors"
          >
            Comentar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setLiked((l) => {
                  setLikeCount((c) => c + (l ? -1 : 1));
                  return !l;
                });
              }}
              className="flex items-center justify-center bg-transparent border-0 cursor-pointer text-white p-0"
              aria-label="Curtir"
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-red-500 stroke-red-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowCommentList(true)}
              className="relative flex items-center justify-center bg-transparent border-0 cursor-pointer text-white p-0"
              aria-label="Comentários"
            >
              <MessageCircle className="w-5 h-5" />
              {comments.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-1">
                  {comments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center justify-center bg-transparent border-0 cursor-pointer p-0"
              aria-label="Compartilhar"
            >
              <Send className="w-5 h-5 text-white" style={{ transform: 'rotate(3deg)' }} />
            </button>
          </div>
        </div>

        {/* Comment Form Drawer */}
        {showCommentForm && (
          <div
            className="absolute inset-0 z-30 bg-black/60 flex flex-col justify-end animate-in fade-in duration-150"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCommentForm(false); }}
          >
            <form
              onSubmit={submitComment}
              className="bg-[#1a1a1a] rounded-t-2xl p-5 animate-in slide-in-from-bottom duration-200"
            >
              <h3 className="text-white text-[16px] font-bold mb-4">Deixar um comentário</h3>

              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nome"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-xl p-3 text-white text-[14px] placeholder:text-white/30 w-full focus:border-white/40 outline-none"
                />
                <input
                  type="email"
                  placeholder="E-mail"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-xl p-3 text-white text-[14px] placeholder:text-white/30 w-full focus:border-white/40 outline-none"
                />
                <input
                  type="tel"
                  placeholder="+55 (00) 00000-0000"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-xl p-3 text-white text-[14px] placeholder:text-white/30 w-full focus:border-white/40 outline-none"
                />
                <textarea
                  required
                  placeholder="Comentário"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  className="bg-white/8 border border-white/15 rounded-xl p-3 text-white text-[14px] placeholder:text-white/30 w-full focus:border-white/40 outline-none resize-none h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-white text-neutral-900 font-bold rounded-xl py-3.5 text-[15px] mt-3 hover:bg-neutral-100"
              >
                Enviar comentário
              </button>
              <button
                type="button"
                onClick={() => setShowCommentForm(false)}
                className="w-full bg-transparent text-white/50 text-[14px] py-2.5 mt-1"
              >
                Cancelar
              </button>
            </form>
          </div>
        )}

        {/* Comment List Drawer */}
        {showCommentList && (
          <div className="absolute inset-0 z-30 bg-[#111] flex flex-col animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
              <span className="text-white font-bold text-[15px]">Comentários</span>
              <button
                type="button"
                onClick={() => setShowCommentList(false)}
                className="text-white/60 hover:text-white bg-transparent border-0 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-7 h-7" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {comments.length === 0 ? (
                <span className="text-white/40 text-[14px] text-center m-auto py-10">Nenhum comentário ainda.</span>
              ) : (
                comments.map((c, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-white font-bold text-[13px]">{c.name}</span>
                    <span className="text-white/75 text-[13px] leading-snug">{c.text}</span>
                    <span className="text-white/40 text-[11px]">{c.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Share Drawer */}
        {showShare && (
          <div
            className="absolute inset-0 z-30 bg-black/70 flex items-end animate-in fade-in duration-150"
            onClick={(e) => { if (e.target === e.currentTarget) setShowShare(false); }}
          >
            <div className="bg-[#1a1a1a] rounded-t-2xl p-5 w-full animate-in slide-in-from-bottom duration-200">
              <h3 className="text-white font-bold text-[15px] text-center mb-4">Compartilhar Story</h3>
              <div className="flex justify-center gap-5 flex-wrap">
                <button type="button" onClick={shareWhatsApp} className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-0">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#25d366]">💬</span>
                  <span className="text-[11px] text-white/70">WhatsApp</span>
                </button>
                <button type="button" onClick={shareInstagram} className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-0">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-gradient-to-br from-[#f09433] to-[#bc1888]">📸</span>
                  <span className="text-[11px] text-white/70">Instagram</span>
                </button>
                <button type="button" onClick={copyLink} className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-0">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#444]">🔗</span>
                  <span className="text-[11px] text-white/70">Copiar link</span>
                </button>
                <button type="button" onClick={shareMore} className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-0">
                  <span className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-[#555]">⋯</span>
                  <span className="text-[11px] text-white/70">Mais</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="w-full mt-4 bg-white/8 text-white rounded-xl py-3.5 text-[15px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
