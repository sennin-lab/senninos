import { useCallback, useState } from 'react';

/** ファイルを開いたウィンドウが持つファイル情報（ウィンドウごとに独立） */
export interface WindowPayload {
  path: string;
  name: string;
  content: string;
}

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  payload?: WindowPayload;
}

let nextZIndex = 100;
let windowSeq = 0;

const topZIndex = (windows: WindowState[]) => windows.reduce((max, win) => Math.max(max, win.zIndex), 0);

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);

  // すでに最前面なら状態を変えない（クリックのたびの無駄な再描画を防ぐ）
  const focusWindow = useCallback((id: string) => {
    setWindows(prev => {
      const target = prev.find(win => win.id === id);
      if (!target || target.zIndex === topZIndex(prev)) return prev;
      nextZIndex += 1;
      return prev.map(win => (win.id === id ? { ...win, zIndex: nextZIndex } : win));
    });
  }, []);

  /**
   * アプリを開きます。ファイルを渡した場合は、そのファイル用のウィンドウを開く（同じファイルなら既存を前面へ）。
   * ファイルなしのアプリは 1 つだけ開き、2 回目以降は既存のウィンドウを前面に出します。
   */
  const openWindow = useCallback((
    appId: string,
    title: string,
    width = 640,
    height = 480,
    payload?: WindowPayload,
  ) => {
    setWindows(prev => {
      const existing = payload
        ? prev.find(win => win.appId === appId && win.payload?.path === payload.path)
        : prev.find(win => win.appId === appId && !win.payload);
      nextZIndex += 1;
      if (existing) {
        return prev.map(win => (win.id === existing.id
          ? { ...win, title, width: payload ? win.width : width, height: payload ? win.height : height, isMinimized: false, zIndex: nextZIndex }
          : win));
      }
      const offset = (prev.length % 8) * 30;
      const newWindow: WindowState = {
        id: `${appId}-${++windowSeq}`,
        appId,
        title,
        x: Math.max(8, Math.min(120 + offset, window.innerWidth - width - 8)),
        y: Math.max(8, Math.min(60 + offset, window.innerHeight - height - 56)),
        width,
        height,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndex,
        payload,
      };
      return [...prev, newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(win => win.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(win => (win.id === id ? { ...win, isMinimized: !win.isMinimized, zIndex: ++nextZIndex } : win)));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(win => (win.id === id ? { ...win, isMaximized: !win.isMaximized, zIndex: ++nextZIndex } : win)));
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(win => (win.id === id ? { ...win, x, y } : win)));
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number) => {
    setWindows(prev => prev.map(win => (win.id === id ? { ...win, width, height } : win)));
  }, []);

  return { windows, openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updatePosition, updateSize };
}
