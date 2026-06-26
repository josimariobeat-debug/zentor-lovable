import { useState, useRef, memo } from 'react';
import { Play } from 'lucide-react';

interface MediaThumbnailProps {
  src: string;
  type: 'image' | 'video';
  alt?: string;
  className?: string;
  showPlayIcon?: boolean;
  isActive?: boolean; // Para two-tap interaction
}

/**
 * Componente padronizado de miniatura de mídia.
 * Aspect ratio padrão: 3:4 (portrait, ideal para stories)
 * Overlay consistente com ícone de play para vídeos
 */
function MediaThumbnailComponent({
  src,
  type,
  alt = '',
  className = '',
  showPlayIcon = true,
  isActive = false
}: MediaThumbnailProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    video.currentTime = 0.5;
  };

  const handleVideoSeeked = () => {
    setIsLoaded(true);
  };

  return (
    <div data-ev-id="ev_27c8d7fd69" className={`relative overflow-hidden bg-neutral-200 aspect-[3/4] ${className}`}>
      {/* Placeholder enquanto carrega */}
      {!isLoaded && !hasError &&
      <div data-ev-id="ev_8b916f484c" className="absolute inset-0 bg-neutral-200 flex items-center justify-center z-10">
          <div data-ev-id="ev_fd6cf7b607" className="w-10 h-10 rounded-full bg-neutral-300/80 flex items-center justify-center animate-pulse">
            <Play className="w-4 h-4 text-neutral-400 ml-0.5" strokeWidth={0} fill="currentColor" />
          </div>
        </div>
      }

      {/* Conteúdo da mídia */}
      {type === 'video' ?
      <video data-ev-id="ev_6faf73660b"
      ref={videoRef}
      src={`${src}#t=0.5`}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      muted
      playsInline
      preload="metadata"
      onLoadedData={handleVideoLoad}
      onSeeked={handleVideoSeeked}
      onError={() => {setHasError(true);setIsLoaded(true);}} /> :


      <img data-ev-id="ev_60feb4797a"
      src={src}
      alt={alt}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      onLoad={() => setIsLoaded(true)}
      onError={() => {setHasError(true);setIsLoaded(true);}} />

      }

      {/* Overlay com ícone de play para vídeos - com hover de crescimento */}
      {type === 'video' && showPlayIcon && isLoaded && !hasError &&
      <div data-ev-id="ev_465e4d25c4" className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div data-ev-id="ev_c01787ddaf" className={`w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
            <Play className="w-4 h-4 fill-neutral-900 ml-0.5" strokeWidth={0} />
          </div>
        </div>
      }

      {/* Fallback de erro */}
      {hasError &&
      <div data-ev-id="ev_addd5edcd4" className="absolute inset-0 bg-neutral-300 flex items-center justify-center">
          <div data-ev-id="ev_c5a1ac02ed" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
            <Play className="w-4 h-4 text-neutral-500 ml-0.5" strokeWidth={0} fill="currentColor" />
          </div>
        </div>
      }
    </div>);

}

export const MediaThumbnail = memo(MediaThumbnailComponent);