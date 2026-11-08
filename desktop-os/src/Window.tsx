import { useRef, useEffect, type ReactNode } from 'react';
import { Rnd } from 'react-rnd';
import { Minus, Square, X, Copy } from 'lucide-react';
import type { AppWindow } from './types';

interface WindowProps {
  win: AppWindow;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMax: () => void;
  onDragStop: (x: number, y: number) => void;
  onResizeStop: (w: number, h: number, x: number, y: number) => void;
  children: ReactNode;
}

export function Window({
  win,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onToggleMax,
  onDragStop,
  onResizeStop,
  children,
}: WindowProps) {
  const rndRef = useRef<Rnd>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    isFirstRender.current = false;
  }, []);

  if (win.minimized) return null;

  const style: React.CSSProperties = {
    zIndex: win.zIndex,
    boxShadow: focused
      ? '0 0 0 2px var(--primary-light), 0 20px 50px -12px rgba(0,0,0,0.5), 0 8px 16px -8px rgba(0,0,0,0.3)'
      : undefined,
  };

  return (
    <Rnd
      ref={rndRef}
      size={{ width: win.width, height: win.height }}
      position={{ x: win.x, y: win.y }}
      minWidth={320}
      minHeight={240}
      bounds="parent"
      dragHandleClassName="titlebar"
      onDragStart={onFocus}
      onDragStop={(_e, d) => onDragStop(d.x, d.y)}
      onResizeStart={onFocus}
      onResizeStop={(_e, _dir, ref, _delta, pos) => {
        onResizeStop(ref.offsetWidth, ref.offsetHeight, pos.x, pos.y);
      }}
      style={style}
      enableResizing={!win.maximized}
      disableDragging={win.maximized}
      className={`window window-enter`}
    >
      <div className="titlebar" onDoubleClick={onToggleMax}>
        <span className="title">{win.title}</span>
        <div className="titlebar-btns">
          <button className="titlebar-btn" onClick={onMinimize} title="最小化">
            <Minus size={15} />
          </button>
          <button className="titlebar-btn" onClick={onToggleMax} title="最大化">
            {win.maximized ? <Copy size={13} /> : <Square size={13} />}
          </button>
          <button className="titlebar-btn close" onClick={onClose} title="閉じる">
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="window-body">{children}</div>
    </Rnd>
  );
}
