import { useState, useCallback } from 'react';

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
}

let nextZIndex = 100;

export function useWindowManager() {
  const [windows, setWindows] = useState<WindowState[]>([]);

  const focusWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, zIndex: ++nextZIndex } : w)));
  }, []);

  const openWindow = useCallback((appId: string, title: string, width = 640, height = 480) => {
    setWindows(prev => {
      const existing = prev.find(w => w.appId === appId);
      if (existing) {
        nextZIndex += 1;
        return prev.map(w => (w.id === existing.id ? { ...w, title, width, height, isMinimized: false, zIndex: nextZIndex } : w));
      }
      const offset = (prev.length % 8) * 30;
      nextZIndex += 1;
      const newWindow: WindowState = {
        id: `${appId}-${Date.now()}`,
        appId,
        title,
        x: 120 + offset,
        y: 60 + offset,
        width,
        height,
        isMinimized: false,
        isMaximized: false,
        zIndex: nextZIndex,
      };
      return [...prev, newWindow];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized, zIndex: ++nextZIndex } : w)));
  }, []);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized, zIndex: ++nextZIndex } : w)));
  }, []);

  const updatePosition = useCallback((id: string, x: number, y: number) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, x, y } : w)));
  }, []);

  const updateSize = useCallback((id: string, width: number, height: number) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, width, height } : w)));
  }, []);

  return { windows, openWindow, closeWindow, minimizeWindow, maximizeWindow, focusWindow, updatePosition, updateSize };
}
