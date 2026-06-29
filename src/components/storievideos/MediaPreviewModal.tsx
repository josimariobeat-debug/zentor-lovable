import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { url?: string | null; type?: string | null; name?: string | null } | null;
}

/**
 * Responsive media preview modal.
 * - Constrained to 80vh / 90vw on any viewport
 * - Media fills the entire modal (object-cover) for a clean, edge-to-edge look
 */
export default function MediaPreviewModal({ open, onOpenChange, media }: MediaPreviewModalProps) {
  const isVideo = media?.type === 'video';
  const url = media?.url ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 bg-black border-0 overflow-hidden rounded-2xl w-auto max-w-[90vw] max-h-[80vh] h-[80vh] aspect-[9/16] flex"
      >
        {url ? (
          isVideo ? (
            <video
              src={url}
              autoPlay
              controls
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={url}
              alt={media?.name ?? ''}
              className="w-full h-full object-cover"
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
