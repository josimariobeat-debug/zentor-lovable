import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX, X, Heart, MessageCircle, Send } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: string;
  image?: string | null;
  url?: string | null;
}

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { url?: string | null; type?: string | null; name?: string | null } | null;
  products?: Product[];
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

export default function MediaPreviewModal({ open, onOpenChange, media, products }: MediaPreviewModalProps) {
  const isVideo = media?.type === 'video' || (media?.type ?? '').includes('video');
  const url = media?.url ?? '';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const imgStartRef = useRef<number>(0);
  const imgElapsedRef = useRef<number>(0);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [progressStarted, setProgressStarted] = useState(false);

  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showCommentList, setShowCommentList] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formText, setFormText] = useState('');

  const anyDrawerOpen = showCommentForm || showCommentList || showShare;

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setPaused(false);
    setMuted(false);
    setLiked(false);
    setLikeCount(0);
    setComments([]);
    setProgressStarted(false);
    setShowCommentForm(false);
    setShowCommentList(false);
    setShowShare(false);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormText('');
    imgElapsedRef.current = 0;
  }, [open, url]);

  // Image progress animation via rAF (so we can pause)
  useEffect(() => {
    if (!open || isVideo) return;
    if (!progressStarted) return;
    let last = performance.now();
    imgStartRef.current = last;

    const tick = (now: number) => {
      if (!progressRef.current) return;
      const delta = now - last;
      last = now;
      if (!paused && !anyDrawerOpen) {
        imgElapsedRef.current += delta;
      }
      const pct = Math.min(100, (imgElapsedRef.current / PROGRESS_MS) * 100);
      progressRef.current.style.width = pct + '%';
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, isVideo, progressStarted, paused, anyDrawerOpen]);

  // Video: drive progress via timeupdate; control pause based on drawers/paused state
  useEffect(() => {
    if (!open || !isVideo) return;
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => setProgressStarted(true);
    const onTime = () => {
      if (!progressRef.current || !v.duration) return;
      const pct = Math.min(100, (v.currentTime / v.duration) * 100);
      progressRef.current.style.width = pct + '%';
    };
    v.addEventListener('loadeddata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    return () => {
      v.removeEventListener('loadeddata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
    };
  }, [open, isVideo, url]);

  // Apply pause/mute and drawer pausing to video
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    v.muted = muted;
    if (paused || anyDrawerOpen) {
      try { v.pause(); } catch {}
    } else {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }, [paused, muted, anyDrawerOpen, isVideo, open]);

  // For images, set progressStarted on mount of img (via onLoad below). Also start immediately if no video & has url.
  useEffect(() => {
    if (!open || isVideo) return;
    // If image already loaded from cache, kick off immediately
    if (url) setProgressStarted(true);
  }, [open, isVideo, url]);

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
    try { await navigator.clipboard.writeText(shareUrl); } catch {}
  };
  const shareMore = async () => {
    if (navigator.share) {
      try { await navigator.share({ url: shareUrl }); } catch {}
    }
  };

  const productList = (products ?? []).slice(0, 3);

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-0 sm:p-4"
      style={{ zIndex: 2147483600 }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div className="bg-black overflow-hidden flex flex-col relative rounded-2xl max-sm:rounded-none max-sm:!w-screen max-sm:!h-[100dvh] max-sm:!max-w-none max-sm:!max-h-none" style={{ aspectRatio: '9 / 16', height: 'min(92dvh, 780px)', maxWidth: '100%' }}>
        {/* Zone 1 — progress bars */}
        <div className="absolute left-2 right-2 flex gap-1 z-10" style={{ top: 'max(10px, env(safe-area-inset-top))' }}>
          <div className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
            <div ref={progressRef} className="h-full bg-white rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

        {/* Zone 2 — top controls */}
        <div className="absolute right-3 flex items-center gap-2.5 z-20" style={{ top: 'calc(max(10px, env(safe-area-inset-top)) + 14px)' }}>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70"
            aria-label={paused ? 'Reproduzir' : 'Pausar'}
          >
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70"
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Zone 3 — media */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {url ? (
            isVideo ? (
              <video
                ref={videoRef}
                src={url}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={url}
                alt={media?.name ?? ''}
                onLoad={() => setProgressStarted(true)}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : null}

          {/* Invisible nav zones */}
          <div className="absolute left-0 top-0 bottom-0 w-[38%] z-[5] cursor-pointer" />
          <div className="absolute right-0 top-0 bottom-0 w-[38%] z-[5] cursor-pointer" />
        </div>

        {/* Zone 4 — product cards (bottom-right, narrow stack) */}
        {productList.length > 0 && (
          <div className="absolute right-2.5 z-10 flex flex-col gap-1.5 pointer-events-none w-[58%] max-w-[200px]" style={{ bottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
            {productList.map((p) => (
              <div
                key={p.id}
                className="pointer-events-auto bg-white rounded-lg p-1.5 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
              >
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded-md object-cover bg-neutral-100 shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-neutral-100 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-neutral-900 truncate leading-tight">{p.name}</div>
                  <div className="text-[10px] text-neutral-500 leading-tight">{formatPrice(p.price)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openProduct(p)}
                  className="bg-neutral-900 text-white text-[9px] font-bold rounded-md px-2 py-1 shrink-0 hover:bg-neutral-700 transition-colors tracking-wide"
                >
                  COMPRAR
                </button>
              </div>
            ))}
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
            {/* Like */}
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

            {/* Comments */}
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

            {/* Share */}
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
                <X className="w-6 h-6" />
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
