import { useState, useRef, useCallback, memo } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { MediaThumbnail } from './MediaThumbnail';

interface GalleryCardProps {
  id: string;
  url: string;
  type: 'image' | 'video';
  name?: string;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  showDelete?: boolean;
  showName?: boolean;
  /** Em touch: 1º toque ativa o card, 2º toque executa onClick (preview). Default false. */
  twoTapPreview?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

/**
 * Card de galeria padronizado com:
 * - Two-tap interaction para touch (primeiro toque ativa, segundo executa)
 * - Long press para seleção em dispositivos touch
 * - Hover com botões de ação em desktop
 * - Lixeira no canto superior direito
 * - Play centralizado com hover de crescimento
 */
function GalleryCardComponent({
  id,
  url,
  type,
  name,
  isSelected = false,
  isSelectionMode = false,
  showDelete = true,
  showName = true,
  onSelect,
  onDelete,
  onClick
}: GalleryCardProps) {
  const [isActive, setIsActive] = useState(false); // Two-tap state
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartTime = useRef<number>(0);
  const hasMoved = useRef(false);

  // Detecta se é dispositivo touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsTouchDevice(true);
    touchStartTime.current = Date.now();
    hasMoved.current = false;

    // Long press para seleção (500ms)
    longPressTimer.current = setTimeout(() => {
      if (!hasMoved.current) {
        // Vibração hapática se disponível
        if (navigator.vibrate) navigator.vibrate(50);
        onSelect?.(id);
      }
    }, 500);
  }, [id, onSelect]);

  const handleTouchMove = useCallback(() => {
    hasMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const touchDuration = Date.now() - touchStartTime.current;

    // Se foi um toque rápido (não long press) e não moveu
    if (touchDuration < 500 && !hasMoved.current) {
      // Two-tap interaction
      if (!isActive) {
        // Primeiro toque - ativa o card
        setIsActive(true);
        e.preventDefault();
      } else {
        // Segundo toque - executa a ação
        if (isSelectionMode) {
          onSelect?.(id);
        } else {
          onClick?.(id);
        }
        setIsActive(false);
      }
    }
  }, [id, isActive, isSelectionMode, onClick, onSelect]);

  // Desativa quando perde foco (touch)
  const handleTouchCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Desktop: hover mostra ações
  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      setIsActive(true);
    }
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      setIsActive(false);
    }
  }, [isTouchDevice]);

  // Desktop: clique
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isTouchDevice) return; // Ignora em touch (já tratado)

    if (isSelectionMode) {
      onSelect?.(id);
    } else {
      onClick?.(id);
    }
  }, [id, isTouchDevice, isSelectionMode, onClick, onSelect]);

  // Clique na lixeira
  const handleDeleteClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete?.(id);
  }, [id, onDelete]);

  // Clique no checkbox de seleção
  const handleSelectClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(id);
  }, [id, onSelect]);

  return (
    <div data-ev-id="ev_3d346b2244"
    className={`group relative rounded-xl overflow-hidden border-2 bg-neutral-100 transition-all cursor-pointer select-none ${
    isSelected ?
    'border-neutral-900 ring-2 ring-neutral-900/20' :
    'border-neutral-200 hover:border-neutral-300'}`
    }
    onTouchStart={handleTouchStart}
    onTouchMove={handleTouchMove}
    onTouchEnd={handleTouchEnd}
    onTouchCancel={handleTouchCancel}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    onClick={handleClick}>

      {/* Thumbnail da mídia */}
      <MediaThumbnail
        src={url}
        type={type}
        alt={name || ''}
        isActive={isActive} />


      {/* Checkbox de seleção - canto superior esquerdo */}
      {(isSelectionMode || isSelected) &&
      <button data-ev-id="ev_836833ffc9"
      type="button"
      onClick={handleSelectClick}
      onTouchEnd={(e) => {e.stopPropagation();handleSelectClick(e);}}
      className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all z-20 ${
      isSelected ?
      'bg-neutral-900 text-white' :
      'bg-white/90 border-2 border-neutral-300 text-transparent'}`
      }>

          <Check className="w-4 h-4" />
        </button>
      }

      {/* Lixeira - canto superior direito */}
      {showDelete &&
      <button data-ev-id="ev_2221804482"
      type="button"
      onClick={handleDeleteClick}
      onTouchEnd={(e) => {e.stopPropagation();handleDeleteClick(e);}}
      className={`absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-red-600 transition-all z-20 ${
      isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`
      }>

          <Trash2 className="w-3.5 h-3.5" />
        </button>
      }

      {/* Nome do arquivo */}
      {showName &&
      <div data-ev-id="ev_6e8dd334f9" className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
          <p data-ev-id="ev_b7fb18d0c5" className="text-[11px] text-white truncate font-medium">
            {name || 'Sem nome'}
          </p>
        </div>
      }
    </div>);

}

export const GalleryCard = memo(GalleryCardComponent);