import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COMIC_STYLES, type ComicStyle } from '@/types';

interface StyleSelectorProps {
  selectedStyle: ComicStyle;
  onStyleChange: (style: ComicStyle) => void;
  className?: string;
}

export function StyleSelector({ selectedStyle, onStyleChange, className }: StyleSelectorProps) {
  return (
    <div className={className}>
      <Select value={selectedStyle} onValueChange={(value: string) => onStyleChange(value as ComicStyle)}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="选择风格" />
        </SelectTrigger>
        <SelectContent>
          {COMIC_STYLES.map((style) => (
            <SelectItem key={style.value} value={style.value} className="text-xs">
              {style.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
