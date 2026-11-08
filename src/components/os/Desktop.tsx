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

interface DesktopProps {
  onSignOut: () => Promise<void>;
  userName?: string;
  userId: string;
}

export default function Desktop({ onSignOut, userName, userId }: DesktopProps) {
  const { windows, openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updatePosition, updateSize } = useWindowManager();
  const vfs = useVirtualFileSystem(userId);
  const { settings, ready: settingsReady, updateSettings } = useUserSettings(userId);

  const ready = vfs.ready && settingsReady;
  const visibleApps = appDefinitions.filter(app => app.placement !== 'store' || settings.installedApps.includes(app.id));
  const wallpaper = wallpapers.find(item => item.id === settings.wallpaperId)?.src ?? wallpapers[0].src;

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
      case 'files': return <FilesApp vfs={vfs} />;
      case 'calculator': return <CalculatorApp />;
      case 'browser': return <BrowserApp />;
      case 'system': return <SystemInfoApp />;
      case 'settings': return (
        <SettingsApp
          wallpaperId={settings.wallpaperId}
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
    <div className="relative w-screen h-[100dvh] overflow-hidden">
      <img
        src={wallpaper}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
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
      />
    </div>
  );
}
