import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { toast } from 'sonner';
import { wallpapers } from '@/components/os/apps/appearance';
import Taskbar from '@/components/os/Taskbar';
import Window from '@/components/os/Window';
import { appDefinitions, getAppDefinition } from '@/components/os/appRegistry';
import { useWindowManager, type WindowPayload, type WindowState } from '@/hooks/useWindowManager';
import { useVirtualFileSystem } from '@/hooks/useVirtualFileSystem';
import { useUserSettings } from '@/hooks/useUserSettings';
import { resolveFileOpener } from '@/lib/fileAssociations';
import type { AccountSyncer } from '@/lib/cloudData';
import type { FSNode } from '@/lib/fs';
import type { UserSettings } from '@/lib/userData';
import FilesApp from '@/components/os/apps/FilesApp';
import NotepadApp from '@/components/os/apps/NotepadApp';

// 使用頻度の低い重いアプリは、開いたときに初めて読み込みます（起動と操作の初動を軽くする）
const TerminalApp = lazy(() => import('@/components/os/apps/TerminalApp'));
const CalculatorApp = lazy(() => import('@/components/os/apps/CalculatorApp'));
const BrowserApp = lazy(() => import('@/components/os/apps/BrowserApp'));
const SystemInfoApp = lazy(() => import('@/components/os/apps/SystemInfoApp'));
const SettingsApp = lazy(() => import('@/components/os/apps/SettingsApp'));
const AppStoreApp = lazy(() => import('@/components/os/apps/AppStoreApp'));
const WordApp = lazy(() => import('@/components/os/apps/WordApp'));
const ExcelApp = lazy(() => import('@/components/os/apps/ExcelApp'));
const PowerPointApp = lazy(() => import('@/components/os/apps/PowerPointApp'));
const ClockApp = lazy(() => import('@/components/os/apps/ClockApp'));
const CalendarApp = lazy(() => import('@/components/os/apps/CalendarApp'));
const PaintApp = lazy(() => import('@/components/os/apps/PaintApp'));
const ImageViewerApp = lazy(() => import('@/components/os/apps/ImageViewerApp'));
const CodeEditorApp = lazy(() => import('@/components/os/apps/CodeEditorApp'));
const DocumentViewerApp = lazy(() => import('@/components/os/apps/DocumentViewerApp'));
const MusicPlayerApp = lazy(() => import('@/components/os/apps/MusicPlayerApp'));

interface DesktopProps {
  userName?: string;
  initialFs: FSNode;
  initialSettings: UserSettings;
  syncer: AccountSyncer;
  onSignOut: () => Promise<void>;
}

function AppLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function Desktop({ userName, initialFs, initialSettings, syncer, onSignOut }: DesktopProps) {
  const { windows, openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updatePosition, updateSize } = useWindowManager();
  const vfs = useVirtualFileSystem({ initialRoot: initialFs, onChange: syncer.queueFileSystem });
  const { settings, updateSettings } = useUserSettings({ initialSettings, onChange: syncer.queueSettings });

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

  // エクスプローラーでファイルを開く。拡張子に応じたアプリを、そのファイル専用のウィンドウで開きます。
  const handleOpenFile = (path: string, name: string) => {
    const opener = resolveFileOpener(name);
    if (!opener) {
      toast.message(`${name} はこのデスクトップでは開けません`);
      return;
    }
    const payload: WindowPayload = { path, name, content: vfs.readFile(path) ?? '' };
    openWindow(opener.appId, `${opener.label} - ${name}`, opener.size[0], opener.size[1], payload);
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

  const renderApp = (win: WindowState) => {
    const file = win.payload;
    switch (win.appId) {
      case 'terminal': return <TerminalApp vfs={vfs} />;
      case 'notepad': return <NotepadApp vfs={vfs} file={file} />;
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
      case 'imageviewer': return file ? <ImageViewerApp name={file.name} content={file.content} /> : null;
      case 'codeeditor': return file ? <CodeEditorApp key={win.id} name={file.name} path={file.path} content={file.content} vfs={vfs} /> : null;
      case 'documentviewer': return file ? <DocumentViewerApp name={file.name} content={file.content} /> : null;
      case 'music': return <MusicPlayerApp />;
      default: return null;
    }
  };

  return (
    // OS の「視差を減らす」設定に合わせて、Framer Motion のアニメーションも自動で控えめにします
    <MotionConfig reducedMotion="user">
      <div className="relative w-screen h-[100dvh] overflow-hidden senni-enter">
        <img
          src={wallpaper}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 pointer-events-none"
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
              <Suspense fallback={<AppLoading />}>{renderApp(win)}</Suspense>
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
    </MotionConfig>
  );
}
