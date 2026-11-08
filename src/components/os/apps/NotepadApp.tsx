import { useState } from 'react';
import { toast } from 'sonner';
import DocumentBar from '@/components/os/apps/DocumentBar';
import type { VFS } from '@/hooks/useVirtualFileSystem';

export default function NotepadApp({ vfs }: { vfs: VFS }) {
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
