import { forwardRef, useRef, useImperativeHandle, KeyboardEvent } from 'react';
import { Bold } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BoldableTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onValueChange: (next: string) => void;
  /**
   * 'markdown' wraps the current selection with `**...**`.
   * 'html'     wraps it with `<strong>...</strong>` (for fields that
   *            store raw HTML, e.g. the Summary block).
   */
  mode?: 'markdown' | 'html';
}

export const BoldableTextarea = forwardRef<HTMLTextAreaElement, BoldableTextareaProps>(
  ({ value, onValueChange, mode = 'markdown', className, ...rest }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const wrapSelection = () => {
      const el = innerRef.current;
      if (!el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const before = value.slice(0, start);
      const selected = value.slice(start, end) || 'bold text';
      const after = value.slice(end);
      const [open, close] = mode === 'html' ? ['<strong>', '</strong>'] : ['**', '**'];
      const next = `${before}${open}${selected}${close}${after}`;
      onValueChange(next);
      // Re-focus and select the wrapped text
      requestAnimationFrame(() => {
        el.focus();
        const newStart = start + open.length;
        const newEnd = newStart + selected.length;
        el.setSelectionRange(newStart, newEnd);
      });
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        wrapSelection();
      }
      rest.onKeyDown?.(e);
    };

    return (
      <div className="rounded-xl border border-input bg-background shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition">
        <div className="flex items-center gap-1 border-b border-input bg-muted/40 px-2 py-1 rounded-t-xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onMouseDown={(e) => e.preventDefault()}
            onClick={wrapSelection}
            title="Bold (Ctrl/Cmd+B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[11px] text-muted-foreground ml-1">
            Select text, then click Bold or press Ctrl/Cmd+B
          </span>
        </div>
        <Textarea
          {...rest}
          ref={innerRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            'border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-t-none rounded-b-xl whitespace-pre-wrap',
            className,
          )}
        />
      </div>
    );
  },
);
BoldableTextarea.displayName = 'BoldableTextarea';
