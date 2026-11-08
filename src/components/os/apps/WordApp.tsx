import { useRef, useState } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Undo, Redo } from 'lucide-react';
import DocumentBar from '@/components/os/apps/DocumentBar';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import { sanitizeHtml } from '@/lib/sanitize';

const ToolButton = ({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onMouseDown={e => e.preventDefault()}
    onClick={onClick}
    title={title}
    aria-label={title}
    className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
  >
    {children}
  </button>
);

export default function WordApp({ vfs }: { vfs: VFS }) {
  const [plainText, setPlainText] = useState('');
  const [fontFamily, setFontFamily] = useState('serif');
  const [fontSize, setFontSize] = useState('3');
  const editorRef = useRef<HTMLDivElement>(null);

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setPlainText(editorRef.current?.innerText ?? '');
  };

  const loadDocument = (content: string) => {
    if (editorRef.current) editorRef.current.innerHTML = sanitizeHtml(content);
    setPlainText(editorRef.current?.innerText ?? '');
  };

  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;

  return (
    <div className="flex flex-col h-full bg-window-bg">
      <DocumentBar
        vfs={vfs}
        extension=".html"
        defaultName="無題のドキュメント"
        getContent={() => editorRef.current?.innerHTML ?? ''}
        onLoad={loadDocument}
        onNew={() => loadDocument('')}
      />

      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border flex-wrap">
        <ToolButton title="元に戻す" onClick={() => exec('undo')}><Undo size={14} /></ToolButton>
        <ToolButton title="やり直す" onClick={() => exec('redo')}><Redo size={14} /></ToolButton>
        <div className="w-px h-5 bg-border mx-1" />
        <select
          value={fontFamily}
          aria-label="フォント"
          onChange={e => { setFontFamily(e.target.value); exec('fontName', e.target.value); }}
          className="h-7 px-1 rounded bg-secondary text-foreground text-[11px] border-none focus:outline-none"
        >
          <option value="serif">明朝体</option>
          <option value="sans-serif">ゴシック体</option>
          <option value="monospace">等幅</option>
        </select>
        <select
          value={fontSize}
          aria-label="文字サイズ"
          onChange={e => { setFontSize(e.target.value); exec('fontSize', e.target.value); }}
          className="h-7 w-16 px-1 rounded bg-secondary text-foreground text-[11px] border-none focus:outline-none"
        >
          {['1', '2', '3', '4', '5', '6', '7'].map(size => (
            <option key={size} value={size}>{Number(size) * 4 + 6}pt</option>
          ))}
        </select>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolButton title="太字" onClick={() => exec('bold')}><Bold size={14} /></ToolButton>
        <ToolButton title="斜体" onClick={() => exec('italic')}><Italic size={14} /></ToolButton>
        <ToolButton title="下線" onClick={() => exec('underline')}><Underline size={14} /></ToolButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolButton title="左揃え" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></ToolButton>
        <ToolButton title="中央揃え" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></ToolButton>
        <ToolButton title="右揃え" onClick={() => exec('justifyRight')}><AlignRight size={14} /></ToolButton>
        <div className="w-px h-5 bg-border mx-1" />
        <ToolButton title="箇条書き" onClick={() => exec('insertUnorderedList')}><List size={14} /></ToolButton>
        <ToolButton title="番号付きリスト" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></ToolButton>
      </div>

      <div className="flex-1 overflow-auto flex justify-center py-6 px-2 min-h-0" style={{ background: 'hsl(220 15% 15%)' }}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={e => setPlainText((e.target as HTMLDivElement).innerText)}
          style={{ fontFamily }}
          className="w-full max-w-[680px] min-h-[880px] bg-background p-8 sm:p-12 text-foreground text-sm leading-relaxed focus:outline-none shadow-lg break-words"
        />
      </div>

      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        <span>{plainText.length} 文字</span>
        <span>単語数: {wordCount}</span>
      </div>
    </div>
  );
}
