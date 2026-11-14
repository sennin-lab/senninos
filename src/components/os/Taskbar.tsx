import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Wifi, Volume2, Battery, ChevronUp, User, Power, Sun, Moon, Bluetooth, Plane, Settings2 } from 'lucide-react';
import SenniLogo from '@/components/os/SenniLogo';
import type { AppDefinition } from '@/components/os/appRegistry';
import type { WindowState } from '@/hooks/useWindowManager';

interface TaskbarProps {
  windows: WindowState[];
  apps: AppDefinition[];
  onOpenApp: (appId: string) => void;
  onFocusWindow: (id: string) => void;
  onMinimize: (id: string) => void;
  onSignOut: () => void;
  userName?: string;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

export default function Taskbar({ windows, apps, onOpenApp, onFocusWindow, onMinimize, onSignOut, userName, theme, onThemeChange }: TaskbarProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [controlOpen, setControlOpen] = useState(false);
  const [wifiOn, setWifiOn] = useState(true);
  const [bluetoothOn, setBluetoothOn] = useState(false);
  const [airplaneOn, setAirplaneOn] = useState(false);
  const [volume, setVolume] = useState(75);
  const changeVolume = (value: number) => { setVolume(value); window.dispatchEvent(new CustomEvent('senninos-volume-change', { detail: value / 100 })); };
  const [brightness, setBrightness] = useState(85);
  const [time, setTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const startRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (startRef.current?.contains(target) || startButtonRef.current?.contains(target) || (target as HTMLElement).closest?.('[data-control-panel]')) return;
      setStartOpen(false);
      setControlOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const timeStr = time.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });

  const query = searchQuery.trim().toLowerCase();
  const listed = query
    ? apps.filter(app => app.label.toLowerCase().includes(query))
    : apps.filter(app => showAll || app.placement === 'pinned');

  const openApp = (appId: string) => {
    onOpenApp(appId);
    setStartOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      <AnimatePresence>
        {startOpen && (
          <motion.div
            ref={startRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-12 left-1/2 -translate-x-1/2 w-[min(560px,calc(100vw-1rem))] max-h-[min(520px,calc(100dvh-80px))] flex flex-col rounded-lg overflow-hidden z-[10001]"
            style={{ background: 'hsl(var(--window-bg))', border: '1px solid hsl(var(--border))' }}
          >
            <div className="p-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="アプリを検索"
                  aria-label="アプリを検索"
                  className="w-full h-8 pl-9 pr-3 rounded-full bg-secondary text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="px-4 pb-2 overflow-auto flex-1 min-h-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-foreground">{query ? '検索結果' : showAll ? 'すべてのアプリ' : 'ピン留め済み'}</p>
                {!query && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5"
                  >
                    {showAll ? 'ピン留めを表示' : 'すべてのアプリ'} <ChevronUp size={10} className={showAll ? 'rotate-180' : 'rotate-90'} />
                  </button>
                )}
              </div>
              {listed.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">該当するアプリがありません</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                  {listed.map(app => {
                    const Icon = app.icon;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => openApp(app.id)}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-md hover:bg-secondary transition-colors min-w-0"
                      >
                        <span className="text-foreground"><Icon size={20} /></span>
                        <span className="text-[10px] text-foreground/80 truncate w-full text-center">{app.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User size={14} className="text-primary" />
                </div>
                <span className="text-xs text-foreground/80 truncate">{userName || 'User'}</span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                aria-label="サインアウト"
                className="flex items-center gap-1.5 text-xs text-foreground/60 hover:text-foreground transition-colors"
              >
                <Power size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {controlOpen && <motion.div data-control-panel initial={{opacity:0,y:18,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:14,scale:.97}} transition={{type:'spring',damping:24,stiffness:280}} className="fixed right-2 bottom-14 z-[10002] w-[min(340px,calc(100vw-1rem))] rounded-2xl border border-border p-4 shadow-2xl" style={{background:'hsl(var(--window-bg) / .96)',backdropFilter:'blur(28px)'}}>
          <div className="flex items-center justify-between mb-3"><div><p className="text-sm font-semibold text-foreground">コントロールパネル</p><p className="text-[10px] text-muted-foreground">クイック設定</p></div><button onClick={() => {setControlOpen(false);onOpenApp('settings');}} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground" aria-label="設定を開く"><Settings2 size={16}/></button></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setWifiOn(v=>!v)} className={`p-3 rounded-xl flex items-center gap-2 text-xs ${wifiOn?'bg-primary text-primary-foreground':'bg-secondary text-foreground'}`}><Wifi size={16}/>Wi-Fi <span className="ml-auto">{wifiOn?'オン':'オフ'}</span></button>
            <button onClick={() => setBluetoothOn(v=>!v)} className={`p-3 rounded-xl flex items-center gap-2 text-xs ${bluetoothOn?'bg-primary text-primary-foreground':'bg-secondary text-foreground'}`}><Bluetooth size={16}/>Bluetooth <span className="ml-auto">{bluetoothOn?'オン':'オフ'}</span></button>
            <button onClick={() => setAirplaneOn(v=>!v)} className={`p-3 rounded-xl flex items-center gap-2 text-xs ${airplaneOn?'bg-primary text-primary-foreground':'bg-secondary text-foreground'}`}><Plane size={16}/>機内モード <span className="ml-auto">{airplaneOn?'オン':'オフ'}</span></button>
            <button onClick={() => onThemeChange(theme==='dark'?'light':'dark')} className="p-3 rounded-xl bg-secondary text-foreground flex items-center gap-2 text-xs">{theme==='dark'?<Moon size={16}/>:<Sun size={16}/>} {theme==='dark'?'ダーク':'ライト'}モード</button>
          </div>
          <div className="mt-4 space-y-3"><div><div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span className="flex items-center gap-1"><Volume2 size={13}/>音量</span><span>{volume}%</span></div><input aria-label="音量" type="range" min="0" max="100" value={volume} onChange={e=>changeVolume(Number(e.target.value))} className="w-full accent-primary"/></div><div><div className="flex justify-between text-[11px] text-muted-foreground mb-1"><span className="flex items-center gap-1"><Sun size={13}/>明るさ</span><span>{brightness}%</span></div><input aria-label="明るさ" type="range" min="20" max="100" value={brightness} onChange={e=>setBrightness(Number(e.target.value))} className="w-full accent-primary"/></div></div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between"><div><p className="text-xs font-medium text-foreground">{timeStr}</p><p className="text-[10px] text-muted-foreground">{time.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'})}</p></div><button onClick={()=>{setControlOpen(false);onOpenApp('calendar');}} className="text-xs text-primary hover:underline">カレンダー</button></div>
        </motion.div>}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 h-11 ios-glass border-t border-border z-[10000] flex items-center px-2 pb-[env(safe-area-inset-bottom)]">
        <button
          ref={startButtonRef}
          type="button"
          aria-label="スタート"
          onClick={() => setStartOpen(!startOpen)}
          className={`p-1.5 rounded-md transition-colors ${startOpen ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
        >
          <SenniLogo className="w-5 h-5" />
        </button>

        <div className="ml-1 relative hidden sm:block">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="検索"
            aria-label="検索"
            className="h-7 w-48 pl-8 pr-2 rounded-full bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-secondary"
            onFocus={() => setStartOpen(true)}
          />
        </div>

        <div className="flex items-center gap-0.5 ml-2 flex-1 min-w-0 overflow-x-auto">
          {windows.map(win => (
            <button
              key={win.id}
              type="button"
              onClick={() => (win.isMinimized ? onFocusWindow(win.id) : onMinimize(win.id))}
              className={`flex items-center gap-1.5 px-3 h-8 rounded-md text-xs transition-colors max-w-[160px] shrink-0 ${
                !win.isMinimized ? 'bg-secondary text-foreground border-b-2 border-primary' : 'text-foreground/60 hover:bg-secondary/40'
              }`}
            >
              <span className="truncate">{win.title}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-foreground/60 text-xs ml-2 shrink-0">
          <ChevronUp size={12} className="hidden sm:block" />
          <Wifi size={14} className="hidden sm:block" />
          <Volume2 size={14} className="hidden sm:block" />
          <Battery size={14} className="hidden sm:block" />
          <button type="button" aria-label="コントロールパネルを開く" onClick={() => {setControlOpen(v=>!v);setStartOpen(false);}} className={`text-right leading-tight px-2 py-1 rounded-md hover:bg-secondary/70 ${controlOpen?'bg-secondary':''}`}>
            <div>{timeStr}</div>
            <div className="text-[10px]">{dateStr}</div>
          </button>
        </div>
      </div>
    </>
  );
}
