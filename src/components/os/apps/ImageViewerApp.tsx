import { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Download, Image as ImageIcon } from 'lucide-react';

export default function ImageViewerApp({ name, content }: { name: string; content: string }) {
  const [zoom, setZoom] = useState(100);
  const [fit, setFit] = useState(true);
  if (!content.startsWith('data:image/') && !/^https?:\/\//i.test(content)) {
    return <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground"><ImageIcon size={36} /><p className="text-sm">画像データがありません</p><p className="text-xs">このファイルはプレースホルダーの可能性があります。</p></div>;
  }
  return <div className="h-full flex flex-col bg-black/90">
    <div className="h-10 shrink-0 flex items-center justify-center gap-2 border-b border-white/10 text-white">
      <button title="縮小" onClick={() => { setFit(false); setZoom(v => Math.max(10, v - 10)); }} className="p-2 hover:bg-white/10 rounded"><ZoomOut size={16}/></button>
      <span className="text-xs w-12 text-center">{fit ? '自動' : `${zoom}%`}</span>
      <button title="拡大" onClick={() => { setFit(false); setZoom(v => Math.min(300, v + 10)); }} className="p-2 hover:bg-white/10 rounded"><ZoomIn size={16}/></button>
      <button title="全体表示" onClick={() => { setFit(true); setZoom(100); }} className="p-2 hover:bg-white/10 rounded"><RotateCcw size={16}/></button>
      <a href={content} download={name} className="p-2 hover:bg-white/10 rounded" title="ダウンロード"><Download size={16}/></a>
    </div>
    <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
      <img src={content} alt={name} className="object-contain" style={fit ? { maxWidth: '100%', maxHeight: '100%' } : { width: `${zoom}%`, maxWidth: 'none', height: 'auto' }} />
    </div>
    <div className="h-7 shrink-0 flex items-center justify-center text-[11px] text-white/60">{name}</div>
  </div>;
}
