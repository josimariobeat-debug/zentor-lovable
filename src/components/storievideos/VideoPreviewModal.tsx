import { useRef, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface VideoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: {url: string;type: string;} | null;
}

export default function VideoPreviewModal({ open, onOpenChange, media }: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open && media?.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [open, media]);

  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-0 bg-black border-0 overflow-hidden rounded-2xl">
        <button data-ev-id="ev_35d871e777"
        onClick={() => onOpenChange(false)}
        className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">

          <X className="w-4 h-4" />
        </button>
        <div data-ev-id="ev_4466de9b71" className="relative w-full aspect-[9/16] bg-black">
          {media.type === 'video' ?
          <video data-ev-id="ev_3603c3edcf"
          ref={videoRef}
          src={media.url}
          autoPlay
          controls
          playsInline
          className="w-full h-full object-contain" /> :


          <img data-ev-id="ev_0d5dd6b1c4" src={media.url} alt="" className="w-full h-full object-contain" />
          }
        </div>
      </DialogContent>
    </Dialog>);

}