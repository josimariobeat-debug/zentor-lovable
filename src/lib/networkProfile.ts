/**
 * Perfil de rede + dispositivo usado para decidir pré-carregamento e
 * bitrate adaptativo no player de Stories.
 *
 * Estratégia (alinhada com o que Instagram/TikTok fazem no app):
 * - `effectiveType` e `saveData` da Network Information API ditam o tier.
 * - `deviceMemory` e `hardwareConcurrency` rebaixam o tier em devices fracos.
 * - Tier define: (a) quantos próximos stories pré-carregar, (b) `preload`
 *   do <video>, (c) largura-alvo de imagens (param `w=` em CDNs tipo
 *   Unsplash/Supabase image transform).
 *
 * SSR-safe: tudo aqui só toca `navigator` dentro das funções.
 */

export type NetworkTier = 'low' | 'mid' | 'high';

type NavConnection = {
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g' | string;
  saveData?: boolean;
  downlink?: number; // Mbps
  addEventListener?: (type: 'change', cb: () => void) => void;
  removeEventListener?: (type: 'change', cb: () => void) => void;
};

function getConnection(): NavConnection | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const n = navigator as Navigator & {
    connection?: NavConnection;
    mozConnection?: NavConnection;
    webkitConnection?: NavConnection;
  };
  return n.connection || n.mozConnection || n.webkitConnection;
}

export function getNetworkTier(): NetworkTier {
  const c = getConnection();
  if (c?.saveData) return 'low';
  const et = c?.effectiveType;
  if (et === 'slow-2g' || et === '2g') return 'low';
  if (et === '3g') return 'mid';
  // downlink em Mbps quando disponível
  if (typeof c?.downlink === 'number') {
    if (c.downlink < 1.5) return 'low';
    if (c.downlink < 5) return 'mid';
  }
  if (typeof navigator !== 'undefined') {
    const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    if ((typeof dm === 'number' && dm <= 2) || (typeof cores === 'number' && cores <= 2)) {
      return 'mid';
    }
  }
  return 'high';
}

export interface MediaProfile {
  /** Quantos próximos stories pré-carregar (0 desliga). */
  preloadCount: 0 | 1 | 2;
  /** Atributo `preload` recomendado para <video> do próximo story. */
  videoPreload: 'none' | 'metadata' | 'auto';
  /** Largura-alvo para imagens (px) usada em CDNs com query `w=`. */
  imageWidth: number;
}

export function getMediaProfile(tier: NetworkTier = getNetworkTier()): MediaProfile {
  switch (tier) {
    case 'low':
      return { preloadCount: 0, videoPreload: 'none', imageWidth: 480 };
    case 'mid':
      return { preloadCount: 1, videoPreload: 'metadata', imageWidth: 720 };
    case 'high':
    default:
      return { preloadCount: 2, videoPreload: 'auto', imageWidth: 1080 };
  }
}

/**
 * Reescreve URL de imagem para a largura-alvo do perfil.
 * Suporta Unsplash (`w=`, `q=`) e Supabase Storage `render/image` (`width=`, `quality=`).
 * URLs desconhecidas são devolvidas intactas.
 */
export function rewriteImageForProfile(url: string, profile: MediaProfile): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    const host = u.hostname;
    const isUnsplash = /(^|\.)unsplash\.com$/.test(host);
    const isSupabaseRender = u.pathname.includes('/storage/v1/render/image/');
    if (isUnsplash) {
      u.searchParams.set('w', String(profile.imageWidth));
      u.searchParams.set('q', profile.imageWidth <= 480 ? '60' : '75');
      if (!u.searchParams.get('auto')) u.searchParams.set('auto', 'format');
      return u.toString();
    }
    if (isSupabaseRender) {
      u.searchParams.set('width', String(profile.imageWidth));
      u.searchParams.set('quality', profile.imageWidth <= 480 ? '55' : '72');
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** Escuta mudanças de conexão (Wi-Fi ⇄ 4G) e chama o callback. */
export function subscribeNetworkChange(cb: () => void): () => void {
  const c = getConnection();
  if (!c?.addEventListener) return () => {};
  c.addEventListener('change', cb);
  return () => c.removeEventListener?.('change', cb);
}
