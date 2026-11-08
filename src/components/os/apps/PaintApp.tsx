import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Eraser, Pencil, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import { PICTURES_DIR, today } from '@/lib/fs';

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
const SIZES = [2, 6, 12];
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 420;

export default function PaintApp({ vfs }: { vfs: VFS }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const pointFrom = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const strokeTo = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    context.lineWidth = tool === 'eraser' ? size * 2 : size;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    lastPointRef.current = point;
    strokeTo(point, point);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const last = lastPointRef.current;
    if (!last) return;
    const point = pointFrom(event);
    strokeTo(last, point);
    lastPointRef.current = point;
  };

  const endStroke = () => {
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fileName = `paint-${today()}-${Date.now().toString(36)}.png`;
    try {
      vfs.writeFile(`${PICTURES_DIR}/${fileName}`, canvas.toDataURL('image/png'));
      toast.success(`${fileName} をピクチャに保存しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存できませんでした');
    }
  };

  const toolButton = (active: boolean) =>
    `p-1.5 rounded transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border">
        <button type="button" aria-label="ペン" onClick={() => setTool('pen')} className={toolButton(tool === 'pen')}><Pencil size={14} /></button>
        <button type="button" aria-label="消しゴム" onClick={() => setTool('eraser')} className={toolButton(tool === 'eraser')}><Eraser size={14} /></button>
        <div className="w-px h-5 bg-border mx-1" />
        {COLORS.map(item => (
          <button
            key={item}
            type="button"
            aria-label={`色 ${item}`}
            onClick={() => { setColor(item); setTool('pen'); }}
            className={`w-5 h-5 rounded-full border ${color === item && tool === 'pen' ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'}`}
            style={{ background: item }}
          />
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        {SIZES.map(item => (
          <button
            key={item}
            type="button"
            aria-label={`太さ ${item}`}
            onClick={() => setSize(item)}
            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-secondary ${size === item ? 'bg-secondary' : ''}`}
          >
            <span className="rounded-full bg-foreground" style={{ width: item + 2, height: item + 2 }} />
          </button>
        ))}
        <div className="flex-1" />
        <button type="button" onClick={clearCanvas} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-secondary">
          <Trash2 size={13} />消去
        </button>
        <button type="button" onClick={saveImage} className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90">
          <Save size={13} />保存
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-3 min-h-0 bg-secondary/30">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          style={{ touchAction: 'none' }}
          className="w-full h-auto max-h-full bg-white rounded shadow-lg cursor-crosshair"
          aria-label="描画キャンバス"
        />
      </div>
    </div>
  );
}
