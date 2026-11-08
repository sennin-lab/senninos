import { useState } from 'react';
import { Check, Download, Search, Star, Trash2 } from 'lucide-react';

interface StoreEntry {
  id: string;
  name: string;
  category: string;
  rating: number;
  size: string;
  description: string;
  available: boolean;
}

const catalog: StoreEntry[] = [
  { id: 'clock', name: '時計', category: 'ユーティリティ', rating: 4.0, size: '3 MB', description: '時計・タイマー・ストップウォッチ', available: true },
  { id: 'calendar', name: 'カレンダー', category: 'ビジネス', rating: 4.1, size: '6 MB', description: '月間カレンダーで日付を確認', available: true },
  { id: 'paint', name: 'ペイント', category: 'クリエイティブ', rating: 4.2, size: '8 MB', description: '絵を描いてピクチャに保存', available: true },
  { id: 'media-player', name: 'メディアプレーヤー', category: 'エンターテイメント', rating: 4.5, size: '12 MB', description: '音楽・動画を再生', available: false },
  { id: 'weather', name: '天気', category: 'ライフスタイル', rating: 4.3, size: '5 MB', description: '天気予報を確認', available: false },
  { id: 'code-editor', name: 'コードエディタ', category: '開発ツール', rating: 4.8, size: '45 MB', description: 'プログラミングエディタ', available: false },
  { id: 'chat', name: 'チャット', category: 'コミュニケーション', rating: 4.6, size: '20 MB', description: 'メッセージング', available: false },
];

interface AppStoreAppProps {
  installedApps: string[];
  onInstall: (appId: string) => void;
  onUninstall: (appId: string) => void;
}

export default function AppStoreApp({ installedApps, onInstall, onUninstall }: AppStoreAppProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(catalog.map(app => app.category))];
  const filtered = catalog.filter(app => {
    if (search && !app.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && app.category !== selectedCategory) return false;
    return true;
  });

  const categoryButton = (label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      key={label}
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-md transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col sm:flex-row h-full">
      <div className="sm:w-40 border-b sm:border-b-0 sm:border-r border-border p-3 text-xs flex sm:flex-col gap-1 overflow-x-auto shrink-0">
        <p className="font-medium text-foreground mb-2 hidden sm:block">カテゴリ</p>
        {categoryButton('すべて', !selectedCategory, () => setSelectedCategory(null))}
        {categories.map(cat => categoryButton(cat, selectedCategory === cat, () => setSelectedCategory(cat)))}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ストアを検索"
              aria-label="ストアを検索"
              className="w-full h-8 pl-8 pr-3 rounded-md bg-secondary text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(app => {
              const installed = installedApps.includes(app.id);
              return (
                <div key={app.id} className="flex gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary text-lg font-bold">{app.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{app.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{app.category} • {app.size}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star size={10} className="text-warning fill-warning" />
                      <span className="text-[10px] text-muted-foreground">{app.rating}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{app.description}</p>
                  </div>
                  <div className="self-center shrink-0">
                    {!app.available ? (
                      <span className="h-7 px-3 rounded-md text-[10px] font-medium flex items-center bg-muted text-muted-foreground">準備中</span>
                    ) : installed ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="h-7 px-3 rounded-md text-[10px] font-medium flex items-center gap-1 bg-success/20 text-success">
                          <Check size={12} />インストール済み
                        </span>
                        <button
                          type="button"
                          onClick={() => onUninstall(app.id)}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={11} />削除
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onInstall(app.id)}
                        className="h-7 px-3 rounded-md text-[10px] font-medium flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <Download size={12} />入手
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length === 0 && <p className="text-center text-xs text-muted-foreground mt-8">該当するアプリがありません</p>}
        </div>
      </div>
    </div>
  );
}
