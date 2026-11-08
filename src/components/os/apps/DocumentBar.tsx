import { useState } from 'react';
import { FilePlus, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import { DOCUMENTS_DIR } from '@/lib/fs';

interface DocumentBarProps {
  vfs: VFS;
  extension: string;
  defaultName: string;
  getContent: () => string;
  onLoad: (content: string) => void;
  onNew: () => void;
}

const stripExtension = (fileName: string, extension: string) => fileName.slice(0, -extension.length);

export default function DocumentBar({ vfs, extension, defaultName, getContent, onLoad, onNew }: DocumentBarProps) {
  const [name, setName] = useState(defaultName);
  const documents = vfs.listDir(DOCUMENTS_DIR).filter(node => node.type === 'file' && node.name.endsWith(extension));

  const save = () => {
    const base = name.trim().replace(/[\\/]/g, '_');
    if (!base) {
      toast.error('ファイル名を入力してください');
      return;
    }
    const fileName = base.endsWith(extension) ? base : `${base}${extension}`;
    try {
      vfs.writeFile(`${DOCUMENTS_DIR}/${fileName}`, getContent());
      setName(stripExtension(fileName, extension));
      toast.success(`${fileName} を保存しました`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存に失敗しました');
    }
  };

  const open = (fileName: string) => {
    if (!fileName) return;
    const content = vfs.readFile(`${DOCUMENTS_DIR}/${fileName}`);
    if (content === null) {
      toast.error('ファイルを開けませんでした');
      return;
    }
    onLoad(content);
    setName(stripExtension(fileName, extension));
  };

  const newDocument = () => {
    setName(defaultName);
    onNew();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-border text-xs">
      <button
        type="button"
        onClick={newDocument}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
      >
        <FilePlus size={13} />新規
      </button>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); }}
        aria-label="ファイル名"
        className="h-7 w-36 px-2 rounded bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <button
        type="button"
        onClick={save}
        className="flex items-center gap-1 px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Save size={13} />保存
      </button>
      <select
        value=""
        onChange={e => open(e.target.value)}
        aria-label="ドキュメントを開く"
        disabled={documents.length === 0}
        className="h-7 px-2 rounded bg-secondary text-foreground focus:outline-none disabled:opacity-50"
      >
        <option value="">{documents.length ? '開く…' : '保存済みファイルなし'}</option>
        {documents.map(node => (
          <option key={node.name} value={node.name}>{stripExtension(node.name, extension)}</option>
        ))}
      </select>
      <span className="ml-auto text-[10px] text-muted-foreground truncate">ドキュメント フォルダー</span>
    </div>
  );
}
