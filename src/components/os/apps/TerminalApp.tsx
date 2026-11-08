import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import { formatSize } from '@/lib/fs';
import { evaluateExpression } from '@/lib/formula';

interface Line {
  type: 'input' | 'output';
  text: string;
}

interface TerminalAppProps {
  vfs: VFS;
}

const HELP_TEXT = `使用可能なコマンド:
  help       - ヘルプを表示
  echo       - テキストを表示
  date       - 現在の日時を表示
  whoami     - ユーザー情報
  hostname   - ホスト名
  ver        - バージョン情報
  dir / ls   - ファイル一覧
  cd         - ディレクトリ移動
  mkdir      - ディレクトリ作成
  touch      - 空のファイル作成
  rm / del   - ファイル/ディレクトリ削除
  cat / type - ファイル内容表示
  pwd        - カレントディレクトリ
  cls / clear - 画面クリア
  tree       - ディレクトリツリー
  systeminfo - システム情報
  calc       - 計算 (例: calc (2+3)*4)
  tasklist   - 実行中のタスク
  ipconfig   - ネットワーク情報`;

const formatCalc = (value: number) => String(Number(value.toPrecision(12)));

export default function TerminalApp({ vfs }: TerminalAppProps) {
  const [lines, setLines] = useState<Line[]>([
    { type: 'output', text: 'SenniNOS Terminal v1.0.0' },
    { type: 'output', text: '(c) SenniNOS. All rights reserved.\n' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const prompt = `C:${vfs.cwd.replace(/\//g, '\\')}> `;

  const directoryListing = (): string => {
    const items = vfs.listDir();
    if (items.length === 0) return '  ディレクトリは空です';
    const rows = items.map(item => {
      const typeStr = item.type === 'folder' ? '<DIR>      ' : formatSize(item.size).padStart(11);
      return `  ${item.modified || ''}    ${typeStr}  ${item.name}`;
    });
    const fileCount = items.filter(i => i.type === 'file').length;
    const dirCount = items.length - fileCount;
    return ` ${vfs.cwd} のディレクトリ\n${rows.join('\n')}\n               ${fileCount} 個のファイル    ${dirCount} 個のディレクトリ`;
  };

  const treeLines = (path: string, prefix: string): string => {
    const items = vfs.listDir(path);
    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      const line = `${prefix}${isLast ? '└── ' : '├── '}${item.name}`;
      if (item.type !== 'folder') return line;
      const children = treeLines(`${path === '/' ? '' : path}/${item.name}`, `${prefix}${isLast ? '    ' : '│   '}`);
      return children ? `${line}\n${children}` : line;
    }).join('\n');
  };

  const requireArg = (args: string[]): string => {
    if (!args[0]) throw new Error('構文が間違っています。');
    return args[0];
  };

  const commands: Record<string, (args: string[]) => string> = {
    help: () => HELP_TEXT,
    echo: args => args.join(' '),
    date: () => new Date().toLocaleString('ja-JP'),
    whoami: () => 'SENNINOS\\User',
    hostname: () => 'SENNINOS-PC',
    ver: () => 'SenniNOS [Version 1.0.0]',
    pwd: () => vfs.cwd,
    dir: () => directoryListing(),
    ls: () => directoryListing(),
    cd: args => {
      if (!args[0]) return vfs.cwd;
      if (vfs.cd(args[0]) === null) throw new Error(`指定されたパスが見つかりません: ${args[0]}`);
      return '';
    },
    mkdir: args => {
      vfs.mkdir(requireArg(args));
      return '';
    },
    touch: args => {
      const path = requireArg(args);
      if (!vfs.exists(path)) vfs.writeFile(path, '');
      return '';
    },
    rm: args => {
      vfs.rm(requireArg(args));
      return '';
    },
    del: args => {
      vfs.rm(requireArg(args));
      return '';
    },
    cat: args => {
      const path = requireArg(args);
      const content = vfs.readFile(path);
      if (content === null) throw new Error(`${path}: ファイルが見つかりません。`);
      return content;
    },
    type: args => {
      const path = requireArg(args);
      const content = vfs.readFile(path);
      if (content === null) throw new Error(`${path}: ファイルが見つかりません。`);
      return content;
    },
    tree: () => `${vfs.cwd}\n${treeLines(vfs.cwd, '')}`,
    systeminfo: () => `
ホスト名:           SENNINOS-PC
OS 名:              SenniNOS 1.0
システムの種類:      x64-based PC
プロセッサ:          Virtual Core × ${navigator.hardwareConcurrency || 4}
画面解像度:          ${window.innerWidth}x${window.innerHeight}
言語:                ${navigator.language}`,
    calc: args => {
      const expression = args.join('');
      if (!expression) throw new Error('計算式を指定してください (例: calc 2+3)');
      return formatCalc(evaluateExpression(expression));
    },
    color: () => 'テーマカラーは「設定」アプリで変更できます',
    tasklist: () => `
イメージ名                   PID    メモリ使用量
========================  ======  ============
senninos.exe                   4      12,544 K
explorer.exe                 892      45,312 K
terminal.exe                1204      18,976 K`,
    ipconfig: () => `
SenniNOS IP Configuration

   接続固有の DNS サフィックス: local
   IPv4 アドレス:              ブラウザ内で動作中（ネットワークなし）
   ネットワーク状態:           ${navigator.onLine ? '接続中' : 'オフライン'}`,
  };

  const handleSubmit = () => {
    const line = input.trim();
    if (!line) return;
    const [rawCommand = '', ...args] = line.split(/\s+/);
    const command = rawCommand.toLowerCase();
    setHistory(prev => [...prev, input]);
    setHistIndex(-1);
    setInput('');

    if (command === 'cls' || command === 'clear') {
      setLines([]);
      return;
    }

    const outputs: Line[] = [{ type: 'input', text: `${prompt}${input}` }];
    if (command === 'exit') {
      outputs.push({ type: 'output', text: 'このターミナルは閉じられません。ウィンドウを閉じてください。' });
    } else {
      const handler = commands[command];
      if (!handler) {
        outputs.push({ type: 'output', text: `'${rawCommand}' は、内部コマンドまたは外部コマンド、\n操作可能なプログラムまたはバッチ ファイルとして認識されていません。` });
      } else {
        try {
          const output = handler(args);
          if (output) outputs.push({ type: 'output', text: output });
        } catch (error) {
          outputs.push({ type: 'output', text: error instanceof Error ? error.message : '不明なエラーです' });
        }
      }
    }
    setLines(prev => [...prev, ...outputs]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (history.length === 0) return;
      const nextIndex = Math.min(histIndex + 1, history.length - 1);
      setHistIndex(nextIndex);
      setInput(history[history.length - 1 - nextIndex] ?? '');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = Math.max(histIndex - 1, -1);
      setHistIndex(nextIndex);
      setInput(nextIndex >= 0 ? history[history.length - 1 - nextIndex] : '');
    } else if (event.key === 'Tab') {
      event.preventDefault();
      const parts = input.split(/\s+/);
      const partial = parts[parts.length - 1] ?? '';
      if (!partial) return;
      const match = vfs.listDir().find(item => item.name.toLowerCase().startsWith(partial.toLowerCase()));
      if (match) {
        parts[parts.length - 1] = match.name;
        setInput(parts.join(' '));
      }
    }
  };

  return (
    <div
      className="h-full p-3 font-mono text-sm cursor-text overflow-auto"
      style={{ background: 'hsl(220 25% 4%)' }}
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line, i) => (
        <pre key={i} className={`whitespace-pre-wrap break-all ${line.type === 'input' ? 'text-foreground/70' : 'text-foreground/90'}`}>
          {line.text}
        </pre>
      ))}
      <div className="flex items-center">
        <span className="text-foreground/70 shrink-0 whitespace-pre">{prompt}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="コマンド入力"
          className="flex-1 min-w-0 bg-transparent outline-none text-foreground caret-foreground"
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
