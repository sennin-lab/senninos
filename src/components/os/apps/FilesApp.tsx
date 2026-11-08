import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ChevronRight, Download, FileText, Folder, FolderPlus, Image, Music, Search, Trash2, Upload, Video } from 'lucide-react';
import { toast } from 'sonner';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import type { FSNode } from '@/lib/fs';
import { formatSize, HOME_DIR } from '@/lib/fs';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const quickAccess = [
  { label: 'デスクトップ', path: `${HOME_DIR}/Desktop` },
  { label: 'ドキュメント', path: `${HOME_DIR}/Documents` },
  { label: 'ダウンロード', path: `${HOME_DIR}/Downloads` },
  { label: 'ミュージック', path: `${HOME_DIR}/Music` },
  { label: 'ピクチャ', path: `${HOME_DIR}/Pictures` },
  { label: 'ビデオ', path: `${HOME_DIR}/Videos` },
  { label: 'PC', path: '/' },
];

function getFileIcon(node: FSNode) {
  if (node.type === 'folder') return <Folder size={18} className="text-warning" />;
  const ext = node.name.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(ext)) return <Image size={18} className="text-accent" />;
  if (['mp3', 'wav', 'ogg'].includes(ext)) return <Music size={18} className="text-success" />;
  if (['mp4', 'avi', 'mkv', 'webm'].includes(ext)) return <Video size={18} className="text-primary" />;
  return <FileText size={18} className="text-muted-foreground" />;
}

const joinPath = (folder: string, name: string) => (folder === '/' ? `/${name}` : `${folder}/${name}`);

export default function FilesApp({ vfs }: { vfs: VFS }) {
  const [search, setSearch] = useState('');
  const [historyStack, setHistoryStack] = useState<string[]>([HOME_DIR]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPath = historyStack[historyIdx] ?? HOME_DIR;
  const items = vfs.listDir(currentPath);
  const filteredItems = search ? items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : items;
  const selectedNode = items.find(item => item.name === selected) ?? null;
  const pathParts = currentPath.split('/').filter(Boolean);

  const navigateTo = (path: string) => {
    const nextStack = historyStack.slice(0, historyIdx + 1);
    nextStack.push(path);
    setHistoryStack(nextStack);
    setHistoryIdx(nextStack.length - 1);
    setSelected(null);
    setCreating(false);
  };

  const goBack = () => {
    if (historyIdx > 0) setHistoryIdx(historyIdx - 1);
    setSelected(null);
  };
  const goForward = () => {
    if (historyIdx < historyStack.length - 1) setHistoryIdx(historyIdx + 1);
    setSelected(null);
  };
  const goUp = () => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    navigateTo(`/${parts.join('/')}`);
  };

  const openItem = (item: FSNode) => {
    if (item.type === 'folder') navigateTo(joinPath(currentPath, item.name));
    else toast.message(`${item.name} (${formatSize(item.size)})`);
  };

  const handleItemClick = (item: FSNode) => {
    if (selected === item.name) openItem(item);
    else setSelected(item.name);
  };

  const handleItemKey = (event: KeyboardEvent<HTMLDivElement>, item: FSNode) => {
    if (event.key === 'Enter') openItem(item);
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      vfs.mkdir(joinPath(currentPath, name));
      toast.success(`${name} を作成しました`);
      setNewFolderName('');
      setCreating(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'フォルダーを作成できません');
    }
  };

  const deleteSelected = () => {
    if (!selectedNode) return;
    try {
      vfs.rm(joinPath(currentPath, selectedNode.name));
      toast.success(`${selectedNode.name} を削除しました`);
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '削除できませんでした');
    }
  };

  const downloadSelected = async () => {
    if (!selectedNode || selectedNode.type !== 'file') return;
    const content = vfs.readFile(joinPath(currentPath, selectedNode.name)) ?? '';
    try {
      const blob = content.startsWith('data:')
        ? await fetch(content).then(response => response.blob())
        : new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = selectedNode.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('ダウンロードできませんでした');
    }
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('2MB を超えるファイルは読み込めません');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      try {
        vfs.writeFile(joinPath(currentPath, file.name), content);
        toast.success(`${file.name} を読み込みました`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '読み込みに失敗しました');
      }
    };
    reader.onerror = () => toast.error('ファイルを読み込めませんでした');
    if (file.type.startsWith('image/')) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border flex-wrap">
        <button type="button" aria-label="戻る" onClick={goBack} disabled={historyIdx <= 0} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30"><ArrowLeft size={14} /></button>
        <button type="button" aria-label="進む" onClick={goForward} disabled={historyIdx >= historyStack.length - 1} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30"><ArrowRight size={14} /></button>
        <button type="button" aria-label="上の階層へ" onClick={goUp} disabled={currentPath === '/'} className="p-1 rounded hover:bg-secondary text-muted-foreground disabled:opacity-30"><ArrowUp size={14} /></button>

        <div className="flex-1 min-w-[120px] flex items-center h-7 px-2 rounded bg-secondary/50 text-xs text-muted-foreground mx-1 gap-0.5 overflow-hidden">
          <button type="button" onClick={() => navigateTo('/')} className="hover:text-foreground shrink-0">PC</button>
          {pathParts.map((seg, i) => (
            <span key={`${seg}-${i}`} className="flex items-center gap-0.5 min-w-0">
              <ChevronRight size={10} className="shrink-0" />
              <button type="button" onClick={() => navigateTo(`/${pathParts.slice(0, i + 1).join('/')}`)} className="hover:text-foreground truncate">
                {seg}
              </button>
            </span>
          ))}
        </div>

        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="検索"
            aria-label="ファイルを検索"
            className="h-7 w-28 pl-7 pr-2 rounded bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 px-2 py-1 border-b border-border text-xs">
        <button type="button" onClick={() => setCreating(!creating)} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <FolderPlus size={13} />新規フォルダー
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          <Upload size={13} />読み込み
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={importFile} aria-label="ファイルを読み込む" />
        <button type="button" onClick={downloadSelected} disabled={selectedNode?.type !== 'file'} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30">
          <Download size={13} />ダウンロード
        </button>
        <button type="button" onClick={deleteSelected} disabled={!selectedNode} className="flex items-center gap-1 px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive disabled:opacity-30">
          <Trash2 size={13} />削除
        </button>
        {creating && (
          <div className="flex items-center gap-1 ml-auto">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createFolder(); }}
              placeholder="フォルダー名"
              aria-label="新しいフォルダー名"
              autoFocus
              className="h-6 w-36 px-2 rounded bg-secondary text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" onClick={createFolder} className="px-2 py-1 rounded bg-primary text-primary-foreground">作成</button>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-36 sm:w-40 border-r border-border p-2 text-xs space-y-0.5 shrink-0 overflow-auto">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1">クイックアクセス</p>
          {quickAccess.map(qa => (
            <button
              key={qa.path}
              type="button"
              onClick={() => navigateTo(qa.path)}
              className={`w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                currentPath === qa.path ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Folder size={12} />
              {qa.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-1 min-w-0">
          <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border">
            <span className="flex-1">名前</span>
            <span className="w-20 text-right">サイズ</span>
            <span className="w-24 text-right">更新日</span>
          </div>

          {filteredItems.length === 0 && (
            <p className="text-center text-muted-foreground text-sm mt-8">このフォルダーは空です</p>
          )}

          {filteredItems.map(item => (
            <div
              key={item.name}
              role="button"
              tabIndex={0}
              aria-selected={selected === item.name}
              onClick={() => handleItemClick(item)}
              onDoubleClick={() => openItem(item)}
              onKeyDown={e => handleItemKey(e, item)}
              className={`flex items-center gap-3 w-full px-3 py-1.5 text-sm cursor-default transition-colors ${
                selected === item.name ? 'bg-primary/20' : 'hover:bg-secondary/50'
              }`}
            >
              {getFileIcon(item)}
              <span className="flex-1 text-left text-foreground truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground w-20 text-right">{item.type === 'file' ? formatSize(item.size) : ''}</span>
              <span className="text-xs text-muted-foreground w-24 text-right">{item.modified || ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        <span>{filteredItems.length} 個の項目{selectedNode ? ` ・ ${selectedNode.name} を選択中` : ''}</span>
        <span className="truncate ml-2">{currentPath}</span>
      </div>
    </div>
  );
}
