import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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
const HEADER_HEIGHT = 36;
const TASKBAR_HEIGHT = 44;

// iOS 風のばね（spring）。開く・閉じる・最小化で同じ物理特性を使い、動きの一体感を出します。
const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** ポインターの移動を window に登録し、離した時に一度だけ終了処理を行います。 */
function trackPointer(
  pointerId: number,
  onPointerMove: (event: PointerEvent) => void,
  onPointerEnd: () => void,
) {
  const handleMove = (event: PointerEvent) => {
    if (event.pointerId === pointerId) onPointerMove(event);
  };
  const handleEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;
    window.removeEventListener('pointermove', handleMove);
    window.removeEventListener('pointerup', handleEnd);
    window.removeEventListener('pointercancel', handleEnd);
    onPointerEnd();
  };
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('pointerup', handleEnd);
  window.addEventListener('pointercancel', handleEnd);
}

export default function Window({ window: win, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, children }: WindowProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  // ドラッグ・リサイズ中は React で再描画せず DOM を直接動かし、離した時にだけ状態へ反映する。
  // これにより、移動中に中のアプリ（ターミナルや表計算など）が再描画されるのを防ぎます。
  const handleHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || win.isMaximized || (event.target as HTMLElement).closest('button')) return;
    onFocus(win.id);
    const frame = frameRef.current;
    if (!frame) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = win.x;
    const originY = win.y;
    let nextX = originX;
    let nextY = originY;
    frame.classList.add('is-gesture');
    trackPointer(event.pointerId, moveEvent => {
      nextX = clamp(originX + moveEvent.clientX - startX, 80 - win.width, window.innerWidth - 80);
      nextY = clamp(originY + moveEvent.clientY - startY, 0, window.innerHeight - TASKBAR_HEIGHT - HEADER_HEIGHT);
      frame.style.left = `${nextX}px`;
      frame.style.top = `${nextY}px`;
    }, () => {
      frame.classList.remove('is-gesture');
      if (nextX !== originX || nextY !== originY) onMove(win.id, nextX, nextY);
    });
  };

  const handleResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    onFocus(win.id);
    const frame = frameRef.current;
    if (!frame) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const originWidth = win.width;
    const originHeight = win.height;
    let nextWidth = originWidth;
    let nextHeight = originHeight;
    frame.classList.add('is-gesture');
    trackPointer(event.pointerId, moveEvent => {
      nextWidth = Math.max(MIN_WIDTH, originWidth + moveEvent.clientX - startX);
      nextHeight = Math.max(MIN_HEIGHT, originHeight + moveEvent.clientY - startY);
      frame.style.width = `${nextWidth}px`;
      frame.style.height = `${nextHeight}px`;
    }, () => {
      frame.classList.remove('is-gesture');
      if (nextWidth !== originWidth || nextHeight !== originHeight) onResize(win.id, nextWidth, nextHeight);
    });
  };

  const frameStyle: CSSProperties = win.isMaximized
    ? { left: 0, top: 0, width: '100vw', height: `calc(100dvh - ${TASKBAR_HEIGHT}px)`, zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex };
  if (win.isMinimized) frameStyle.pointerEvents = 'none';

  return (
    <motion.div
      ref={frameRef}
      role="group"
      aria-label={win.title}
      className={`window-frame absolute flex flex-col overflow-hidden max-sm:!left-0 max-sm:!top-0 max-sm:!w-full max-sm:!h-[calc(100dvh-44px)] ${win.isMaximized ? 'is-maximized' : ''}`}
      style={frameStyle}
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      animate={win.isMinimized
        // 最小化は画面下（タスクバー）へ吸い込むように縮め、終わったら非表示にします
        ? { opacity: 0, scale: 0.5, y: 260, transitionEnd: { visibility: 'hidden' } }
        : { opacity: 1, scale: 1, y: 0, visibility: 'visible' }}
      exit={{ opacity: 0, scale: 0.92, y: 12 }}
      transition={SPRING}
      onMouseDown={() => onFocus(win.id)}
    >
      <div
        className="ios-glass-header flex items-center h-9 px-3 shrink-0 cursor-default select-none touch-none"
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={() => onMaximize(win.id)}
      >
        <span className="flex-1 text-xs text-foreground/85 truncate">{win.title}</span>
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

      <div className="flex-1 overflow-auto overscroll-contain min-h-0 bg-[hsl(var(--window-bg))]">
        {children}
      </div>

      {!win.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none"
          onPointerDown={handleResizePointerDown}
        />
      )}
    </motion.div>
  );
}
