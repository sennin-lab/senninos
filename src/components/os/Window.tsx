import { useCallback, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, Minus, Square, Maximize2 } from 'lucide-react';
import type { WindowState } from '@/hooks/useWindowManager';

interface WindowProps {
  window: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  children: ReactNode;
}

const MIN_WIDTH = 320;
const MIN_HEIGHT = 200;

export default function Window({ window: win, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, children }: WindowProps) {
  const trackPointer = useCallback((event: ReactPointerEvent<HTMLElement>, onDelta: (dx: number, dy: number) => void) => {
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      onDelta(moveEvent.clientX - startX, moveEvent.clientY - startY);
    };
    const handleUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
  }, []);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') || win.isMaximized) return;
    onFocus(win.id);
    const originX = win.x;
    const originY = win.y;
    trackPointer(event, (dx, dy) => onMove(win.id, originX + dx, originY + dy));
  };

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onFocus(win.id);
    const originWidth = win.width;
    const originHeight = win.height;
    trackPointer(event, (dx, dy) => onResize(win.id, Math.max(MIN_WIDTH, originWidth + dx), Math.max(MIN_HEIGHT, originHeight + dy)));
  };

  const style = win.isMaximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100dvh - 44px)', zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex };

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute flex flex-col overflow-hidden border border-border max-sm:!left-0 max-sm:!top-0 max-sm:!w-full max-sm:!h-[calc(100dvh-44px)]"
      style={{ ...style, display: win.isMinimized ? 'none' : undefined, borderRadius: win.isMaximized ? 0 : 8, background: 'hsl(var(--window-bg))' }}
      onMouseDown={() => onFocus(win.id)}
    >
      <div
        className="flex items-center h-9 px-3 shrink-0 cursor-default select-none touch-none"
        style={{ background: 'hsl(var(--window-header))' }}
        onPointerDown={handleDragStart}
        onDoubleClick={() => onMaximize(win.id)}
      >
        <span className="flex-1 text-xs text-foreground/80 truncate">{win.title}</span>
        <div className="flex items-center -mr-1">
          <button
            type="button"
            aria-label="最小化"
            onClick={() => onMinimize(win.id)}
            className="w-11 h-9 flex items-center justify-center text-foreground/60 hover:bg-foreground/10 transition-colors"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            aria-label={win.isMaximized ? '元に戻す' : '最大化'}
            onClick={() => onMaximize(win.id)}
            className="w-11 h-9 flex items-center justify-center text-foreground/60 hover:bg-foreground/10 transition-colors"
          >
            {win.isMaximized ? <Square size={11} /> : <Maximize2 size={13} />}
          </button>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => onClose(win.id)}
            className="w-11 h-9 flex items-center justify-center text-foreground/60 hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0" style={{ background: 'hsl(var(--window-bg))' }}>
        {children}
      </div>

      {!win.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none"
          onPointerDown={handleResizeStart}
        />
      )}
    </motion.div>
  );
}
