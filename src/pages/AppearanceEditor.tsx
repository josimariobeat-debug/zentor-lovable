import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, Monitor, Pause, Play, Send, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/toaster';
import { Switch } from '@/components/ui/switch';
import storyDemo2Asset from '@/assets/story-demo-2.mp4.asset.json';
import storyDemo2Poster from '@/assets/story-demo-2-poster.jpg.asset.json';
import storyDemo3Asset from '@/assets/story-demo-3.mp4.asset.json';
import storyDemo3Poster from '@/assets/story-demo-3-poster.jpg.asset.json';
import { getMediaProfile, getNetworkTier, rewriteImageForProfile, subscribeNetworkChange, type MediaProfile, type NetworkTier } from '@/lib/networkProfile';
import { storyMetrics } from '@/lib/storyMetrics';


const STORY_DEMO_2_URL = storyDemo2Asset.url;
const STORY_DEMO_2_POSTER = storyDemo2Poster.url;
const STORY_DEMO_3_URL = storyDemo3Asset.url;
const STORY_DEMO_3_POSTER = storyDemo3Poster.url;

interface DemoProduct { title: string; price: string; thumb: string }
interface DemoStory {
  type: 'video' | 'image';
  src: string;
  product: DemoProduct;
  products?: DemoProduct[]; // múltiplos cards empilhados; fallback para [product]
  duration?: number; // seconds, used for images
  poster?: string; // JPG do primeiro frame — LCP instantâneo para vídeos
}

const STORY_FLOW_LOGS_ENABLED = true;

function storyFlowLog(message: string, details?: Record<string, unknown>) {
  if (!STORY_FLOW_LOGS_ENABLED || typeof window === 'undefined') return;
  // Logs temporários de diagnóstico do autoplay: mostram exatamente onde o
  // fluxo para sem inundar o console a cada frame.
  // eslint-disable-next-line no-console
  console.info(`[stories:flow] ${message}`, details ?? '');
}

const DEMO_STORIES: DemoStory[] = [
  {
    type: 'video',
    src: STORY_DEMO_2_URL,
    poster: STORY_DEMO_2_POSTER,
    product: { title: 'Cropped last', price: 'R$ 109,99', thumb: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop' },
    products: [
      { title: 'Cropped last', price: 'R$ 109,99', thumb: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=120&h=120&fit=crop' },
      { title: 'Saia Ariella', price: 'R$ 109,99', thumb: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=120&h=120&fit=crop' },
    ],
  },
  {
    type: 'video',
    src: STORY_DEMO_3_URL,
    poster: STORY_DEMO_3_POSTER,
    product: { title: 'TV em destaque', price: 'R$ 2.499,00', thumb: STORY_DEMO_3_POSTER },
    products: [
      { title: 'TV 55" 4K', price: 'R$ 2.499,00', thumb: STORY_DEMO_3_POSTER },
      { title: 'Soundbar Pro', price: 'R$ 899,00', thumb: STORY_DEMO_3_POSTER },
    ],
  },
];

function StoryViewer({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  // Progress is intentionally NOT React state — updating 60×/s would re-render
  // the entire player (action column, product card, preloaders) and stutter the
  // transition. We mutate the DOM directly via refs to <div> bars.
  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const startedAtRef = useRef<number>(0);
  const accumRef = useRef<number>(0);
  const advancingRef = useRef(false);
  const timerStartedLogRef = useRef(false);
  const progressMilestoneRef = useRef(0);

  // Perfil adaptativo (rede + dispositivo). Reage a mudanças Wi-Fi ⇄ 4G.
  const [tier, setTier] = useState<NetworkTier>(() => (typeof navigator === 'undefined' ? 'high' : getNetworkTier()));
  useEffect(() => subscribeNetworkChange(() => setTier(getNetworkTier())), []);
  const profile: MediaProfile = useMemo(() => getMediaProfile(tier), [tier]);

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

  // Refs lidos pelo rAF — evita reiniciar o loop a cada mudança e mantém o
  // player montado (sem unmount/remount entre stories).
  const idxRef = useRef(idx);
  const isVideoRef = useRef(isVideo);
  const pausedRef = useRef(interactionPaused);
  const imgLoadedRef = useRef(false);
  const activeImgRef = useRef<HTMLImageElement | null>(null);

  const durationRef = useRef((current.duration ?? 5) * 1000);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { isVideoRef.current = isVideo; }, [isVideo]);
  useEffect(() => { pausedRef.current = interactionPaused; }, [interactionPaused]);
  useEffect(() => { durationRef.current = (current.duration ?? 5) * 1000; }, [current.duration]);

  // Aplica o preenchimento de uma barra diretamente no DOM (sem re-render).
  const setBar = (i: number, fill: number) => {
    const el = barRefs.current[i];
    if (el) el.style.transform = `scaleX(${fill})`;
  };
  const resetBarsFor = (active: number) => {
    for (let i = 0; i < DEMO_STORIES.length; i++) {
      setBar(i, i < active ? 1 : 0);
    }
  };

  const logProgressMilestone = (storyIndex: number, progress: number) => {
    const milestone = progress >= 1 ? 100 : progress >= 0.75 ? 75 : progress >= 0.5 ? 50 : progress >= 0.25 ? 25 : 0;
    if (milestone > progressMilestoneRef.current) {
      progressMilestoneRef.current = milestone;
      storyFlowLog(`Progresso: ${milestone}%`, { idx: storyIndex });
    }
  };

  const logTimerStarted = (storyIndex: number, type: DemoStory['type'], durationMs?: number) => {
    if (timerStartedLogRef.current) return;
    timerStartedLogRef.current = true;
    storyFlowLog('Timer iniciado', { idx: storyIndex, type, durationMs });
  };

  const goToStory = useCallback((target: number, reason: string) => {
    const from = idxRef.current;
    const to = (target + DEMO_STORIES.length) % DEMO_STORIES.length;

    if (advancingRef.current) {
      storyFlowLog('nextStory() ignorado: avanço já em andamento', { from, to, reason });
      return;
    }

    advancingRef.current = true;
    idxRef.current = to;
    // Pinta a barra anterior como cheia imediatamente (sem esperar rAF).
    setBar(from, reason === 'manual-prev' ? 0 : 1);
    const next = DEMO_STORIES[to];
    storyFlowLog('nextStory() chamado', { from, to, reason, nextType: next.type });
    // Métrica: marca o "end" antes da próxima mídia montar para medir o
    // gap real percebido (end → ready → firstFrame).
    storyMetrics.markEnd(from, to, next.type, next.src);
    setIdx(to);

    // Failsafe para o caso raro de transição para o mesmo índice (lista com 1 story)
    // ou render interrompido antes do useEffect de idx liberar o lock.
    window.setTimeout(() => {
      advancingRef.current = false;
    }, 180);
  }, []);

  const goNext = useCallback((reason = 'manual-next') => {
    goToStory(idxRef.current + 1, reason);
  }, [goToStory]);

  const goPrev = useCallback(() => {
    goToStory(idxRef.current - 1, 'manual-prev');
  }, [goToStory]);


  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (shareOpen) { setShareOpen(false); return; }
        if (commentsOpen) { setCommentsOpen(false); return; }
        onClose();
      }
      if (commentsOpen || shareOpen) return;
      if (e.key === 'ArrowRight') goNext('keyboard-next');
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, commentsOpen, shareOpen, goNext, goPrev]);

  // Watchdog: tempo em que o story atual montou. Se eventos de mídia
  // (onLoad de imagem ou loadedmetadata/duration de vídeo) não dispararem
  // dentro do timeout, forçamos o avanço pra não travar a barra.
  const mountedAtRef = useRef<number>(performance.now());
  const IMAGE_LOAD_TIMEOUT_MS = 3500; // assume carregada e começa a contar
  const VIDEO_READY_TIMEOUT_MS = 6000; // sem duration → pula
  const VIDEO_START_TIMEOUT_MS = 4500; // duration existe, mas play ficou preso no início
  // Marca o instante em que a barra do vídeo bateu ~100%. Alguns clipes têm
  // um trecho final estático (ex.: card de encerramento com marca d'água) em
  // que o navegador já reporta currentTime≈duration, mas o evento nativo
  // 'ended' só dispara segundos depois — dando a impressão de "travado" só
  // na transição automática (o toque manual chama goNext() direto, por isso
  // nunca trava). Se a barra ficar cheia por mais que essa margem sem o
  // 'ended' chegar, avançamos nós mesmos.
  const videoFullAtRef = useRef<number>(0);
  const VIDEO_END_GRACE_MS = 1200;
  // Watchdog adicional: alguns vídeos travam (rede instável, decoder em
  // backoff, último frame estático) sem disparar 'ended' E sem chegar a
  // currentTime≈duration — então o watchdog de "barra cheia" nunca aciona.
  // Detectamos via currentTime que não avança por X ms enquanto não estamos
  // pausados. Resetado a cada troca de story e a cada vez que o tempo anda.
  const lastVideoTimeRef = useRef<number>(0);
  const lastVideoTimeAtRef = useRef<number>(0);
  const VIDEO_FROZEN_MS = 2000;

  // Reset progresso e timers ao trocar de story — direto no DOM, sem re-render.
  useEffect(() => {
    accumRef.current = 0;
    startedAtRef.current = 0;
    imgLoadedRef.current = false;
    advancingRef.current = false;
    timerStartedLogRef.current = false;
    progressMilestoneRef.current = 0;
    mountedAtRef.current = performance.now();
    videoFullAtRef.current = 0;
    lastVideoTimeRef.current = 0;
    lastVideoTimeAtRef.current = performance.now();
    resetBarsFor(idx);
    storyFlowLog('Índice alterado', { idx, type: current.type });
    storyFlowLog('Story iniciado', { idx, type: current.type, src: current.src });
  }, [idx]);

  // Loop rAF único, vivo durante toda a vida do componente.
  // Lê tudo via refs → não reinicia entre stories e não dispara setState por frame.
  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const tick = (now: number) => {
      if (cancelled) return;
      try {
      if (advancingRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const i = idxRef.current;
      const sinceMount = now - mountedAtRef.current;
      if (isVideoRef.current) {
        const v = videoRef.current;
        if (v && v.duration > 0 && !Number.isNaN(v.duration)) {
          const fill = Math.min(1, v.currentTime / v.duration);
          setBar(i, fill);

          // Sinal direto do navegador: vídeo terminou mesmo que 'ended' tenha
          // sido perdido (perda de evento em troca rápida de aba/idx).
          logProgressMilestone(i, fill);

          if (!pausedRef.current && !v.paused && fill > 0) {
            logTimerStarted(i, 'video', Math.round(v.duration * 1000));
          }

          if (!pausedRef.current && v.currentTime <= 0.1 && sinceMount > VIDEO_START_TIMEOUT_MS) {
            mountedAtRef.current = now;
            storyMetrics.markStuck(i, 'video-timeout');
            setBar(i, 1);
            goNext('video-start-timeout');
            raf = requestAnimationFrame(tick);
            return;
          }

          if (v.ended || fill >= 1 || v.currentTime >= v.duration - 0.05) {
            videoFullAtRef.current = 0;
            mountedAtRef.current = now;
            setBar(i, 1);
            goNext(v.ended ? 'video-ended-event-or-flag' : 'video-currentTime-complete');
            raf = requestAnimationFrame(tick);
            return;
          }

          // Detecta congelamento: currentTime não avança por VIDEO_FROZEN_MS
          // enquanto deveria estar tocando (cobre o caso "barra para no meio
          // ou perto do fim e o player nunca dispara 'ended'").
          if (!pausedRef.current) {
            if (v.currentTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = v.currentTime;
              lastVideoTimeAtRef.current = now;
            } else if (
              lastVideoTimeAtRef.current > 0 &&
              now - lastVideoTimeAtRef.current > VIDEO_FROZEN_MS &&
              // só consideramos "congelado" se já passamos do começo (evita
              // pular vídeos que ainda estão iniciando o buffer)
              v.currentTime > 0.1
            ) {
              videoFullAtRef.current = 0;
              mountedAtRef.current = now;
              lastVideoTimeAtRef.current = now;
              storyMetrics.markStuck(i, 'video-end-stall');
              setBar(i, 1);
              goNext('video-frozen-watchdog');
              raf = requestAnimationFrame(tick);
              return;
            }
          } else {
            lastVideoTimeAtRef.current = now;
          }

          if (fill >= 0.995) {
            if (videoFullAtRef.current === 0) {
              videoFullAtRef.current = now;
            } else if (now - videoFullAtRef.current > VIDEO_END_GRACE_MS) {
              videoFullAtRef.current = 0;
              mountedAtRef.current = now;
              storyMetrics.markStuck(i, 'video-end-stall');
              setBar(i, 1);
              goNext('video-full-bar-watchdog');
              raf = requestAnimationFrame(tick);
              return;
            }
          } else {
            videoFullAtRef.current = 0;
          }
        } else if (sinceMount > VIDEO_READY_TIMEOUT_MS) {
          mountedAtRef.current = now;
          storyMetrics.markStuck(i, 'video-timeout');
          setBar(i, 1);
          goNext('video-ready-timeout');
          raf = requestAnimationFrame(tick);
          return;
        }
        raf = requestAnimationFrame(tick);
        return;
      }
      if (!imgLoadedRef.current) {
        // Fallback: se onLoad/ref não dispararam no tempo esperado, assume
        // que a imagem está pronta (cache silencioso, decoder lento, etc).
        if (sinceMount > IMAGE_LOAD_TIMEOUT_MS) {
          imgLoadedRef.current = true;
          storyMetrics.markStuck(i, 'image-timeout');
        } else {
          raf = requestAnimationFrame(tick);
          return;
        }
      }
      if (pausedRef.current) {
        startedAtRef.current = 0;
        raf = requestAnimationFrame(tick);
        return;
      }
      if (startedAtRef.current === 0) startedAtRef.current = now;
      logTimerStarted(i, 'image', durationRef.current);
      const elapsed = accumRef.current + (now - startedAtRef.current);
      const p = Math.min(1, elapsed / durationRef.current);
      setBar(i, p);
      logProgressMilestone(i, p);
      if (p >= 1) {
        accumRef.current = durationRef.current;
        goNext('image-duration-complete');
      }
      raf = requestAnimationFrame(tick);
      } catch (err) {
        // Blindagem: um erro num único frame não pode matar o loop inteiro.
        // Sem isso, o avanço automático para silenciosamente para sempre
        // (toques manuais continuam funcionando porque são onClick separados).
        // eslint-disable-next-line no-console
        console.warn('[stories] tick error, continuando loop:', err);
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => { cancelled = true; if (raf) cancelAnimationFrame(raf); };
  }, [goNext]);



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
    // iOS/iPadOS require playsinline attributes BEFORE play() or it goes fullscreen / drops audio.
    (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', 'true');
    v.setAttribute('x5-playsinline', 'true');
    v.muted = muted;
    if (!muted) v.volume = 1;

    // Tentativa robusta de play com retry usando o estado de mudo/volume *atual*.
    // iOS bloqueia por: política de autoplay, mudança de página, AirPlay, audio session
    // perdida e até stalls de rede. Em qualquer dessas situações, retentamos —
    // primeiro com o som pedido, depois caindo para mudo se necessário.
    let retryTimer = 0;
    let retryCount = 0;
    const tryPlay = () => {
      const cur = videoRef.current;
      if (!cur) return;
      // Re-aplica estado de áudio sempre que retentamos (usuário pode ter alternado mudo).
      cur.muted = muted;
      if (!muted) cur.volume = 1;
      const p = cur.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          if (!cur.muted && retryCount < 1) {
            // Primeira falha com som: cai para mudo e tenta de novo (gesto pendente).
            cur.muted = true;
            setMuted(true);
            retryCount += 1;
            retryTimer = window.setTimeout(tryPlay, 120);
          } else if (retryCount < 3) {
            // Backoff curto para stalls/interrupções (AirPlay, audio session, etc.)
            retryCount += 1;
            retryTimer = window.setTimeout(tryPlay, 250 * retryCount);
          }
        });
      }
    };

    const onEnd = () => goNext('video-ended-event');
    const onPauseUnexpected = () => {
      // iOS às vezes pausa sozinho ao retomar do background; retentamos se não pedimos pause.
      if (!interactionPaused && !paused) retryTimer = window.setTimeout(tryPlay, 60);
    };
    const onStalled = () => { retryTimer = window.setTimeout(tryPlay, 200); };
    const onVisibility = () => { if (!document.hidden) tryPlay(); };

    const onLoadedData = () => {
      storyFlowLog('Vídeo carregado', { idx: idxRef.current, duration: v.duration });
    };
    const onPlaying = () => {
      logTimerStarted(idxRef.current, 'video', Number.isFinite(v.duration) ? Math.round(v.duration * 1000) : undefined);
      storyFlowLog('Story seguinte carregado', { idx: idxRef.current, type: 'video' });
    };

    v.addEventListener('ended', onEnd);
    v.addEventListener('loadeddata', onLoadedData);
    v.addEventListener('playing', onPlaying);
    v.addEventListener('pause', onPauseUnexpected);
    v.addEventListener('stalled', onStalled);
    v.addEventListener('suspend', onStalled);
    document.addEventListener('visibilitychange', onVisibility);
    tryPlay();

    return () => {
      window.clearTimeout(retryTimer);
      v.removeEventListener('ended', onEnd);
      v.removeEventListener('loadeddata', onLoadedData);
      v.removeEventListener('playing', onPlaying);
      v.removeEventListener('pause', onPauseUnexpected);
      v.removeEventListener('stalled', onStalled);
      v.removeEventListener('suspend', onStalled);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [idx, isVideo, muted, goNext, interactionPaused, paused]);

  // Pause/resume on toggle (including comments/share overlays)
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current; if (!v) return;
    if (interactionPaused) v.pause(); else v.play().catch(() => {});
  }, [interactionPaused, isVideo, idx]);



  const togglePlay = useCallback(() => {

    setPaused((p) => {
      if (!isVideoRef.current) {
        if (p) {
          startedAtRef.current = performance.now();
        } else {
          accumRef.current = accumRef.current + (performance.now() - startedAtRef.current);
        }
      }
      return !p;
    });
  }, []);

  const toggleMute = useCallback(() => {
    // Run synchronously inside the click/tap handler so iOS treats it as a user gesture.
    const v = videoRef.current;
    setMuted((prev) => {
      const next = !prev;
      if (v) {
        (v as HTMLVideoElement & { playsInline?: boolean }).playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', 'true');
        v.muted = next;
        v.volume = 1;
        if (!next) {
          const p = v.play();
          if (p && typeof p.then === 'function') {
            p.catch(() => {
              v.muted = true;
              setMuted(true);
            });
          }
        }
      }
      return next;
    });
  }, []);

  const toggleLike = useCallback(() => {
    setLiked((prev) => {
      const wasLiked = !!prev[idxRef.current];
      if (!wasLiked) {
        setLikeBurst(true);
        window.setTimeout(() => setLikeBurst(false), 600);
      }
      return { ...prev, [idxRef.current]: !wasLiked };
    });
  }, []);

  const openComments = useCallback(() => setCommentsOpen(true), []);
  const closeComments = useCallback(() => setCommentsOpen(false), []);
  const closeShare = useCallback(() => setShareOpen(false), []);

  const handleShare = useCallback(async () => {
    const cur = DEMO_STORIES[idxRef.current];
    const shareData = {
      title: cur.product.title,
      text: `Confira: ${cur.product.title}`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
    if (nav?.share) {
      try { await nav.share(shareData); return; } catch { /* user cancelled — fall through */ }
    }
    setShareOpen(true);
  }, []);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, []);

  // Limpa o cache de preloads ao desmontar para não vazar entre sessões.
  useEffect(() => () => {
    DEMO_STORIES.forEach((s) => storyMetrics.clearPreload(s.src));
  }, []);



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
        {/* Zone 1 — progress bars (padronizado com MediaPreviewModal) */}
        <div className="absolute left-2 right-2 flex gap-1 z-30" style={{ top: 'max(10px, env(safe-area-inset-top))' }}>
          {DEMO_STORIES.map((_, i) => (
            <div key={i} className="flex-1 h-[2.5px] bg-white/30 rounded-full overflow-hidden">
              <div
                ref={(el) => { barRefs.current[i] = el; }}
                className="h-full w-full bg-white rounded-full origin-left"
                style={{
                  transform: `scaleX(${i < idx ? 1 : 0})`,
                  willChange: 'transform',
                }}
              />
            </div>
          ))}
        </div>

        {/* Zone 2 — top controls (padronizado com MediaPreviewModal) */}
        <div className="absolute right-3 z-30 flex items-center gap-2.5" style={{ top: 'calc(max(10px, env(safe-area-inset-top)) + 14px)' }}>
          <button onClick={togglePlay} aria-label={paused ? 'Reproduzir' : 'Pausar'} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70 transition-colors">
            {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? 'Ativar som' : 'Silenciar'} className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70 transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border-0 flex items-center justify-center text-white cursor-pointer hover:bg-black/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>


        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl" style={{ aspectRatio: '9 / 16' }}>
          {isVideo ? (
            <video
              ref={videoRef}
              key={`v-${idx}`}
              src={current.src}
              poster={current.poster}
              autoPlay
              muted={muted}
              playsInline
              preload="auto"
              disableRemotePlayback
              className="absolute inset-0 w-full h-full object-cover"
              // Métrica: loadeddata = bytes suficientes para começar.
              onLoadedData={() => storyMetrics.markReady(current.src)}
              // playing = decoder enviou primeiro frame ao compositor (paint iminente).
              onPlaying={() => storyMetrics.markFirstFrame(current.src)}
            />
          ) : (
            <img
              key={`i-${idx}`}
              ref={(el) => {
                activeImgRef.current = el;
                // Imagens em cache disparam 'load' ANTES do onLoad anexar →
                // imgLoadedRef ficaria false e a barra travaria pra sempre.
                // Detectamos via .complete no ref callback (roda no commit).
                if (el && el.complete && el.naturalHeight > 0) {
                  imgLoadedRef.current = true;
                  storyFlowLog('Imagem carregada', { idx, cached: true });
                  storyFlowLog('Story seguinte carregado', { idx, type: 'image' });
                  storyMetrics.markReady(current.src);
                  requestAnimationFrame(() => storyMetrics.markFirstFrame(current.src));
                }
              }}
              src={rewriteImageForProfile(current.src, profile)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              onLoad={() => {
                imgLoadedRef.current = true;
                storyFlowLog('Imagem carregada', { idx, cached: false });
                storyFlowLog('Story seguinte carregado', { idx, type: 'image' });
                storyMetrics.markReady(current.src);
                requestAnimationFrame(() => storyMetrics.markFirstFrame(current.src));
              }}
              onError={() => { imgLoadedRef.current = true; }}
            />
          )}


          {/* Pré-carrega TODAS as outras mídias com chaves estáveis por URL.
              Elementos persistem entre trocas de story → bytes ficam quentes em
              cache do browser + decoder de mídia, eliminando "tela preta" na
              transição. Em 2G/Save-Data, profile.videoPreload="none" só baixa
              os headers, então ainda economizamos dados.
              Cada elemento chama storyMetrics.markPreloaded ao terminar,
              permitindo medir se a próxima mídia estava quente antes do "end". */}
          {(() => {
            // Janela de prioridade: idx+1 (próximo) e idx+2 (subsequente) recebem
            // preload="auto" / fetchpriority="high" mesmo em rede baixa — é a
            // janela em que o usuário tende a avançar antes do auto-advance.
            // idx+1 ganha prioridade máxima ("high"), idx+2 fica em "auto"
            // (download em paralelo sem competir com a mídia em tela).
            // Demais stories seguem o perfil adaptativo para poupar dados.
            const total = DEMO_STORIES.length;
            const nextIdx = (idx + 1) % total;
            const next2Idx = (idx + 2) % total;
            return (
              <div aria-hidden className="hidden">
                {DEMO_STORIES.map((s, i) => {
                  if (i === idx) return null;
                  const isNext = i === nextIdx;
                  const isNext2 = i === next2Idx && next2Idx !== nextIdx;
                  const priority = isNext || isNext2;
                  return s.type === 'video' ? (
                    <video
                      key={`pre-${s.src}`}
                      src={s.src}
                      poster={s.poster}
                      preload={priority ? 'auto' : profile.videoPreload}
                      muted
                      playsInline
                      onLoadedData={() => storyMetrics.markPreloaded(s.src)}
                    />
                  ) : (
                    <img
                      key={`pre-${s.src}`}
                      src={rewriteImageForProfile(s.src, profile)}
                      alt=""
                      decoding="async"
                      loading="eager"
                      {...(isNext ? { fetchPriority: 'high' as const } : isNext2 ? { fetchPriority: 'auto' as const } : {})}
                      onLoad={() => storyMetrics.markPreloaded(s.src)}
                    />
                  );
                })}
              </div>
            );
          })()}





          {/* Instagram-style tap zones for prev/next.
              Recuamos a base para que o bottom action bar + cards de produto
              capturem seus próprios cliques sem hijack das tap zones. */}
          <button
            aria-label="Anterior"
            onClick={goPrev}
            className="absolute left-0 top-12 w-[30%] z-10 cursor-default"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 180px)' }}
          />
          <button
            aria-label="Próximo"
            onClick={() => goNext('manual-next')}
            className="absolute top-12 z-10 cursor-default"
            style={{
              left: '30%',
              right: 'env(safe-area-inset-right, 0px)',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 180px)',
            }}
          />


          {/* Heart burst on double-like (centered) */}
          {likeBurst && (
            <div className="absolute inset-0 z-20 grid place-items-center pointer-events-none">
              <Heart className="w-28 h-28 text-white drop-shadow-2xl animate-[heartPulse_.6s_ease-out]" fill="currentColor" />
            </div>
          )}

          {/* Zone 4 — product cards (padronizado: bottom-right, w-[58%] max-w-[200px]) */}
          <div
            className="absolute right-2.5 z-20 flex flex-col gap-1.5 pointer-events-none w-[58%] max-w-[200px]"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}
          >
            {(current.products && current.products.length > 0 ? current.products : [current.product])
              .slice(0, 3)
              .map((p, i) => (
                <div
                  key={`${idx}-prod-${i}`}
                  className="pointer-events-auto bg-white rounded-lg p-1.5 flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                >
                  <img src={p.thumb} alt="" className="w-8 h-8 rounded-md object-cover bg-neutral-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-neutral-900 truncate leading-tight">{p.title}</div>
                    <div className="text-[10px] text-neutral-500 leading-tight">{p.price}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-neutral-900 text-white text-[9px] font-bold rounded-md px-2 py-1 shrink-0 hover:bg-neutral-700 transition-colors tracking-wide"
                  >
                    COMPRAR
                  </button>
                </div>
              ))}
          </div>

          {/* Zone 5 — bottom bar (padronizado com MediaPreviewModal) */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#111] flex items-center px-3.5 gap-3 z-30"
            style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <button
              onClick={openComments}
              className="flex-1 bg-transparent border border-white/30 text-white/60 rounded-full px-4 py-1.5 text-[13px] text-left cursor-pointer hover:border-white/50 transition-colors"
            >
              Comentar
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                aria-label={isLiked ? 'Descurtir' : 'Curtir'}
                aria-pressed={isLiked}
                className="flex items-center justify-center bg-transparent border-0 cursor-pointer text-white p-0"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 stroke-red-500' : ''}`} />
              </button>
              <button
                onClick={openComments}
                aria-label="Comentar"
                className="relative flex items-center justify-center bg-transparent border-0 cursor-pointer text-white p-0"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleShare}
                aria-label="Compartilhar"
                className="flex items-center justify-center bg-transparent border-0 cursor-pointer p-0"
              >
                <Send className="w-5 h-5 text-white" style={{ transform: 'rotate(3deg)' }} />
              </button>
            </div>
          </div>
          <div
            className="absolute right-2 text-[10px] font-bold text-white/70 tracking-wider z-30 pointer-events-none"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 170px)' }}
          >PLANWEB</div>


          {/* Comments panel — bottom sheet inside the player frame */}
          {commentsOpen && (
            <div
              className="absolute inset-0 z-40 flex flex-col justify-end"
              onClick={closeComments}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative bg-white rounded-t-2xl max-h-[70%] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-neutral-100">
                  <div className="w-10 h-1 rounded-full bg-neutral-300 mx-auto absolute left-1/2 -translate-x-1/2 top-1.5" />
                  <h3 className="text-sm font-semibold text-neutral-900 mt-2">Comentários</h3>
                  <button onClick={closeComments} aria-label="Fechar comentários" className="w-8 h-8 rounded-full hover:bg-neutral-100 grid place-items-center text-neutral-600 mt-1">
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
              onClick={closeShare}
            >
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="relative w-full sm:w-[88%] bg-white rounded-t-2xl sm:rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-neutral-900">Compartilhar</h3>
                  <button onClick={closeShare} aria-label="Fechar" className="w-8 h-8 rounded-full hover:bg-neutral-100 grid place-items-center text-neutral-600">
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

/**
 * Capa do widget: usa o PRIMEIRO story (DEMO_STORIES[0]). Quando é vídeo,
 * reproduz em loop apenas os 3 primeiros segundos — espelha o comportamento
 * aplicado no bubble do widget público da loja.
 */
const BUBBLE_LOOP_SECONDS = 3;

function PreviewMedia({ fit }: { fit: MediaFit }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const first = DEMO_STORIES[0];
  const isVideo = first?.type === 'video';

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return;
    const onTime = () => {
      if (v.currentTime >= BUBBLE_LOOP_SECONDS) {
        try { v.currentTime = 0; } catch { /* ignore */ }
        v.play().catch(() => {});
      }
    };
    v.addEventListener('timeupdate', onTime);
    return () => v.removeEventListener('timeupdate', onTime);
  }, [isVideo]);

  const commonStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: fit,
    borderRadius: 'inherit',
    pointerEvents: 'none',
  };

  if (!first) return null;
  if (!isVideo) {
    return <img src={first.src} alt="" style={commonStyle} />;
  }
  return (
    <video
      ref={videoRef}
      src={first.src}
      poster={first.poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      style={commonStyle}
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

  // Pré-aquece TODOS os stories de demo assim que a página de edição carrega.
  // Quando o usuário abrir o preview do reprodutor, o primeiro frame já está
  // em cache de disco/HTTP e não há travamento inicial. Respeita o perfil de
  // rede: em 2G/Save-Data o warm-up é pulado para não consumir dados móveis.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const profile = getMediaProfile();
    if (profile.preloadCount === 0) return;
    const cleanups: Array<() => void> = [];
    DEMO_STORIES.forEach((s) => {
      if (s.type === 'image') {
        const img = new Image();
        img.decoding = 'async';
        img.src = rewriteImageForProfile(s.src, profile);
        cleanups.push(() => { img.src = ''; });
      } else {
        // Warm-up do poster (LCP instantâneo ao abrir o story).
        if (s.poster) {
          const pimg = new Image();
          pimg.decoding = 'async';
          pimg.src = s.poster;
          cleanups.push(() => { pimg.src = ''; });
        }
        const v = document.createElement('video');
        v.preload = profile.videoPreload;
        v.muted = true;
        v.playsInline = true;
        if (s.poster) v.poster = s.poster;
        v.src = s.src;
        cleanups.push(() => { v.removeAttribute('src'); try { v.load(); } catch { /* ignore */ } });
      }
    });
    return () => { cleanups.forEach((fn) => fn()); };
  }, []);



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
                            onClick={(e) => e.stopPropagation()}

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
                            onClick={(e) => e.stopPropagation()}
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
      {/* Modal de preview removido a pedido — clique no widget é no-op aqui. */}
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
