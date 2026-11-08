import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Plus, Play, ChevronLeft, ChevronRight, Type, Square, Circle, Trash2 } from 'lucide-react';
import DocumentBar from '@/components/os/apps/DocumentBar';
import type { VFS } from '@/hooks/useVirtualFileSystem';

interface SlideElement {
  id: number;
  type: 'text' | 'rect' | 'circle';
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  color: string;
}

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  bgColor: string;
  elements: SlideElement[];
}

const SLIDE_BG = 'hsl(220 20% 12%)';
const DEFAULT_SLIDES: Slide[] = [{ id: 1, title: 'プレゼンテーション', subtitle: 'SenniSlideで作成', bgColor: SLIDE_BG, elements: [] }];

function parseSlides(content: string): Slide[] | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const valid = parsed.every(item => item && typeof item === 'object' && typeof (item as Slide).title === 'string' && Array.isArray((item as Slide).elements));
    return valid ? (parsed as Slide[]) : null;
  } catch {
    return null;
  }
}

export default function PowerPointApp({ vfs }: { vfs: VFS }) {
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1000);

  const slide = slides[currentSlide] ?? slides[0];
  const activeElement = slide.elements.find(el => el.id === selectedElement) ?? null;

  useEffect(() => {
    if (!isPresenting) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPresenting(false);
      else if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setCurrentSlide(index => Math.min(index + 1, slides.length - 1));
      } else if (event.key === 'ArrowLeft') {
        setCurrentSlide(index => Math.max(index - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPresenting, slides.length]);

  const updateSlide = (updates: Partial<Slide>) => {
    setSlides(prev => prev.map((s, i) => (i === currentSlide ? { ...s, ...updates } : s)));
  };

  const updateElement = (slideIndex: number, elementId: number, patch: Partial<SlideElement>) => {
    setSlides(prev => prev.map((s, i) => (
      i === slideIndex ? { ...s, elements: s.elements.map(el => (el.id === elementId ? { ...el, ...patch } : el)) } : s
    )));
  };

  const addSlide = () => {
    const newSlide: Slide = { id: Date.now(), title: `スライド ${slides.length + 1}`, subtitle: '', bgColor: SLIDE_BG, elements: [] };
    setSlides([...slides, newSlide]);
    setCurrentSlide(slides.length);
    setSelectedElement(null);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== currentSlide));
    setCurrentSlide(Math.max(0, currentSlide - 1));
    setSelectedElement(null);
  };

  const addElement = (type: 'text' | 'rect' | 'circle') => {
    const offset = (slide.elements.length * 6) % 40;
    const element: SlideElement = {
      id: nextIdRef.current++,
      type,
      x: 30 + offset,
      y: 40 + offset,
      width: type === 'text' ? 0 : type === 'circle' ? 14 : 22,
      height: type === 'text' ? 0 : type === 'circle' ? 24 : 18,
      content: type === 'text' ? 'テキスト' : undefined,
      color: type === 'text' ? 'hsl(var(--foreground))' : 'hsl(var(--primary))',
    };
    updateSlide({ elements: [...slide.elements, element] });
    setSelectedElement(element.id);
  };

  const deleteElement = () => {
    if (selectedElement === null) return;
    updateSlide({ elements: slide.elements.filter(el => el.id !== selectedElement) });
    setSelectedElement(null);
  };

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>, element: SlideElement) => {
    event.stopPropagation();
    event.preventDefault();
    setSelectedElement(element.id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const slideIndex = currentSlide;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = element.x;
    const originY = element.y;
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const x = originX + ((moveEvent.clientX - startX) / rect.width) * 100;
      const y = originY + ((moveEvent.clientY - startY) / rect.height) * 100;
      updateElement(slideIndex, element.id, { x: Math.min(Math.max(x, 0), 95), y: Math.min(Math.max(y, 0), 95) });
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
  };

  const renderElement = (element: SlideElement, interactive: boolean) => {
    const isSelected = interactive && element.id === selectedElement;
    const isText = element.type === 'text';
    const style = {
      left: `${element.x}%`,
      top: `${element.y}%`,
      width: isText ? undefined : `${element.width}%`,
      height: isText ? undefined : `${element.height}%`,
    };
    return (
      <div
        key={element.id}
        className={`absolute touch-none ${interactive ? 'cursor-move' : 'pointer-events-none'} ${isSelected ? 'outline outline-1 outline-primary outline-offset-2' : ''}`}
        style={style}
        onPointerDown={interactive ? (event => startDrag(event, element)) : undefined}
      >
        {isText ? (
          <span className="whitespace-nowrap" style={{ color: element.color, fontSize: '3.2cqw' }}>{element.content}</span>
        ) : (
          <div
            className="w-full h-full"
            style={{ background: element.color, borderRadius: element.type === 'circle' ? '50%' : 4 }}
          />
        )}
      </div>
    );
  };

  if (isPresenting) {
    return (
      <div
        className="h-full flex items-center justify-center p-4 cursor-pointer select-none"
        style={{ background: 'black' }}
        onClick={() => {
          if (currentSlide < slides.length - 1) setCurrentSlide(currentSlide + 1);
          else setIsPresenting(false);
        }}
      >
        <div className="relative w-full max-w-[960px] aspect-video overflow-hidden rounded-sm" style={{ background: slide.bgColor, containerType: 'inline-size' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1.5cqw] p-[5cqw]">
            <h1 className="font-bold text-foreground text-center" style={{ fontSize: '6cqw' }}>{slide.title}</h1>
            <p className="text-muted-foreground text-center" style={{ fontSize: '3cqw' }}>{slide.subtitle}</p>
          </div>
          {slide.elements.map(el => renderElement(el, false))}
        </div>
        <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
          {currentSlide + 1} / {slides.length} ・ ←→ で移動 ・ Esc で終了
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-window-bg">
      <DocumentBar
        vfs={vfs}
        extension=".slides.json"
        defaultName="無題のプレゼン"
        getContent={() => JSON.stringify(slides)}
        onLoad={content => {
          const parsed = parseSlides(content);
          if (!parsed) return;
          setSlides(parsed);
          setCurrentSlide(0);
          setSelectedElement(null);
        }}
        onNew={() => { setSlides(DEFAULT_SLIDES); setCurrentSlide(0); setSelectedElement(null); }}
      />

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border flex-wrap">
        <button type="button" onClick={addSlide} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-foreground hover:bg-secondary">
          <Plus size={14} /> スライド追加
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={() => addElement('text')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="テキスト" aria-label="テキストを追加"><Type size={14} /></button>
        <button type="button" onClick={() => addElement('rect')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="四角形" aria-label="四角形を追加"><Square size={14} /></button>
        <button type="button" onClick={() => addElement('circle')} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="円" aria-label="円を追加"><Circle size={14} /></button>
        <button type="button" onClick={deleteElement} disabled={!activeElement} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive disabled:opacity-30" title="選択要素を削除" aria-label="選択要素を削除"><Trash2 size={14} /></button>
        <div className="w-px h-5 bg-border mx-1" />
        <button type="button" onClick={deleteSlide} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-destructive" title="スライド削除" aria-label="スライドを削除"><Trash2 size={14} /></button>
        <div className="flex-1" />
        <button type="button" onClick={() => setIsPresenting(true)} className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90">
          <Play size={14} /> プレゼン
        </button>
      </div>

      {activeElement?.type === 'text' && (
        <div className="flex items-center gap-2 px-3 py-1 border-b border-border text-xs">
          <span className="text-muted-foreground">テキスト</span>
          <input
            value={activeElement.content ?? ''}
            onChange={e => updateElement(currentSlide, activeElement.id, { content: e.target.value })}
            aria-label="選択中のテキスト"
            className="h-7 flex-1 max-w-xs px-2 rounded bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-28 sm:w-32 border-r border-border overflow-auto p-2 space-y-2 shrink-0">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setCurrentSlide(i); setSelectedElement(null); }}
              className={`w-full aspect-video rounded border text-[8px] flex items-center justify-center transition-colors ${
                i === currentSlide ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'
              }`}
              style={{ background: s.bgColor }}
            >
              <span className="text-foreground/60 truncate px-1">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 min-h-0" style={{ background: 'hsl(220 15% 15%)' }} onPointerDown={() => setSelectedElement(null)}>
            <div
              ref={canvasRef}
              className="relative w-full max-w-[600px] aspect-video rounded-sm shadow-lg overflow-hidden"
              style={{ background: slide.bgColor, containerType: 'inline-size' }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] p-[5cqw] pointer-events-none">
                <input
                  value={slide.title}
                  onChange={e => updateSlide({ title: e.target.value })}
                  className="pointer-events-auto bg-transparent text-center font-bold text-foreground focus:outline-none w-full"
                  style={{ fontSize: '5cqw' }}
                  placeholder="タイトル"
                  aria-label="スライドのタイトル"
                />
                <input
                  value={slide.subtitle}
                  onChange={e => updateSlide({ subtitle: e.target.value })}
                  className="pointer-events-auto bg-transparent text-center text-muted-foreground focus:outline-none w-full"
                  style={{ fontSize: '2.8cqw' }}
                  placeholder="サブタイトル"
                  aria-label="スライドのサブタイトル"
                />
              </div>
              {slide.elements.map(el => renderElement(el, true))}
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 py-2 border-t border-border text-xs text-muted-foreground">
            <button type="button" aria-label="前のスライド" onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} className="disabled:opacity-30"><ChevronLeft size={16} /></button>
            <span>スライド {currentSlide + 1} / {slides.length}</span>
            <button type="button" aria-label="次のスライド" onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))} disabled={currentSlide === slides.length - 1} className="disabled:opacity-30"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
