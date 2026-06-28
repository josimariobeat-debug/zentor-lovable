import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { url?: string | null; type?: string | null; name?: string | null } | null;
}

/**
 * Responsive media preview modal.
 * - Constrains content to 90vw / 90vh on any viewport
 * - Preserves the media's native aspect ratio via object-contain
 * - Centered horizontally/vertically inside the content area (sidebar-aware
 *   offset comes from the shared Dialog overlay)
 */
export default function MediaPreviewModal({ open, onOpenChange, media }: MediaPreviewModalProps) {
  const isVideo = media?.type === 'video';
  const url = media?.url ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 bg-black border-0 overflow-hidden rounded-2xl w-auto max-w-[90vw] max-h-[90vh] flex flex-col"
      >
        <div className="relative flex-1 min-h-0 flex items-center justify-center bg-black">
          {url ? (
            isVideo ? (
              <video
                src={url}
                autoPlay
                controls
                playsInline
                className="max-w-[90vw] max-h-[calc(90vh-3.25rem)] w-auto h-auto object-contain"
              />
            ) : (
              <img
                src={url}
                alt={media?.name ?? ''}
                className="max-w-[90vw] max-h-[calc(90vh-3.25rem)] w-auto h-auto object-contain"
              />
            )
          ) : null}
        </div>
        <div className="px-4 py-3 bg-black text-white shrink-0">
          <div className="text-[13.5px] font-medium truncate">
            {media?.name || 'Pré-visualização'}
          </div>
          <div className="text-[11.5px] text-neutral-400 mt-0.5">
            {isVideo ? 'Vídeo' : 'Imagem'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
