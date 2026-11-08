import { useRef, useState, useEffect } from 'react';
import { FolderOpen, Save, FileText } from 'lucide-react';

interface NotepadProps {
  windowId: string;
}

export function Notepad({ windowId: _windowId }: NotepadProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('無題');
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleOpen = async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'テキストファイル',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await file.text();
      fileHandleRef.current = handle;
      setFileName(file.name);
      setText(content);
      setDirty(false);
    } catch (e) {
      // user cancelled
    }
  };

  const handleSave = async () => {
    try {
      let handle = fileHandleRef.current;
      if (!handle) {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: `${fileName}.txt`,
          types: [
            {
              description: 'テキストファイル',
              accept: { 'text/plain': ['.txt'] },
            },
          ],
        });
        fileHandleRef.current = handle;
        setFileName(handle!.name.replace(/\.txt$/, ''));
      }
      const writable = await handle!.createWritable();
      await writable.write(text);
      await writable.close();
      setDirty(false);
    } catch (e) {
      // user cancelled
    }
  };

  const handleSaveAs = async () => {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${fileName}.txt`,
        types: [
          {
            description: 'テキストファイル',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      fileHandleRef.current = handle;
      setFileName(handle.name.replace(/\.txt$/, ''));
      setDirty(false);
    } catch (e) {
      // user cancelled
    }
  };

  const handleNew = () => {
    setText('');
    setFileName('無題');
    setDirty(false);
    fileHandleRef.current = null;
  };

  const lineCount = text ? text.split('\n').length : 0;
  const charCount = text.length;

  return (
    <div className="notepad">
      <div className="notepad-toolbar">
        <button className="toolbar-btn" onClick={handleNew} title="新規">
          <FileText size={14} /> 新規
        </button>
        <button className="toolbar-btn" onClick={handleOpen} title="開く (ファイルエクスプローラー)">
          <FolderOpen size={14} /> 開く
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="保存 (Ctrl+S)">
          <Save size={14} /> 保存
        </button>
        <button className="toolbar-btn" onClick={handleSaveAs} title="名前を付けて保存">
          <Save size={14} /> 名前を付けて保存
        </button>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--neutral-600)', cursor: 'pointer' }}>
          <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} style={{ cursor: 'pointer' }} />
          折り返し
        </label>
      </div>
      <textarea
        className="notepad-textarea"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
        }}
        placeholder="ここにテキストを入力..."
        spellCheck={false}
        style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', overflowWrap: wrap ? 'break-word' : 'normal' }}
      />
      <div className="notepad-status">
        <span>{dirty ? '● 未保存' : '保存済み'}</span>
        <span>{fileName}.txt</span>
        <span>行: {lineCount} | 文字: {charCount}</span>
      </div>
    </div>
  );
}
