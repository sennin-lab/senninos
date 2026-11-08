import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { wallpapers } from '@/components/os/apps/appearance';
import Taskbar from '@/components/os/Taskbar';
import Window from '@/components/os/Window';
import { appDefinitions, getAppDefinition } from '@/components/os/appRegistry';
import { useWindowManager } from '@/hooks/useWindowManager';
import { useVirtualFileSystem } from '@/hooks/useVirtualFileSystem';
import { useUserSettings } from '@/hooks/useUserSettings';
import TerminalApp from '@/components/os/apps/TerminalApp';
import NotepadApp from '@/components/os/apps/NotepadApp';
import FilesApp from '@/components/os/apps/FilesApp';
import CalculatorApp from '@/components/os/apps/CalculatorApp';
import BrowserApp from '@/components/os/apps/BrowserApp';
import SystemInfoApp from '@/components/os/apps/SystemInfoApp';
import SettingsApp from '@/components/os/apps/SettingsApp';
import AppStoreApp from '@/components/os/apps/AppStoreApp';
import WordApp from '@/components/os/apps/WordApp';
import ExcelApp from '@/components/os/apps/ExcelApp';
import PowerPointApp from '@/components/os/apps/PowerPointApp';
import ClockApp from '@/components/os/apps/ClockApp';
import CalendarApp from '@/components/os/apps/CalendarApp';
import PaintApp from '@/components/os/apps/PaintApp';
import ImageViewerApp from '@/components/os/apps/ImageViewerApp';
import CodeEditorApp from '@/components/os/apps/CodeEditorApp';
import DocumentViewerApp from '@/components/os/apps/DocumentViewerApp';
import MusicPlayerApp from '@/components/os/apps/MusicPlayerApp';
import { useEffect } from 'react';
import { useState } from 'react';

interface DesktopProps {
  onSignOut: () => Promise<void>;
  userName?: string;
  userId: string;
}

export default function Desktop({ onSignOut, userName, userId }: DesktopProps) {
  const { windows, openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updatePosition, updateSize } = useWindowManager();
  const vfs = useVirtualFileSystem(userId);
  const [activeFile, setActiveFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const { settings, ready: settingsReady, updateSettings } = useUserSettings(userId);

  const ready = vfs.ready && settingsReady;
  const visibleApps = appDefinitions.filter(app => app.placement !== 'store' || settings.installedApps.includes(app.id));
  const wallpaper = wallpapers.find(item => item.id === settings.wallpaperId)?.src ?? wallpapers[0].src;

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; }, [settings.theme]);

  const handleSignOut = () => {
    void onSignOut().catch(() => toast.error('サインアウトできませんでした'));
  };

  const handleOpenApp = (appId: string) => {
    const definition = getAppDefinition(appId);
    if (!definition) return;
    if (definition.placement === 'store' && !settings.installedApps.includes(appId)) {
      toast.error(`${definition.label} はストアからインストールしてください`);
      return;
    }
    openWindow(appId, definition.label, definition.size[0], definition.size[1]);
  };

  const handleOpenFile = (path: string, name: string) => {
    const content = vfs.readFile(path) ?? '';
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'avif'];
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'sh', 'yml', 'yaml', 'xml', 'md', 'sql'];
    if (imageExts.includes(ext)) {
      setActiveFile({ path, name, content });
      openWindow('imageviewer', `画像ビューアー - ${name}`, 850, 620);
    } else if (ext === 'sdoc') {
      setActiveFile({ path, name, content });
      openWindow('documentviewer', `Senni Document - ${name}`, 820, 680);
    } else if (codeExts.includes(ext)) {
      setActiveFile({ path, name, content });
      openWindow('codeeditor', `コードエディタ - ${name}`, 900, 650);
    } else {
      toast.message(`${name} は対応していないファイル形式です`);
    }
  };

  const installApp = (appId: string) => {
    if (settings.installedApps.includes(appId)) return;
    updateSettings({ installedApps: [...settings.installedApps, appId] });
    toast.success(`${getAppDefinition(appId)?.label ?? appId} をインストールしました`);
  };

  const uninstallApp = (appId: string) => {
    windows.filter(win => win.appId === appId).forEach(win => closeWindow(win.id));
    updateSettings({ installedApps: settings.installedApps.filter(id => id !== appId) });
  };

  const renderApp = (appId: string) => {
    switch (appId) {
      case 'terminal': return <TerminalApp vfs={vfs} />;
      case 'notepad': return <NotepadApp vfs={vfs} />;
      case 'files': return <FilesApp vfs={vfs} onOpenFile={handleOpenFile} />;
      case 'calculator': return <CalculatorApp />;
      case 'browser': return <BrowserApp />;
      case 'system': return <SystemInfoApp />;
      case 'settings': return (
        <SettingsApp
          wallpaperId={settings.wallpaperId}
          theme={settings.theme}
          onThemeChange={theme => updateSettings({ theme })}
          onWallpaperChange={id => updateSettings({ wallpaperId: id })}
          userName={userName}
          onSignOut={handleSignOut}
        />
      );
      case 'appstore': return (
        <AppStoreApp
          installedApps={settings.installedApps}
          onInstall={installApp}
          onUninstall={uninstallApp}
        />
      );
      case 'word': return <WordApp vfs={vfs} />;
      case 'excel': return <ExcelApp vfs={vfs} />;
      case 'powerpoint': return <PowerPointApp vfs={vfs} />;
      case 'clock': return <ClockApp />;
      case 'calendar': return <CalendarApp />;
      case 'paint': return <PaintApp vfs={vfs} />;
      case 'imageviewer': return activeFile ? <ImageViewerApp name={activeFile.name} content={activeFile.content} /> : null;
      case 'codeeditor': return activeFile ? <CodeEditorApp key={activeFile.path} name={activeFile.name} path={activeFile.path} content={activeFile.content} vfs={vfs} /> : null;
      case 'documentviewer': return activeFile ? <DocumentViewerApp name={activeFile.name} content={activeFile.content} /> : null;
      case 'music': return <MusicPlayerApp />;
      default: return null;
    }
  };

  if (!ready) {
    return (
      <div className="w-screen h-[100dvh] flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden senni-enter">
      <img
        src={wallpaper}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        width={1920}
        height={1080}
      />

      <AnimatePresence>
        {windows.map(win => (
          <Window
            key={win.id}
            window={win}
            onClose={closeWindow}
            onMinimize={minimizeWindow}
            onMaximize={maximizeWindow}
            onFocus={focusWindow}
            onMove={updatePosition}
            onResize={updateSize}
          >
            {renderApp(win.appId)}
          </Window>
        ))}
      </AnimatePresence>

      <Taskbar
        windows={windows}
        apps={visibleApps}
        onOpenApp={handleOpenApp}
        onFocusWindow={(id) => {
          const win = windows.find(w => w.id === id);
          if (win?.isMinimized) minimizeWindow(id);
          focusWindow(id);
        }}
        onMinimize={minimizeWindow}
        onSignOut={handleSignOut}
        userName={userName}
        theme={settings.theme}
        onThemeChange={theme => updateSettings({ theme })}
      />
    </div>
  );
}
