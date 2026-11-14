import { useState, type KeyboardEvent } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import DocumentBar from '@/components/os/apps/DocumentBar';
import type { VFS } from '@/hooks/useVirtualFileSystem';

export interface NotepadFile {
  path: string;
  name: string;
  content: string;
}

interface NotepadAppProps {
  vfs: VFS;
  /** エクスプローラーから開いたファイル。指定があれば、そのファイルを直接編集・上書き保存します。 */
  file?: NotepadFile;
}

export default function NotepadApp({ vfs, file }: NotepadAppProps) {
  return file ? <FileNotepad vfs={vfs} file={file} /> : <ScratchNotepad vfs={vfs} />;
}

function FileNotepad({ vfs, file }: { vfs: VFS; file: NotepadFile }) {
  const [text, setText] = useState(file.content);
  const [savedText, setSavedText] = useState(file.content);
  const dirty = text !== savedText;

  const save = () => {
    try {
      vfs.writeFile(file.path, text);
      setSavedText(text);
      toast.success(`${file.name} を保存しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存できませんでした');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border text-xs">
        <span className="flex-1 truncate text-foreground/80" title={file.path}>
          {file.path}{dirty ? ' ●' : ''}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
        >
          <Save size={13} />保存
        </button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        aria-label={`${file.name} の編集`}
        className="flex-1 p-4 bg-transparent resize-none outline-none text-sm font-mono text-foreground min-h-0"
        spellCheck={false}
      />
      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        <span>{text.length} 文字 · {text.split('\n').length} 行</span>
        <span>UTF-8 ・ Ctrl+S で保存</span>
      </div>
    </div>
  );
}

function ScratchNotepad({ vfs }: { vfs: VFS }) {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const copyText = () => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('クリップボードにコピーしました'))
      .catch(() => toast.error('コピーできませんでした'));
  };

  return (
    <div className="flex flex-col h-full">
      <DocumentBar
        vfs={vfs}
        extension=".txt"
        defaultName="無題"
        getContent={() => text}
        onLoad={setText}
        onNew={() => setText('')}
      />
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border text-xs text-muted-foreground">
        <button type="button" className="hover:text-foreground transition-colors" onClick={copyText}>全文をコピー</button>
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        className="flex-1 p-4 bg-transparent resize-none outline-none text-sm font-mono text-foreground placeholder:text-muted-foreground min-h-0"
        placeholder="ここに入力してください..."
        spellCheck={false}
      />
      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        <span>{text.length} 文字 · {wordCount} 語</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
