import { useState, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink, Globe, Lock, RotateCw } from 'lucide-react';

const QUICK_LINKS = [
  { label: 'Wikipedia', url: 'https://ja.wikipedia.org' },
  { label: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
  { label: 'Example', url: 'https://example.com' },
];

function normalizeBrowserInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[^\s/]+\.[^\s]+$/.test(trimmed)) return `https://${trimmed}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

export default function BrowserApp() {
  const [history, setHistory] = useState<string[]>(['']);
  const [index, setIndex] = useState(0);
  const [address, setAddress] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const current = history[index] ?? '';

  const navigate = (value: string) => {
    const url = normalizeBrowserInput(value);
    if (!url) return;
    const next = [...history.slice(0, index + 1), url];
    setHistory(next);
    setIndex(next.length - 1);
    setAddress(url);
  };

  const goBack = () => {
    if (index === 0) return;
    setIndex(index - 1);
    setAddress(history[index - 1]);
  };

  const goForward = () => {
    if (index >= history.length - 1) return;
    setIndex(index + 1);
    setAddress(history[index + 1]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') navigate(address);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button type="button" aria-label="戻る" onClick={goBack} disabled={index === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowLeft size={14} /></button>
        <button type="button" aria-label="進む" onClick={goForward} disabled={index >= history.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowRight size={14} /></button>
        <button type="button" aria-label="再読み込み" onClick={() => setReloadKey(key => key + 1)} disabled={!current} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><RotateCw size={14} /></button>
        <div className="flex-1 flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5 text-xs min-w-0">
          <Lock size={10} className="text-success shrink-0" />
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="URL または検索語を入力"
            aria-label="アドレス"
            className="flex-1 min-w-0 bg-transparent outline-none text-foreground"
          />
        </div>
        {current && (
          <a href={current} target="_blank" rel="noopener noreferrer" aria-label="新しいタブで開く" className="text-muted-foreground hover:text-foreground">
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {current ? (
        <div className="flex-1 flex flex-col min-h-0">
          <iframe
            key={`${current}-${reloadKey}`}
            src={current}
            title="ブラウザの表示内容"
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className="flex-1 w-full bg-white"
          />
          <p className="px-3 py-1 text-[10px] text-muted-foreground border-t border-border">
            埋め込みを許可していないサイトは表示されません。その場合は右上の「新しいタブで開く」を使ってください。
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-6">
          <div className="text-center space-y-4">
            <Globe size={48} className="mx-auto text-primary/40" />
            <p className="text-sm">SenniNOS ブラウザ</p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_LINKS.map(link => (
                <button
                  key={link.url}
                  type="button"
                  onClick={() => { setAddress(link.url); navigate(link.url); }}
                  className="px-3 py-1.5 rounded-md bg-secondary text-xs text-foreground hover:bg-secondary/80"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
