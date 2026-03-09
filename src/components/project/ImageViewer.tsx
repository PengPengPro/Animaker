import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ImageViewerProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageViewer({ imageUrl, onClose }: ImageViewerProps) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl p-0 overflow-hidden bg-black/95 border-none shadow-none flex items-center justify-center">
        <div className="relative w-full h-full flex flex-col items-center justify-center p-2 md:p-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 md:top-4 md:right-4 z-50 bg-white/10 hover:bg-white/30 text-white rounded-full transition-all"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
          {imageUrl && (
            <div className="w-full h-fit flex items-center justify-center overflow-hidden">
              <img
                src={imageUrl}
                alt="漫画大图"
                className="max-w-full max-h-[85vh] object-contain shadow-2xl"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
