import { FileText, Download } from 'lucide-react';

export default function DocumentViewerApp({ name, content }: { name: string; content: string }) {
  let documentText = content;
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.format === 'senninos-document' && typeof parsed.content === 'string') documentText = parsed.content;
  } catch { /* .sdoc はプレーンテキストとしても表示 */ }
  const lines = documentText.split(/\r?\n/);
  return <div className="h-full overflow-auto bg-secondary/40 p-5 sm:p-8">
    <div className="max-w-[760px] min-h-[700px] mx-auto bg-white text-slate-800 shadow-xl rounded-sm px-10 sm:px-16 py-12">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-8"><div className="flex items-center gap-2 text-slate-500"><FileText size={17}/><span className="text-xs">Senni Document</span></div><a href={`data:text/plain;charset=utf-8,${encodeURIComponent(documentText)}`} download={name} className="text-slate-500 hover:text-slate-900" title="ダウンロード"><Download size={16}/></a></div>
      <h1 className="text-2xl font-semibold mb-8 break-words">{name.replace(/\.sdoc$/i, '')}</h1>
      <article className="text-[15px] leading-8 whitespace-pre-wrap break-words">{lines.map((line, i) => <p key={i} className={line.startsWith('# ') ? 'text-xl font-semibold mt-5 mb-2' : line.startsWith('## ') ? 'text-lg font-semibold mt-4 mb-2' : line.trim() ? 'mb-2' : 'h-4'}>{line.startsWith('## ') ? line.slice(3) : line.startsWith('# ') ? line.slice(2) : line}</p>)}</article>
      <div className="mt-16 pt-4 border-t border-slate-200 text-[10px] text-slate-400">このファイルは SenniNOS 独自ドキュメント形式（.sdoc）です。</div>
    </div>
  </div>;
}
