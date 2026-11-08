import { useState, useMemo, useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { FolderOpen, Save, Play } from 'lucide-react';

type Lang = 'javascript' | 'python' | 'html' | 'css';

const langConfig: Record<Lang, { label: string; ext: string; load: () => any }> = {
  javascript: { label: 'JavaScript', ext: 'js', load: () => javascript({ jsx: true }) },
  python: { label: 'Python', ext: 'py', load: () => python() },
  html: { label: 'HTML', ext: 'html', load: () => html() },
  css: { label: 'CSS', ext: 'css', load: () => css() },
};

export function CodeEditor() {
  const [lang, setLang] = useState<Lang>('javascript');
  const [code, setCode] = useState(`// JavaScript コードエディタ\nconsole.log("Hello, World!");\n\nfunction greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet("Desktop OS"));`);
  const [fileName, setFileName] = useState('無題');
  const fileHandleRef = useRef<FileSystemFileHandle | null>(null);

  const extensions = useMemo(() => {
    return [langConfig[lang].load()];
  }, [lang]);

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
            description: 'コードファイル',
            accept: {
              'text/javascript': ['.js', '.jsx', '.ts', '.tsx'],
              'text/x-python': ['.py'],
              'text/html': ['.html', '.htm'],
              'text/css': ['.css'],
            },
          },
        ],
        multiple: false,
      });
      const file = await handle.getFile();
      const content = await file.text();
      fileHandleRef.current = handle;
      setFileName(file.name);
      setText(content);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') setLang('javascript');
      else if (ext === 'py') setLang('python');
      else if (ext === 'html' || ext === 'htm') setLang('html');
      else if (ext === 'css') setLang('css');
    } catch (e) {
      // cancelled
    }
  };

  const setText = (t: string) => setCode(t);

  const handleSave = async () => {
    try {
      let handle = fileHandleRef.current;
      if (!handle) {
        handle = await (window as any).showSaveFilePicker({
          suggestedName: `${fileName}.${langConfig[lang].ext}`,
          types: [
            {
              description: `${langConfig[lang].label}ファイル`,
              accept: getAcceptType(lang),
            },
          ],
        });
        fileHandleRef.current = handle;
        setFileName(handle!.name.replace(/\.\w+$/, ''));
      }
      const writable = await handle!.createWritable();
      await writable.write(code);
      await writable.close();
    } catch (e) {
      // cancelled
    }
  };

  const handleRun = () => {
    if (lang === 'javascript') {
      try {
        const log: string[] = [];
        const sandbox = new Function('console', code);
        sandbox({ log: (...args: any[]) => log.push(args.map(String).join(' ')) });
        console.log(log.join('\n'));
        alert(log.join('\n') || '(出力なし)');
      } catch (e: any) {
        alert('エラー: ' + e.message);
      }
    } else if (lang === 'html') {
      const blob = new Blob([code], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert(`${langConfig[lang].label}の実行はブラウザ内ではサポートされていません`);
    }
  };

  const lineCount = code ? code.split('\n').length : 0;

  return (
    <div className="code-editor">
      <div className="code-toolbar">
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {Object.entries(langConfig).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>
        <button className="toolbar-btn" onClick={handleOpen} title="開く">
          <FolderOpen size={14} /> 開く
        </button>
        <button className="toolbar-btn" onClick={handleSave} title="保存 (Ctrl+S)">
          <Save size={14} /> 保存
        </button>
        <button className="toolbar-btn" onClick={handleRun} title="実行" style={{ marginLeft: 'auto' }}>
          <Play size={14} /> 実行
        </button>
      </div>
      <CodeMirror
        value={code}
        height="100%"
        theme="dark"
        extensions={extensions}
        onChange={(val) => setCode(val)}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
      />
      <div className="code-status">
        <span>{fileName}.{langConfig[lang].ext}</span>
        <span>{langConfig[lang].label} | 行: {lineCount} | 文字: {code.length}</span>
      </div>
    </div>
  );
}

function getAcceptType(lang: Lang): Record<string, string[]> {
  switch (lang) {
    case 'javascript':
      return { 'text/javascript': ['.js', '.jsx'] };
    case 'python':
      return { 'text/x-python': ['.py'] };
    case 'html':
      return { 'text/html': ['.html', '.htm'] };
    case 'css':
      return { 'text/css': ['.css'] };
  }
}
