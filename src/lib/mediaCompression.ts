import imageCompression from 'browser-image-compression';

/**
 * Compressão e otimização de mídia para reprodução estilo Instagram.
 *
 * Imagens: redimensiona até 1920px, recodifica em Web Worker (q=0.82) sem
 * travar a UI. PNG só é recomprimido quando reduz ≥5% (evita inflar com alpha).
 *
 * Vídeos: transcode no browser exigiria FFmpeg.wasm (~30MB) e é proibitivo.
 * Em vez disso geramos um **poster JPG** do primeiro frame, que serve como
 * thumbnail/LCP instantâneo no player — o player começa pintando o poster
 * enquanto o vídeo ainda está bufferizando, eliminando o flash preto.
 *
 * Todos os uploads devem usar `STORAGE_UPLOAD_OPTIONS` para garantir
 * `cache-control: immutable, max-age=1 ano` no CDN — vital para fluidez em
 * reproduções repetidas e pré-carregamento.
 */

const IMAGE_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  initialQuality: 0.82,
  useWebWorker: true,
  fileType: undefined as string | undefined,
};

/** Cache agressivo: arquivos têm nome único (timestamp+random), são imutáveis. */
export const STORAGE_UPLOAD_OPTIONS = {
  cacheControl: '31536000', // 1 ano
  upsert: false,
} as const;

function isImage(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml';
}

function isVideo(file: File): boolean {
  return file.type.startsWith('video/');
}

export async function compressMedia(file: File): Promise<File> {
  try {
    if (!isImage(file)) return file;
    const options = { ...IMAGE_OPTIONS, fileType: file.type };
    const compressed = await imageCompression(file, options);
    if (compressed.size >= file.size * 0.95) return file;
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[mediaCompression] falhou, usando original:', err);
    return file;
  }
}

export async function compressMediaBatch(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressMedia(f)));
}

/**
 * Gera um poster JPG (~quality 0.82) do primeiro frame visível do vídeo.
 * Usado como `poster` no <video> para LCP instantâneo, sem flash preto.
 * Retorna null em falha — chamadores devem tolerar ausência.
 */
export async function generateVideoPoster(file: File): Promise<File | null> {
  if (!isVideo(file)) return null;
  if (typeof document === 'undefined') return null;

  return new Promise<File | null>((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    let settled = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      try { video.load(); } catch { /* ignore */ }
    };
    const finish = (out: File | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(out);
    };

    video.addEventListener('loadeddata', () => {
      // Avança um pouco para evitar frame preto inicial em alguns codecs.
      try { video.currentTime = Math.min(0.1, (video.duration || 1) * 0.02); } catch { /* ignore */ }
    });

    video.addEventListener('seeked', () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        // Limita 1280px no maior lado para poster leve.
        const max = 1280;
        const scale = Math.min(1, max / Math.max(w, h));
        const cw = Math.round(w * scale);
        const ch = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, cw, ch);
        canvas.toBlob(
          (blob) => {
            if (!blob) return finish(null);
            const name = file.name.replace(/\.[^.]+$/, '') + '.poster.jpg';
            finish(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
          },
          'image/jpeg',
          0.82,
        );
      } catch {
        finish(null);
      }
    });

    video.addEventListener('error', () => finish(null));
    // Safety timeout (5s) para não pendurar uploads em vídeos quebrados.
    window.setTimeout(() => finish(null), 5000);
  });
}
