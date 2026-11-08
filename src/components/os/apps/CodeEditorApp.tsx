import { useEffect, useState } from 'react';
import { Save, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VFS } from '@/hooks/useVirtualFileSystem';

export default function CodeEditorApp({ name, path, content, vfs }: { name: string; path: string; content: string; vfs: VFS }) {
  const [value, setValue] = useState(content);
  useEffect(() => setValue(content), [content, path]);
  const language = name.split('.').pop()?.toUpperCase() ?? 'TEXT';
  const save = () => { try { vfs.writeFile(path, value); toast.success(`${name} を保存しました`); } catch { toast.error('保存できませんでした'); } };
  return <div className="h-full flex flex-col bg-[hsl(var(--window-bg))]">
    <div className="h-10 shrink-0 px-3 flex items-center gap-2 border-b border-border">
      <Code2 size={16} className="text-primary"/><span className="text-xs font-medium flex-1 truncate">{name}</span>
      <span className="text-[10px] text-muted-foreground mr-2">{language}</span>
      <button onClick={save} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90"><Save size={13}/>保存</button>
    </div>
    <div className="flex-1 min-h-0 flex overflow-hidden bg-[#111827]">
      <div className="select-none py-3 px-3 text-right text-xs leading-6 text-slate-500 border-r border-slate-700/70 bg-[#0b1220]">{Array.from({length: Math.max(1, value.split('\n').length)}, (_, i) => <div key={i}>{i + 1}</div>)}</div>
      <textarea value={value} onChange={e => setValue(e.target.value)} spellCheck={false} aria-label="コードエディタ" className="flex-1 resize-none outline-none border-0 p-3 bg-transparent text-slate-100 font-mono text-[13px] leading-6 whitespace-pre overflow-auto" />
    </div>
    <div className="h-6 shrink-0 px-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border"><span>{language} · UTF-8</span><span>{value.split('\n').length} 行　{value.length} 文字</span></div>
  </div>;
}
