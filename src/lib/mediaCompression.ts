import imageCompression from 'browser-image-compression';

/**
 * Compressão automática de mídia preservando qualidade visual.
 *
 * Imagens: redimensiona até 1920px no maior lado, recodifica com qualidade alta
 * (0.82) usando Web Worker para não travar a UI. Mantém o formato original;
 * PNG só é recomprimido quando reduz tamanho de forma significativa (caso
 * contrário pode inflar por causa do alpha).
 *
 * Vídeos: compressão real exigiria FFmpeg.wasm (~30MB) e tempo de transcode
 * proibitivo no browser. Retornamos o arquivo original — o servidor/CDN cuida
 * de range requests e o player faz streaming progressivo.
 */

const IMAGE_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  initialQuality: 0.82,
  useWebWorker: true,
  fileType: undefined as string | undefined,
};

function isImage(file: File): boolean {
  return file.type.startsWith('image/') && file.type !== 'image/gif' && file.type !== 'image/svg+xml';
}

export async function compressMedia(file: File): Promise<File> {
  try {
    if (!isImage(file)) return file;

    // PNGs com transparência: tentar manter formato; se não reduzir, devolve original.
    const options = { ...IMAGE_OPTIONS, fileType: file.type };
    const compressed = await imageCompression(file, options);

    // Se a compressão não melhorou (ou piorou), mantém o original.
    if (compressed.size >= file.size * 0.95) return file;

    // Garante que volte como File (alguns browsers retornam Blob).
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
