import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Code as Code2, SlidersHorizontal, Sun, Volume2, VolumeX } from 'lucide-react';
import { Window } from './Window';
import { Notepad } from './Notepad';
import { CodeEditor } from './CodeEditor';
import { ControlPanel } from './ControlPanel';
import type { AppId, AppWindow, DesktopSettings } from './types';
import './App.css';

interface AppDef {
  id: AppId;
  name: string;
  icon: typeof FileText;
  color: string;
  defaultSize: { width: number; height: number };
}

const APPS: Record<AppId, AppDef> = {
  notepad: { id: 'notepad', name: 'メモ帳', icon: FileText, color: '#2563eb', defaultSize: { width: 560, height: 420 } },
  codeeditor: { id: 'codeeditor', name: 'コードエディタ', icon: Code2, color: '#7c3aed', defaultSize: { width: 680, height: 480 } },
  controlpanel: { id: 'controlpanel', name: 'コントロールパネル', icon: SlidersHorizontal, color: '#0891b2', defaultSize: { width: 460, height: 520 } },
};

const APP_ORDER: AppId[] = ['notepad', 'codeeditor', 'controlpanel'];

function App() {
  const [windows, setWindows] = useState<AppWindow[]>([]);

  const [startOpen, setStartOpen] = useState(false);
  const [settings, setSettings] = useState<DesktopSettings>({
    brightness: 80,
    volume: 50,
    volumeMuted: false,
  });
  const [now, setNow] = useState(new Date());
  const [bootAnim, setBootAnim] = useState(true);
  const zCounterRef = useRef(100);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setBootAnim(false), 1200);
    return () => clearTimeout(t);
  }, []);

  const openApp = useCallback((appId: AppId) => {
    setStartOpen(false);
    setWindows((prev) => {
      const existing = prev.find((w) => w.appId === appId);
      if (existing) {
        const z = zCounterRef.current + 1;
        zCounterRef.current = z;
        return prev.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, zIndex: z } : w
        );
      }
      const def = APPS[appId];
      const z = zCounterRef.current + 1;
      zCounterRef.current = z;
      const win: AppWindow = {
        id: `${appId}-${Date.now()}`,
        appId,
        title: def.name,
        x: 80 + prev.length * 30,
        y: 60 + prev.length * 28,
        width: def.defaultSize.width,
        height: def.defaultSize.height,
        zIndex: z,
        minimized: false,
        maximized: false,
      };
      return [...prev, win];
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    const z = zCounterRef.current + 1;
    zCounterRef.current = z;
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, zIndex: z, minimized: false } : w)));
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const toggleMax = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized && w.prevRect) {
          return { ...w, maximized: false, ...w.prevRect, prevRect: undefined };
        }
        return {
          ...w,
          maximized: true,
          prevRect: { x: w.x, y: w.y, width: w.width, height: w.height },
          x: 0,
          y: 0,
          width: window.innerWidth,
          height: window.innerHeight - 56,
        };
      })
    );
  }, []);

  const updatePos = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, width, height, x, y } : w)));
  }, []);

  const renderAppContent = (win: AppWindow) => {
    switch (win.appId) {
      case 'notepad':
        return <Notepad windowId={win.id} />;
      case 'codeeditor':
        return <CodeEditor />;
      case 'controlpanel':
        return <ControlPanel settings={settings} onChange={setSettings} />;
    }
  };

  const brightnessOpacity = (100 - settings.brightness) / 100 * 0.6;

  return (
    <div className="desktop" onClick={() => setStartOpen(false)}>
      {/* Boot animation */}
      {bootAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100001,
          background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'bootFade 1.2s ease forwards',
        }}>
          <div style={{ textAlign: 'center', animation: 'bootLogo 1s ease' }}>
            <Monitor2Icon />
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginTop: 16 }}>
              Desktop OS
            </div>
          </div>
        </div>
      )}

      {/* Brightness overlay */}
      <div className="brightness-overlay" style={{ opacity: brightnessOpacity }} />

      {/* Desktop icons */}
      <div className="desktop-icons">
        {APP_ORDER.map((appId) => {
          const def = APPS[appId];
          const Icon = def.icon;
          return (
            <div key={appId} className="desktop-icon" onDoubleClick={() => openApp(appId)} onClick={(e) => e.stopPropagation()}>
              <div className="icon-img" style={{ background: def.color }}>
                <Icon size={22} />
              </div>
              <span className="icon-label">{def.name}</span>
            </div>
          );
        })}
      </div>

      {/* Windows */}
      {windows.map((win) => (
        <Window
          key={win.id}
          win={win}
          focused={win.zIndex === Math.max(...windows.map((w) => w.zIndex))}
          onFocus={() => focusWindow(win.id)}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onToggleMax={() => toggleMax(win.id)}
          onDragStop={(x, y) => updatePos(win.id, x, y)}
          onResizeStop={(w, h, x, y) => updateSize(win.id, w, h, x, y)}
        >
          {renderAppContent(win)}
        </Window>
      ))}

      {/* Start menu */}
      {startOpen && (
        <>
          <div className="backdrop" onClick={() => setStartOpen(false)} />
          <div className="start-menu" onClick={(e) => e.stopPropagation()}>
            <div className="start-menu-title">すべてのアプリ</div>
            <div className="start-menu-grid">
              {APP_ORDER.map((appId) => {
                const def = APPS[appId];
                const Icon = def.icon;
                return (
                  <div key={appId} className="start-menu-item" onClick={() => openApp(appId)}>
                    <div className="item-icon" style={{ background: def.color }}>
                      <Icon size={20} />
                    </div>
                    <span className="item-label">{def.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Taskbar */}
      <div className="taskbar" onClick={(e) => e.stopPropagation()}>
        <button className="start-btn" onClick={() => setStartOpen(!startOpen)}>
          <Monitor2Icon size={20} color="#3b82f6" />
          <span>スタート</span>
        </button>
        <div className="taskbar-apps">
          {windows.map((win) => {
            const def = APPS[win.appId];
            const Icon = def.icon;
            const topZ = Math.max(...windows.map((w) => w.zIndex));
            return (
              <button
                key={win.id}
                className={`taskbar-app ${win.zIndex === topZ && !win.minimized ? 'active' : ''}`}
                onClick={() => {
                  if (win.minimized || win.zIndex !== Math.max(...windows.map((w) => w.zIndex))) {
                    focusWindow(win.id);
                  } else {
                    minimizeWindow(win.id);
                  }
                }}
              >
                <Icon size={16} />
                <span>{win.title}</span>
                <span className="indicator" />
              </button>
            );
          })}
        </div>
        {/* Tray */}
        <div className="tray">
          <button className="tray-btn" onClick={() => openApp('controlpanel')} title="コントロールパネル">
            <Sun size={16} />
          </button>
          <button className="tray-btn" onClick={() => openApp('controlpanel')} title="音量">
            {settings.volumeMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="tray-time">
            {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            <br />
            {now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Monitor2Icon({ size = 24, color = '#3b82f6' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

export default App;
