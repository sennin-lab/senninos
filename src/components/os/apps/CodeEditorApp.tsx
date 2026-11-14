import { useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import { Save, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import type { VFS } from '@/hooks/useVirtualFileSystem';

interface CodeEditorAppProps {
  name: string;
  path: string;
  content: string;
  vfs: VFS;
}

export default function CodeEditorApp({ name, path, content, vfs }: CodeEditorAppProps) {
  const [value, setValue] = useState(content);
  const [savedValue, setSavedValue] = useState(content);
  const gutterRef = useRef<HTMLDivElement>(null);
  const dirty = value !== savedValue;
  const lineCount = value.split('\n').length;
  const language = name.split('.').pop()?.toUpperCase() ?? 'TEXT';

  const save = () => {
    try {
      vfs.writeFile(path, value);
      setSavedValue(value);
      toast.success(`${name} を保存しました`);
    } catch {
      toast.error('保存できませんでした');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
      return;
    }
    // Tab はフォーカス移動ではなく、インデント（2 スペース）として入力する
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      const target = event.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      setValue(`${value.slice(0, start)}  ${value.slice(end)}`);
      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  // 行番号の欄をエディタと同じ量だけスクロールさせる
  const handleScroll = (event: UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
  };

  return (
    <div className="h-full flex flex-col bg-[hsl(var(--window-bg))]">
      <div className="h-10 shrink-0 px-3 flex items-center gap-2 border-b border-border">
        <Code2 size={16} className="text-primary" />
        <span className="text-xs font-medium flex-1 truncate">{name}{dirty ? ' ●' : ''}</span>
        <span className="text-[10px] text-muted-foreground mr-2">{language}</span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-40"
        >
          <Save size={13} />保存
        </button>
      </div>
      <div className="flex-1 min-h-0 flex overflow-hidden bg-[#111827]">
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="select-none overflow-hidden py-3 px-3 text-right text-xs leading-6 text-slate-500 border-r border-slate-700/70 bg-[#0b1220]"
        >
          {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          aria-label="コードエディタ"
          className="flex-1 resize-none outline-none border-0 p-3 bg-transparent text-slate-100 font-mono text-[13px] leading-6 whitespace-pre overflow-auto"
        />
      </div>
      <div className="h-6 shrink-0 px-3 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border">
        <span>{language} · UTF-8</span>
        <span>{lineCount} 行　{value.length} 文字</span>
      </div>
    </div>
  );
}
