import MediaPreviewModal from './MediaPreviewModal';

interface VideoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: { url: string; type: string; name?: string | null } | null;
}

/** @deprecated use MediaPreviewModal directly */
export default function VideoPreviewModal({ open, onOpenChange, media }: VideoPreviewModalProps) {
  return <MediaPreviewModal open={open} onOpenChange={onOpenChange} media={media} />;
}
